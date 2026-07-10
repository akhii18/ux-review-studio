import path from "node:path";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import OpenAI, { AzureOpenAI } from "openai";
import { prisma } from "../../config/prisma";
import { config } from "../../config";
import { getSignedStorageReadUrl } from "../supabaseStorage";
import { captureFigmaPrototype, persistCapturedFigmaScreens } from "../figmaCapture.service";
import { captureWebsiteReference, persistCapturedWebsiteScreens } from "../websiteCapture.service";

// ── Subcategory → Agent mapping (mirrors principles.ts SUBCATEGORY_TO_AGENT_MAP)
// Duplicated here to avoid a build-time dependency on the agentic-ai package.
const SUBCATEGORY_TO_AGENT_MAP: Record<string, string> = {
  // Usability
  nielsensHeuristics:         "usability",
  navigationLogic:            "usability",
  taskFlowEfficiency:         "usability",
  recognitionOverRecall:      "usability",
  // Accessibility
  wcagConformance:            "accessibility",
  keyboardNavigation:         "accessibility",
  screenReaderInterpretation: "accessibility",
  touchTargets:               "accessibility",
  // Consistency
  designSystemTokens:         "cognitiveInteraction",
  componentUsage:             "cognitiveInteraction",
  spacingGrid:                "cognitiveInteraction",
  iconographyConsistency:     "cognitiveInteraction",
  // Content UX
  microcopyClarity:           "contentMicrocopy",
  errorMessageQuality:        "contentMicrocopy",
  labelPrecision:             "contentMicrocopy",
  toneAndVoice:               "contentMicrocopy",
  // Risk
  section508Compliance:       "gestalt",
  domainRegulation:           "gestalt",
  destructiveActionSafety:    "gestalt",
  dataPrivacyDisclosures:     "gestalt",
  // Recommendations
  businessImpactEstimate:     "visualDesign",
  effortEstimate:             "visualDesign",
  acceptanceCriteria:         "visualDesign",
  linkedPrinciple:            "visualDesign",
};

/**
 * Given the criteria array from the review record (which contains subcategory IDs
 * like "effortEstimate", "navigationLogic"), derive:
 * 1. The unique set of backend agent names that need to run
 * 2. A selectedPrinciples map { subcategoryId: true } for dynamic prompt injection
 */
function deriveAgentSelection(criteria: string[]): {
  selectedAgents: string[];
  selectedPrinciples: Record<string, true>;
} {
  const agentSet = new Set<string>();
  const selectedPrinciples: Record<string, true> = {};

  for (const criterion of criteria) {
    const agent = SUBCATEGORY_TO_AGENT_MAP[criterion];
    if (agent) {
      agentSet.add(agent);
      selectedPrinciples[criterion] = true;
    }
  }

  return {
    selectedAgents: Array.from(agentSet),
    selectedPrinciples,
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

type SynthesizedFinding = {
  id: string;
  region: string;
  elementRefs: string[];
  bboxRefs?: Array<{
    screenIndex: number;
    bbox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  issue: string;
  principle: string;
  why: string;
  severity: "P0" | "P1" | "P2";
  fix: string;
  confidence: number;
  sources: string[];
  mergedFrom: string[];
  agreementCount: number;
  acceptanceCriteria?: string[];
  requirementTraceability?: string | null;
  wcagCriteria?: string | null;
  businessImpact?: string | null;
  a11yImpact?: string | null;
};

type GroundingElement = {
  elementId: string;
  screenIndex: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

type AgenticRunResult = {
  groundingOutput?: {
    elements: GroundingElement[];
  } | null;
  flowDiscoveryOutput?: FlowDiscoveryOutput | null;
  synthesisOutput?: {
    findings: SynthesizedFinding[];
    totalRawFindings: number;
    deduplicationNote: string;
  } | null;
};

type ReviewRecord = Awaited<ReturnType<typeof prisma.review.findUnique>>;

type ReviewAssetRecord = {
  name: string;
  mimeType: string;
  blobUrl: string | null;
  contentText: string | null;
};

type DocumentPageMetadata = {
  pageNumber: number;
  assetName: string;
};

type DiscoveredFlow = {
  flowName: string;
  description: string;
  pageNumbers: number[];
};

type FlowDiscoveryOutput = {
  flows: DiscoveredFlow[];
  routingRationale: string;
};

type PipelineLogLevel = "info" | "warn" | "error";

type PipelineRunMode = "fresh" | "rerun_dedupe";

type RunReviewPipelineOptions = {
  mode?: PipelineRunMode;
};

type PersistableBBoxRef = {
  screenIndex: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export interface PersistableFindingCandidate {
  title: string;
  description: string;
  recommendation: string;
  severity: "P0" | "P1" | "P2";
  area: "USABILITY" | "ACCESSIBILITY" | "CONSISTENCY" | "CONTENT_UX" | "RISK" | "RECOMMENDATIONS";
  screen: string;
  principle: string;
  observation: string;
  why: string;
  businessImpact?: string;
  a11yImpact?: string;
  aiMetadata?: Record<string, string | string[] | number[]>;
  confidence: number;
  bboxRefs: PersistableBBoxRef[];
  reviewBasisName: string;
  reviewBasisExplanation: string;
}

interface ExistingFindingForDedup {
  id: string;
  observation: string | null;
  title: string;
  description: string;
  recommendation: string;
  severity: "P0" | "P1" | "P2";
  area: "USABILITY" | "ACCESSIBILITY" | "CONSISTENCY" | "CONTENT_UX" | "RISK" | "RECOMMENDATIONS";
  screen: string | null;
  principle: string | null;
  why: string | null;
  businessImpact: string | null;
  a11yImpact: string | null;
  aiMetadata: unknown;
  confidence: number;
  bboxRefs: unknown;
}

interface ObservationSimilarityDecision {
  isDuplicate: boolean;
  reason: string;
}

function summarizeError(error: unknown): {
  name: string;
  message: string;
  stack?: string;
  details?: Record<string, unknown>;
} {
  if (error instanceof Error) {
    const details = error as Error & { cause?: unknown; code?: string; status?: number };
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      details: {
        ...(details.code ? { code: details.code } : {}),
        ...(typeof details.status === "number" ? { status: details.status } : {}),
        ...(details.cause ? { cause: details.cause } : {}),
      },
    };
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : JSON.stringify(error),
  };
}

function logPipeline(level: PipelineLogLevel, reviewId: string, event: string, details?: Record<string, unknown>) {
  const payload = {
    reviewId,
    event,
    timestamp: new Date().toISOString(),
    ...(details ?? {}),
  };

  if (level === "error") {
    console.error("[AI_PIPELINE]", payload);
    return;
  }

  if (level === "warn") {
    console.warn("[AI_PIPELINE]", payload);
    return;
  }

  console.log("[AI_PIPELINE]", payload);
}

const FINDING_SIMILARITY_PROMPT_TEMPLATE = [
  "You are deduplicating UX findings from two runs of the same review.",
  "Determine whether OLD and NEW describe the exact same issue.",
  "Rules:",
  "1) Return duplicate=true only when the core problem is materially the same.",
  "2) Different root cause, user impact, or recommended fix means duplicate=false.",
  "3) Ignore wording differences; focus on issue semantics.",
  "Return strict JSON: {\"isDuplicate\": boolean, \"reason\": string}.",
].join("\n");

function resolveAzureConfig(endpoint: string): { mode: "classic" | "v1"; baseUrl: string } {
  const trimmed = endpoint.replace(/\/+$/, "");
  if (/\/openai\/v1$/i.test(trimmed)) return { mode: "v1", baseUrl: trimmed };
  const resourceUrl = trimmed.replace(/\/openai\/?$/i, "");
  return { mode: "classic", baseUrl: resourceUrl };
}

let dedupeClient: OpenAI | null | undefined;
let dedupeModelName: string | undefined;

function getDedupeClient(): { client: OpenAI; model: string } | null {
  if (dedupeClient === undefined) {
    if (!config.azureOpenAiEndpoint || !config.azureOpenAiKey) {
      dedupeClient = null;
    } else {
      const deployment = process.env.AZURE_OPENAI_MODEL ?? process.env.AZURE_OPENAI_DEPLOYMENT ?? "DeepSeek-V4-Pro";
      const { mode, baseUrl } = resolveAzureConfig(config.azureOpenAiEndpoint);
      dedupeClient = mode === "v1"
        ? new OpenAI({
            apiKey: config.azureOpenAiKey,
            baseURL: baseUrl,
            defaultHeaders: { "api-key": config.azureOpenAiKey },
          })
        : new AzureOpenAI({
            apiKey: config.azureOpenAiKey,
            endpoint: baseUrl,
            deployment,
            apiVersion: config.azureOpenAiApiVersion,
          });
      dedupeModelName = deployment;
    }
  }

  if (!dedupeClient || !dedupeModelName) return null;
  return { client: dedupeClient, model: dedupeModelName };
}

function safeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

async function classifyObservationSimilarity(params: {
  reviewId: string;
  oldFinding: ExistingFindingForDedup;
  newFinding: PersistableFindingCandidate;
}): Promise<ObservationSimilarityDecision> {
  const oldObservation = safeText(params.oldFinding.observation) || safeText(params.oldFinding.description) || safeText(params.oldFinding.title);
  const newObservation = safeText(params.newFinding.observation) || safeText(params.newFinding.description) || safeText(params.newFinding.title);

  const llm = getDedupeClient();
  if (!llm) {
    logPipeline("warn", params.reviewId, "dedupe_llm_unavailable", {
      oldFindingId: params.oldFinding.id,
      newFindingTitle: params.newFinding.title.slice(0, 120),
    });
    return { isDuplicate: false, reason: "LLM unavailable" };
  }

  const completion = await llm.client.chat.completions.create({
    model: llm.model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: FINDING_SIMILARITY_PROMPT_TEMPLATE },
      {
        role: "user",
        content: JSON.stringify({
          oldFinding: {
            observation: oldObservation,
            title: params.oldFinding.title,
            recommendation: params.oldFinding.recommendation,
            why: params.oldFinding.why,
          },
          newFinding: {
            observation: newObservation,
            title: params.newFinding.title,
            recommendation: params.newFinding.recommendation,
            why: params.newFinding.why,
          },
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
  const parsed = JSON.parse(raw) as Partial<ObservationSimilarityDecision>;
  return {
    isDuplicate: parsed.isDuplicate === true,
    reason: typeof parsed.reason === "string" ? parsed.reason : "No reason provided",
  };
}

// ── Module loader ─────────────────────────────────────────────────────────────

const agenticSourceCandidates = [
  path.resolve(__dirname, "../../../../agentic-ai/src/index.ts"),
  path.resolve(__dirname, "../../../../../agentic-ai/src/index.ts"),
  path.resolve(process.cwd(), "apps/agentic-ai/src/index.ts"),
  path.resolve(process.cwd(), "agentic-ai/src/index.ts"),
];

const agenticBuildCandidates = [
  path.resolve(__dirname, "../../../../agentic-ai/dist/index.js"),
  path.resolve(__dirname, "../../../../../agentic-ai/dist/index.js"),
  path.resolve(process.cwd(), "apps/agentic-ai/dist/index.js"),
  path.resolve(process.cwd(), "agentic-ai/dist/index.js"),
  path.resolve(process.cwd(), "apps/api/agentic-ai/dist/index.js"),
];

function resolveExistingPath(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

let agenticModulePromise: Promise<{ runReviewGraph: (params: {
  screenshots: string[];
  context: string;
  reviewDepth?: string | null;
  selectedAgents?: string[];
  selectedPrinciples?: unknown;
  findingMetadataOptions?: string[] | null;
  keyFlowsOnly?: boolean;
  documentPages?: DocumentPageMetadata[];
}) => Promise<AgenticRunResult>; refineSingleFinding: (params: {
  originalFinding: {
    title: string;
    description: string | null;
    observation: string | null;
    severity: string;
    area: string;
    screen: string | null;
    principle: string | null;
    why: string | null;
    recommendation: string | null;
    businessImpact: string | null;
    a11yImpact: string | null;
    confidence: number;
  };
  userComments: string[];
  screenshot: string | null;
  reviewContext: string;
  reviewDepth: string;
}) => Promise<{
  issue: string;
  fix: string;
  severity: "P0" | "P1" | "P2";
  why: string;
  confidence: number;
  businessImpact: string | null;
  a11yImpact: string | null;
  acceptanceCriteria: string[];
  refinementNote: string;
}> }> | null = null;

async function loadAgenticModule() {
  if (!agenticModulePromise) {
    const resolvedPath = process.env.NODE_ENV === "production"
      ? resolveExistingPath(agenticBuildCandidates)
      : resolveExistingPath(agenticSourceCandidates) ?? resolveExistingPath(agenticBuildCandidates);

    if (!resolvedPath) {
      const tried = process.env.NODE_ENV === "production" ? agenticBuildCandidates : [...agenticSourceCandidates, ...agenticBuildCandidates];
      throw new Error(`Unable to locate agentic-ai module. Tried: ${tried.join(" | ")}`);
    }

    agenticModulePromise = import(
      pathToFileURL(resolvedPath).href
    );
  }

  return agenticModulePromise;
}

async function toModelScreenshotDataUrl(asset: ReviewAssetRecord): Promise<string> {
  if (!asset.blobUrl) {
    throw new Error(`Asset ${asset.name} is missing a blobUrl`);
  }

  const signedOrRawUrl = await getSignedStorageReadUrl(asset.blobUrl);
  if (/^data:/i.test(signedOrRawUrl)) {
    return signedOrRawUrl;
  }

  const response = await fetch(signedOrRawUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image bytes for ${asset.name} (HTTP ${response.status})`);
  }

  const mimeType = response.headers.get("content-type")?.split(";")[0] ?? asset.mimeType ?? "image/png";
  const bytes = Buffer.from(await response.arrayBuffer());
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clampConfidence(confidence: number): number {
  if (Number.isNaN(confidence)) return 80;
  return Math.min(100, Math.max(0, Math.round(confidence * 100)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizePersistableBBoxRef(ref: unknown) {
  if (!isRecord(ref) || !isRecord(ref.bbox)) return null;

  const screenIndex = Number(ref.screenIndex);
  const x = Number(ref.bbox.x);
  const y = Number(ref.bbox.y);
  const width = Number(ref.bbox.width);
  const height = Number(ref.bbox.height);

  if (
    !Number.isFinite(screenIndex) ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return null;
  }

  const safeX = Math.min(1, Math.max(0, x));
  const safeY = Math.min(1, Math.max(0, y));
  const safeWidth = Math.min(1 - safeX, Math.max(0, width));
  const safeHeight = Math.min(1 - safeY, Math.max(0, height));

  if (safeWidth <= 0 || safeHeight <= 0 || safeX >= 1 || safeY >= 1) return null;

  return {
    screenIndex: Math.max(0, Math.floor(screenIndex)),
    bbox: {
      x: safeX,
      y: safeY,
      width: safeWidth,
      height: safeHeight,
    },
  };
}

function normalizePersistableBBoxRefs(finding: SynthesizedFinding, groundingElements: GroundingElement[]) {
  const explicitRefs: unknown[] = Array.isArray(finding.bboxRefs) ? finding.bboxRefs : [];
  const elementLookup = new Map(groundingElements.map((element) => [element.elementId, element]));
  const fallbackRefs = explicitRefs.length > 0
    ? []
    : finding.elementRefs
        .map((elementRef) => elementLookup.get(elementRef))
        .filter((element): element is GroundingElement => Boolean(element))
        .map((element) => ({
          screenIndex: element.screenIndex,
          bbox: element.bbox,
        }));

  const sourceRefs = explicitRefs.length > 0 ? explicitRefs : fallbackRefs;
  if (sourceRefs.length === 0) return undefined;

  const refs = sourceRefs
    .map(normalizePersistableBBoxRef)
    .filter((ref): ref is NonNullable<ReturnType<typeof normalizePersistableBBoxRef>> => Boolean(ref));

  return refs.length > 0 ? refs : undefined;
}

function hasNonEmptyBBoxRefs(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.length > 0;
}

function normalizeScreenLabel(value: string): string {
  return value.replace(/\.[^.]+$/, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function getScreenIndexForFinding(screenName: string, imageAssetNames: string[]): number {
  const target = normalizeScreenLabel(screenName);
  const exactIndex = imageAssetNames.findIndex((name) => normalizeScreenLabel(name) === target);
  if (exactIndex >= 0) return exactIndex;

  const looseIndex = imageAssetNames.findIndex((name) => {
    const normalized = normalizeScreenLabel(name);
    return normalized.includes(target) || target.includes(normalized);
  });

  if (looseIndex >= 0) return looseIndex;
  return 0;
}

function buildFallbackBBoxRef(screenIndex: number, findingOrdinal: number) {
  const cols = 4;
  const rows = 6;
  const col = findingOrdinal % cols;
  const row = Math.floor(findingOrdinal / cols) % rows;

  const cellWidth = 1 / cols;
  const cellHeight = 1 / rows;
  const width = 0.08;
  const height = 0.06;
  const x = Math.min(0.98 - width, Math.max(0.02, col * cellWidth + (cellWidth - width) / 2));
  const y = Math.min(0.98 - height, Math.max(0.02, row * cellHeight + (cellHeight - height) / 2));

  return {
    screenIndex: Math.max(0, screenIndex),
    bbox: { x, y, width, height },
  };
}

function normalizeStringArray(value: unknown): string[] | null {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : null;
}

function hasFindingMetadataOption(review: NonNullable<ReviewRecord>, option: string): boolean {
  const options = normalizeStringArray(review.findingMetadataOptions);
  return options ? options.includes(option) : true;
}

function buildFindingAiMetadata(finding: SynthesizedFinding) {
  const acceptanceCriteria = Array.isArray(finding.acceptanceCriteria)
    ? finding.acceptanceCriteria.filter((item) => item.trim().length > 0)
    : [];

  const metadata: Record<string, string | string[] | number[]> = {};
  if (acceptanceCriteria.length > 0) metadata.acceptanceCriteria = acceptanceCriteria;
  if (finding.requirementTraceability) metadata.requirementTraceability = finding.requirementTraceability;
  if (finding.wcagCriteria) metadata.wcagCriteria = finding.wcagCriteria;

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function extractScreenIndex(finding: SynthesizedFinding): number | null {
  const explicitRef = Array.isArray(finding.bboxRefs) ? finding.bboxRefs[0] : undefined;
  if (explicitRef && Number.isInteger(explicitRef.screenIndex)) {
    return explicitRef.screenIndex;
  }

  for (const ref of finding.elementRefs) {
    const match = ref.match(/^screen(\d+)-el-/);
    if (match) {
      const screenIndex = parseInt(match[1], 10) - 1;
      if (screenIndex >= 0) return screenIndex;
    }
  }

  return null;
}

function buildIndependentFlowDiscovery(imageAssetNames: string[]): FlowDiscoveryOutput {
  return {
    flows: imageAssetNames.map((assetName, index) => {
      const stem = assetName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
      return {
        flowName: stem ? `Page ${index + 1} - ${stem}` : `Page ${index + 1}`,
        description: "Independent page-level asset because Key Flows Only was not enabled.",
        pageNumbers: [index + 1],
      };
    }),
    routingRationale: "Key Flows Only was disabled, so each page was treated as an independent asset.",
  };
}

function normalizeFlowDiscoveryOutput(
  output: FlowDiscoveryOutput | null | undefined,
  imageAssetNames: string[],
  keyFlowsOnly: boolean
): FlowDiscoveryOutput {
  const fallback = buildIndependentFlowDiscovery(imageAssetNames);
  if (!keyFlowsOnly || !output?.flows?.length) return fallback;

  const pageCount = imageAssetNames.length;
  const assigned = new Set<number>();
  const flows: DiscoveredFlow[] = [];

  for (const flow of output.flows) {
    const pageNumbers = Array.from(new Set(flow.pageNumbers ?? []))
      .filter((pageNumber) => Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= pageCount && !assigned.has(pageNumber))
      .sort((a, b) => a - b);

    if (pageNumbers.length === 0) continue;
    pageNumbers.forEach((pageNumber) => assigned.add(pageNumber));
    flows.push({
      flowName: flow.flowName?.trim() || `Flow ${flows.length + 1}`,
      description: flow.description?.trim() || "AI-discovered journey grouping.",
      pageNumbers,
    });
  }

  for (const fallbackFlow of fallback.flows) {
    if (!assigned.has(fallbackFlow.pageNumbers[0])) {
      flows.push(fallbackFlow);
    }
  }

  return {
    flows: flows.length > 0 ? flows : fallback.flows,
    routingRationale: output.routingRationale?.trim() || "Pages were grouped by inferred user intent and task continuity.",
  };
}

function findFlowForFinding(finding: SynthesizedFinding, flowDiscovery: FlowDiscoveryOutput): DiscoveredFlow | null {
  const screenIndex = extractScreenIndex(finding);
  if (screenIndex === null) return null;
  const pageNumber = screenIndex + 1;
  return flowDiscovery.flows.find((flow) => flow.pageNumbers.includes(pageNumber)) ?? null;
}

function buildFindingAiMetadataWithFlow(finding: SynthesizedFinding, flowDiscovery: FlowDiscoveryOutput) {
  const metadata: Record<string, string | string[] | number[]> = buildFindingAiMetadata(finding) ?? {};
  const flow = findFlowForFinding(finding, flowDiscovery);

  if (flow) {
    metadata.flowName = flow.flowName;
    metadata.flowDescription = flow.description;
    metadata.flowPageNumbers = flow.pageNumbers;
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

/**
 * Derive the screen/asset name for a finding by inspecting its elementRefs.
 * elementRefs use the format "screen{N}-el-{M}" where N is 1-based.
 * We map that index back to the uploaded image asset name so the frontend
 * can match findings to screens.
 */
function extractScreenName(finding: SynthesizedFinding, imageAssetNames: string[]): string {
  for (const ref of finding.elementRefs) {
    const match = ref.match(/^screen(\d+)-el-/);
    if (match) {
      const screenIndex = parseInt(match[1], 10) - 1; // convert 1-based to 0-based
      if (screenIndex >= 0 && screenIndex < imageAssetNames.length) {
        return imageAssetNames[screenIndex];
      }
    }
  }
  // Fallback: single-screen reviews → use the only asset name
  if (imageAssetNames.length === 1) return imageAssetNames[0];
  // Multi-screen but couldn't resolve → mark as Multiple so frontend shows on all screens
  return "Multiple";
}

function resolveArea(finding: SynthesizedFinding): "USABILITY" | "ACCESSIBILITY" | "CONSISTENCY" | "CONTENT_UX" | "RISK" | "RECOMMENDATIONS" {
  const sources = new Set(finding.sources.map((source) => source.toLowerCase()));
  const principle = finding.principle.toLowerCase();

  // Accessibility agent
  if (
    sources.has("accessibility") ||
    principle.includes("wcag") ||
    principle.includes("perceivable") ||
    principle.includes("operable") ||
    principle.includes("understandable") ||
    principle.includes("robust") ||
    principle.includes("keyboard") ||
    principle.includes("screen reader") ||
    principle.includes("touch target")
  ) {
    return "ACCESSIBILITY";
  }

  // Risk agent (gestalt node repurposed)
  if (
    sources.has("gestalt") ||
    principle.includes("section 508") ||
    principle.includes("compliance") ||
    principle.includes("hipaa") ||
    principle.includes("bfsi") ||
    principle.includes("destructive") ||
    principle.includes("privacy") ||
    principle.includes("regulation")
  ) {
    return "RISK";
  }

  // Recommendations agent (visualDesign node repurposed)
  if (
    sources.has("visualdesign") ||
    principle.includes("business impact") ||
    principle.includes("effort estimate") ||
    principle.includes("acceptance criteria") ||
    principle.includes("linked principle")
  ) {
    return "RECOMMENDATIONS";
  }

  // Consistency agent (cognitiveInteraction node repurposed)
  if (
    sources.has("cognitiveinteraction") ||
    principle.includes("design system") ||
    principle.includes("component") ||
    principle.includes("spacing") ||
    principle.includes("iconography") ||
    principle.includes("token")
  ) {
    return "CONSISTENCY";
  }

  // Content UX agent (contentMicrocopy node)
  if (
    sources.has("contentmicrocopy") ||
    principle.includes("microcopy") ||
    principle.includes("clarity") ||
    principle.includes("label") ||
    principle.includes("tone") ||
    principle.includes("error message") ||
    principle.includes("copy")
  ) {
    return "CONTENT_UX";
  }

  // Default: usability agent
  return "USABILITY";
}

// ── Report builder ────────────────────────────────────────────────────────────

function buildReportMarkdown(params: {
  review: NonNullable<ReviewRecord>;
  findings: SynthesizedFinding[];
  uxScore: number;
  deduplicationNote: string;
}): { executiveSummary: string; contentMd: string } {
  const { review, findings, uxScore, deduplicationNote } = params;
  const includeRecommendations = hasFindingMetadataOption(review, "recommendationsWithAcceptanceCriteria");
  const includeLinkedPrinciple = hasFindingMetadataOption(review, "linkedPrinciple");
  const includeRequirements = hasFindingMetadataOption(review, "requirementTraceability");
  const includeAccessibility = hasFindingMetadataOption(review, "accessibilityImpactWcag");
  const includeBusinessImpact = hasFindingMetadataOption(review, "businessImpactEstimate");
  const p0 = findings.filter((finding) => finding.severity === "P0");
  const p1 = findings.filter((finding) => finding.severity === "P1");
  const p2 = findings.filter((finding) => finding.severity === "P2");

  const executiveSummary = findings.length > 0
    ? `${findings.length} canonical findings were generated for ${review.product}. The main risks are ${p0.length} P0, ${p1.length} P1, and ${p2.length} P2 issues, with an overall UX score of ${uxScore}.`
    : `No canonical findings were generated for ${review.product}. The review completed successfully with an overall UX score of ${uxScore}.`;

  const rows = findings.map((finding, index) =>
    `| ${index + 1} | ${finding.issue.replace(/\|/g, "\\|")} | ${finding.severity} | ${finding.region.replace(/\|/g, "\\|")} | ${finding.principle.replace(/\|/g, "\\|")} |`
  ).join("\n");

  const detailedFindings = findings.map((finding, index) => {
    const sources = finding.sources.join(", ");
    const mergedFrom = finding.mergedFrom.length > 0 ? finding.mergedFrom.join(", ") : "none";

    return [
      `### ${index + 1}. ${finding.issue}`,
      `- Region: ${finding.region}`,
      `- Severity: ${finding.severity}`,
      includeLinkedPrinciple ? `- Principle: ${finding.principle}` : null,
      includeLinkedPrinciple ? `- Why it matters: ${finding.why}` : null,
      includeRecommendations ? `- Recommendation: ${finding.fix}` : null,
      includeRecommendations && finding.acceptanceCriteria?.length
        ? `- Acceptance criteria:\n${finding.acceptanceCriteria.map((item) => `  - ${item}`).join("\n")}`
        : null,
      includeRequirements && finding.requirementTraceability ? `- Requirement traceability: ${finding.requirementTraceability}` : null,
      includeAccessibility && finding.a11yImpact ? `- Accessibility impact: ${finding.a11yImpact}` : null,
      includeAccessibility && finding.wcagCriteria ? `- WCAG: ${finding.wcagCriteria}` : null,
      includeBusinessImpact && finding.businessImpact ? `- Business impact: ${finding.businessImpact}` : null,
      `- Sources: ${sources}`,
      `- Merged from: ${mergedFrom}`,
    ].filter(Boolean).join("\n");
  }).join("\n\n");

  const contentMd = [
    `# ${review.name} — UX Review Report`,
    "",
    "## Project Information",
    `- Product: ${review.product}`,
    `- Domain: ${review.domain || "N/A"}`,
    `- Review type: ${review.reviewType}`,
    `- Owner: ${review.owner}`,
    `- Generated at: ${new Date().toISOString()}`,
    `- UX score: ${uxScore}`,
    "",
    "## Review Framework Applied",
    "- Nielsen heuristics",
    "- WCAG 2.2 AA (POUR principles)",
    "- Cognitive interaction laws",
    "- Gestalt principles",
    "- Content & microcopy clarity",
    "- Visual design consistency",
    "",
    "## Executive Summary",
    executiveSummary,
    "",
    "## Overall UX Risk Rating",
    `- P0: ${p0.length}`,
    `- P1: ${p1.length}`,
    `- P2: ${p2.length}`,
    `- Verdict: ${uxScore >= 90 ? "Low risk" : uxScore >= 75 ? "Moderate risk" : "High risk"}`,
    "",
    "## Deduplication Note",
    deduplicationNote,
    "",
    "## Key Findings Table",
    findings.length > 0
      ? ["| # | Finding | Severity | Screen | Principle |", "|---|---|---|---|---|", rows].join("\n")
      : "No findings were produced.",
    "",
    "## Detailed Findings",
    detailedFindings || "No detailed findings available.",
    "",
    "---",
    "AI draft generated from the LangGraph multi-agent review pipeline.",
  ].join("\n");

  return { executiveSummary, contentMd };
}

// ── Persist findings to DB ────────────────────────────────────────────────────

function buildBBoxLocationKey(ref: PersistableBBoxRef): string {
  return [
    ref.screenIndex,
    ref.bbox.x.toFixed(6),
    ref.bbox.y.toFixed(6),
    ref.bbox.width.toFixed(6),
    ref.bbox.height.toFixed(6),
  ].join("|");
}

function normalizeExistingBBoxRefs(value: unknown): PersistableBBoxRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizePersistableBBoxRef(item))
    .filter((item): item is PersistableBBoxRef => Boolean(item));
}

function buildPersistableFindingCandidates(params: {
  reviewId: string;
  findings: SynthesizedFinding[];
  imageAssetNames: string[];
  groundingElements: GroundingElement[];
  flowDiscovery: FlowDiscoveryOutput;
}): PersistableFindingCandidate[] {
  const { reviewId, findings, imageAssetNames, groundingElements, flowDiscovery } = params;

  return findings.map((finding, findingIndex) => {
    const screenName = extractScreenName(finding, imageAssetNames);
    const normalizedRefs = normalizePersistableBBoxRefs(finding, groundingElements);
    const bboxRefs = normalizedRefs ?? [
      buildFallbackBBoxRef(
        getScreenIndexForFinding(screenName, imageAssetNames),
        findingIndex,
      ),
    ];

    if (!normalizedRefs) {
      logPipeline("warn", reviewId, "using_fallback_bbox_ref", {
        findingId: finding.id,
        findingTitle: finding.issue.slice(0, 120),
        screenName,
        fallbackScreenIndex: bboxRefs[0]?.screenIndex,
      });
    }

    const basisExplanation = finding.mergedFrom.length > 0
      ? `Synthesized from ${finding.sources.join(", ")} and merged from ${finding.mergedFrom.join(", ")}.`
      : `Synthesized from ${finding.sources.join(", ")}.`;

    return {
      title: finding.issue.slice(0, 200),
      description: finding.issue,
      recommendation: finding.fix,
      severity: finding.severity,
      area: resolveArea(finding),
      screen: screenName,
      principle: finding.principle,
      observation: finding.issue,
      why: finding.why,
      businessImpact: finding.businessImpact ?? undefined,
      a11yImpact: finding.a11yImpact ?? undefined,
      aiMetadata: buildFindingAiMetadataWithFlow(finding, flowDiscovery),
      confidence: clampConfidence(finding.confidence),
      bboxRefs,
      reviewBasisName: finding.principle,
      reviewBasisExplanation: basisExplanation,
    };
  });
}

async function persistFindingCandidates(reviewId: string, candidates: PersistableFindingCandidate[]) {
  for (const candidate of candidates) {
    const createdFinding = await prisma.finding.create({
      data: {
        reviewId,
        title: candidate.title,
        description: candidate.description,
        recommendation: candidate.recommendation,
        severity: candidate.severity,
        area: candidate.area,
        screen: candidate.screen,
        principle: candidate.principle,
        observation: candidate.observation,
        why: candidate.why,
        businessImpact: candidate.businessImpact,
        a11yImpact: candidate.a11yImpact,
        aiMetadata: candidate.aiMetadata,
        confidence: candidate.confidence,
        status: "PROPOSED",
        isAiGenerated: true,
        bboxRefs: candidate.bboxRefs,
      },
    });

    if (!hasNonEmptyBBoxRefs(createdFinding.bboxRefs)) {
      try {
        await prisma.finding.update({
          where: { id: createdFinding.id },
          data: { bboxRefs: candidate.bboxRefs },
        });

        const reloadedFinding = await prisma.finding.findUnique({
          where: { id: createdFinding.id },
          select: { bboxRefs: true },
        });

        logPipeline(
          hasNonEmptyBBoxRefs(reloadedFinding?.bboxRefs) ? "warn" : "error",
          reviewId,
          hasNonEmptyBBoxRefs(reloadedFinding?.bboxRefs)
            ? "bbox_refs_force_written"
            : "bbox_refs_force_write_verification_failed",
          {
            findingId: createdFinding.id,
            fallbackRefCount: candidate.bboxRefs.length,
            verificationHasRefs: hasNonEmptyBBoxRefs(reloadedFinding?.bboxRefs),
          }
        );
      } catch (error) {
        const summary = summarizeError(error);
        logPipeline("error", reviewId, "bbox_refs_force_write_failed", {
          findingId: createdFinding.id,
          fallbackRefCount: candidate.bboxRefs.length,
          errorName: summary.name,
          errorMessage: summary.message,
        });
      }
    }

    await prisma.reviewBasisItem.create({
      data: {
        findingId: createdFinding.id,
        type: "LangGraph synthesis",
        name: candidate.reviewBasisName,
        explanation: candidate.reviewBasisExplanation,
      },
    });
  }
}

async function deduplicateCandidatesAgainstExisting(params: {
  reviewId: string;
  existingFindings: ExistingFindingForDedup[];
  newCandidates: PersistableFindingCandidate[];
}) {
  const existingByLocation = new Map<string, ExistingFindingForDedup[]>();

  for (const finding of params.existingFindings) {
    const refs = normalizeExistingBBoxRefs(finding.bboxRefs);
    for (const ref of refs) {
      const key = buildBBoxLocationKey(ref);
      const list = existingByLocation.get(key);
      if (list) {
        list.push(finding);
      } else {
        existingByLocation.set(key, [finding]);
      }
    }
  }

  const candidatesToPersist: PersistableFindingCandidate[] = [];
  let mergedCount = 0;
  let comparedPairs = 0;

  for (const candidate of params.newCandidates) {
    const locationKeys = candidate.bboxRefs.map((ref) => buildBBoxLocationKey(ref));
    const locationMatches = new Map<string, ExistingFindingForDedup>();

    for (const key of locationKeys) {
      for (const existing of existingByLocation.get(key) ?? []) {
        locationMatches.set(existing.id, existing);
      }
    }

    if (locationMatches.size === 0) {
      candidatesToPersist.push(candidate);
      continue;
    }

    let duplicateFound = false;
    for (const existing of locationMatches.values()) {
      comparedPairs += 1;
      try {
        const decision = await classifyObservationSimilarity({
          reviewId: params.reviewId,
          oldFinding: existing,
          newFinding: candidate,
        });

        if (decision.isDuplicate) {
          mergedCount += 1;
          duplicateFound = true;
          logPipeline("info", params.reviewId, "rerun_finding_merged", {
            existingFindingId: existing.id,
            newFindingTitle: candidate.title.slice(0, 120),
            reason: decision.reason,
          });
          break;
        }
      } catch (error) {
        const summary = summarizeError(error);
        logPipeline("warn", params.reviewId, "dedupe_similarity_check_failed", {
          existingFindingId: existing.id,
          newFindingTitle: candidate.title.slice(0, 120),
          errorName: summary.name,
          errorMessage: summary.message,
        });
      }
    }

    if (!duplicateFound) {
      candidatesToPersist.push(candidate);
    }
  }

  return {
    candidatesToPersist,
    mergedCount,
    comparedPairs,
  };
}

// ── Build context string ──────────────────────────────────────────────────────

function buildReviewContext(review: NonNullable<ReviewRecord>): string {
  const criteria = review.criteria.length > 0 ? review.criteria.join(", ") : "None";

  return [
    `Review: ${review.name}`,
    `Product: ${review.product}`,
    `Domain: ${review.domain || "N/A"}`,
    `Type: ${review.reviewType}`,
    `Depth: ${review.depth}`,
    `Owner: ${review.owner}`,
    `Criteria: ${criteria}`,
  ].join("\n");
}

function extractFigmaUrlFromAssets(assets: ReviewAssetRecord[]): string | null {
  for (const asset of assets) {
    const contentText = asset.contentText?.trim();
    if (!contentText) continue;

    const match = contentText.match(/(?:^|\n)Figma URL:\s*(https?:\/\/\S+)/i);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractWebsiteUrlFromAssets(assets: ReviewAssetRecord[]): string | null {
  for (const asset of assets) {
    const contentText = asset.contentText?.trim();
    if (!contentText) continue;

    const match = contentText.match(/(?:^|\n)Design System URL:\s*(https?:\/\/\S+)/i);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export async function runReviewPipeline(reviewId: string, options?: RunReviewPipelineOptions): Promise<void> {
  const pipelineStartedAt = Date.now();
  const mode: PipelineRunMode = options?.mode ?? "fresh";
  logPipeline("info", reviewId, "pipeline_started", {
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    mode,
  });

  let review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { assets: true },
  });

  if (!review) {
    logPipeline("error", reviewId, "review_not_found");
    throw new Error(`Review ${reviewId} not found`);
  }

  try {
    let sortedAssets = [...review.assets].sort((a, b) => {
      const createdDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (createdDiff !== 0) return createdDiff;
      return a.id.localeCompare(b.id);
    });

    let imageAssets = sortedAssets.filter(
      (asset: ReviewAssetRecord) => asset.mimeType.startsWith("image/")
    );

    if (imageAssets.length === 0) {
      const figmaUrl = extractFigmaUrlFromAssets(review.assets);
      const websiteUrl = extractWebsiteUrlFromAssets(review.assets);

      if (figmaUrl) {
        logPipeline("info", reviewId, "stage_updating", { stage: "capturing_figma_prototype", figmaUrl });
        await prisma.review.update({ where: { id: reviewId }, data: { stage: "capturing_figma_prototype" } });

        const captureResult = await captureFigmaPrototype({ url: figmaUrl });
        await persistCapturedFigmaScreens(reviewId, captureResult.screens);

        logPipeline("info", reviewId, "figma_capture_completed", {
          capturedScreens: captureResult.screens.length,
          visitedUrls: captureResult.visitedUrls,
          titles: captureResult.titles,
        });

        review = await prisma.review.findUnique({
          where: { id: reviewId },
          include: { assets: true },
        });

        if (!review) {
          throw new Error(`Review ${reviewId} not found after Figma capture`);
        }

        sortedAssets = [...review.assets].sort((a, b) => {
          const createdDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          if (createdDiff !== 0) return createdDiff;
          return a.id.localeCompare(b.id);
        });
        imageAssets = sortedAssets.filter(
          (asset: ReviewAssetRecord) => asset.mimeType.startsWith("image/")
        );
      } else if (websiteUrl) {
        logPipeline("info", reviewId, "stage_updating", { stage: "capturing_website_reference", websiteUrl });
        await prisma.review.update({ where: { id: reviewId }, data: { stage: "capturing_website_reference" } });

        const captureResult = await captureWebsiteReference({ url: websiteUrl });
        await persistCapturedWebsiteScreens(reviewId, captureResult.screens);

        logPipeline("info", reviewId, "website_capture_completed", {
          capturedScreens: captureResult.screens.length,
          visitedUrls: captureResult.visitedUrls,
          titles: captureResult.titles,
        });

        review = await prisma.review.findUnique({
          where: { id: reviewId },
          include: { assets: true },
        });

        if (!review) {
          throw new Error(`Review ${reviewId} not found after website capture`);
        }

        sortedAssets = [...review.assets].sort((a, b) => {
          const createdDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          if (createdDiff !== 0) return createdDiff;
          return a.id.localeCompare(b.id);
        });
        imageAssets = sortedAssets.filter(
          (asset: ReviewAssetRecord) => asset.mimeType.startsWith("image/")
        );
      }
    }

    logPipeline("info", reviewId, "stage_updating", { stage: "reading_inputs" });
    await prisma.review.update({ where: { id: reviewId }, data: { stage: "reading_inputs" } });

    const imageAssetNames = imageAssets.map((asset: ReviewAssetRecord) => asset.name);
    const documentPages = imageAssetNames.map((assetName, index) => ({
      pageNumber: index + 1,
      assetName,
    }));

    logPipeline("info", reviewId, "assets_resolved", {
      totalAssets: sortedAssets.length,
      imageAssets: imageAssets.length,
      imageAssetNames,
      textAssetsWithContent: review.assets.filter((asset: ReviewAssetRecord) => Boolean(asset.contentText?.trim())).length,
    });

    const screenshots = await Promise.all(imageAssets.map((asset: ReviewAssetRecord) => toModelScreenshotDataUrl(asset)));

    if (screenshots.length === 0) {
      logPipeline("error", reviewId, "no_image_assets");
      throw new Error("At least one image asset is required before starting the review pipeline");
    }

    logPipeline("info", reviewId, "screenshots_prepared", {
      screenshotCount: screenshots.length,
      screenshotPreview: screenshots.map((item) => item.slice(0, 48)),
    });

    const textAssets = review.assets
      .filter((asset: ReviewAssetRecord) => Boolean(asset.contentText?.trim()))
      .map((asset: ReviewAssetRecord) => `--- ${asset.name} ---\n${asset.contentText?.trim()}`)
      .join("\n\n");

    const context = [
      buildReviewContext(review),
      textAssets ? `\nInput notes:\n${textAssets}` : "",
    ].join("\n");

    const keyFlowsOnly = review.analysisScope === "key";
  const analysisStage = keyFlowsOnly ? "discovering_flows" : "analyzing_screens";
  logPipeline("info", reviewId, "stage_updating", { stage: analysisStage });
  await prisma.review.update({ where: { id: reviewId }, data: { stage: analysisStage } });

    // Bug fix: convert subcategory IDs → agent names + selectedPrinciples map
    const { selectedAgents, selectedPrinciples } = deriveAgentSelection(review.criteria);

    const resolvedModulePath = process.env.NODE_ENV === "production"
      ? resolveExistingPath(agenticBuildCandidates)
      : resolveExistingPath(agenticSourceCandidates) ?? resolveExistingPath(agenticBuildCandidates);

    logPipeline("info", reviewId, "agentic_module_loading", {
      resolvedModulePath,
    });

    const module = await loadAgenticModule();
    const finalState = await module.runReviewGraph({
      screenshots,
      context,
      reviewDepth: review.depth ?? "standard",
      // Only pass selectedAgents when the user actually chose subcategories.
      // If criteria is empty, run all agents (full review).
      selectedAgents: selectedAgents.length > 0 ? selectedAgents : undefined,
      // Pass the subcategory boolean map so each agent knows which
      // principle blocks to inject into its system prompt.
      selectedPrinciples: Object.keys(selectedPrinciples).length > 0 ? selectedPrinciples : undefined,
      findingMetadataOptions: normalizeStringArray(review.findingMetadataOptions),
      keyFlowsOnly,
      documentPages,
    });

    logPipeline("info", reviewId, "graph_completed", {
      hasGroundingOutput: Boolean(finalState.groundingOutput),
      groundingElements: finalState.groundingOutput?.elements?.length ?? 0,
      hasSynthesisOutput: Boolean(finalState.synthesisOutput),
    });

    const synthesis = finalState.synthesisOutput;
    if (!synthesis) {
      logPipeline("error", reviewId, "missing_synthesis_output");
      throw new Error("LangGraph review pipeline returned no synthesis output");
    }

    const findings = synthesis.findings;
  const flowDiscovery = normalizeFlowDiscoveryOutput(finalState.flowDiscoveryOutput, imageAssetNames, keyFlowsOnly);
    const p0 = findings.filter((finding) => finding.severity === "P0").length;
    const p1 = findings.filter((finding) => finding.severity === "P1").length;
    const p2 = findings.filter((finding) => finding.severity === "P2").length;
    const uxScore = Math.max(0, 100 - (p0 * 8) - (p1 * 3) - p2);

    logPipeline("info", reviewId, "findings_synthesized", {
      findingCount: findings.length,
      totalRawFindings: synthesis.totalRawFindings,
      p0,
      p1,
      p2,
      uxScore,
    });

    const newCandidates = buildPersistableFindingCandidates({
      reviewId,
      findings,
      imageAssetNames,
      groundingElements: finalState.groundingOutput?.elements ?? [],
      flowDiscovery,
    });

    let persistedFindings = newCandidates.length;
    let mergedCount = 0;

    if (mode === "fresh") {
      // Fresh run replaces previous findings and reports.
      await prisma.$transaction([
        prisma.finding.deleteMany({ where: { reviewId } }),
        prisma.report.deleteMany({ where: { reviewId } }),
      ]);

      await persistFindingCandidates(reviewId, newCandidates);
    } else {
      const existingFindings = await prisma.finding.findMany({
        where: { reviewId },
        select: {
          id: true,
          observation: true,
          title: true,
          description: true,
          recommendation: true,
          severity: true,
          area: true,
          screen: true,
          principle: true,
          why: true,
          businessImpact: true,
          a11yImpact: true,
          aiMetadata: true,
          confidence: true,
          bboxRefs: true,
        },
      });

      const dedupeResult = await deduplicateCandidatesAgainstExisting({
        reviewId,
        existingFindings,
        newCandidates,
      });

      mergedCount = dedupeResult.mergedCount;
      persistedFindings = dedupeResult.candidatesToPersist.length;

      await persistFindingCandidates(reviewId, dedupeResult.candidatesToPersist);

      logPipeline("info", reviewId, "rerun_dedup_completed", {
        generatedFindings: newCandidates.length,
        existingFindings: existingFindings.length,
        mergedCount,
        insertedFindings: persistedFindings,
        comparedPairs: dedupeResult.comparedPairs,
      });
    }

    logPipeline("info", reviewId, "findings_persisted", {
      persistedFindings,
      mergedCount,
      mode,
    });

    logPipeline("info", reviewId, "stage_updating", { stage: "generating_report", uxScore });
    await prisma.review.update({
      where: { id: reviewId },
      data: { stage: "generating_report", uxScore, flowDiscovery: flowDiscovery as any },
    });

    const dedupeNote = mode === "rerun_dedupe"
      ? `${synthesis.deduplicationNote} Run-again dedupe merged ${mergedCount} findings with existing findings at identical pin locations.`
      : synthesis.deduplicationNote;

    const report = buildReportMarkdown({
      review,
      findings,
      uxScore,
      deduplicationNote: dedupeNote,
    });

    await prisma.report.create({
      data: {
        reviewId,
        name: `${review.name} — UX Review Report`,
        template: "full",
        executiveSummary: report.executiveSummary,
        contentMd: report.contentMd,
        status: "ai_draft",
        createdBy: review.owner || "System",
      },
    });

    logPipeline("info", reviewId, "report_created", {
      reportName: `${review.name} — UX Review Report`,
    });

    await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: "completed",
        stage: "completed",
        uxScore,
      },
    });

    logPipeline("info", reviewId, "pipeline_completed", {
      durationMs: Date.now() - pipelineStartedAt,
      status: "completed",
      uxScore,
      findingCount: persistedFindings,
    });
  } catch (err) {
    const errorSummary = summarizeError(err);
    const failureReason = errorSummary.message.replace(/\s+/g, " ").trim().slice(0, 180) || "unknown_error";

    logPipeline("error", reviewId, "pipeline_failed", {
      durationMs: Date.now() - pipelineStartedAt,
      failureReason,
      errorName: errorSummary.name,
      errorMessage: errorSummary.message,
      errorStack: errorSummary.stack,
      errorDetails: errorSummary.details,
    });

    await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: "failed",
        stage: `failed:${failureReason}`,
      },
    }).catch(() => undefined);

    throw err;
  }
}

// ── Single Finding Regeneration ───────────────────────────────────────────────

export async function regenerateSingleFinding(params: {
  screenshot: string | null;
  originalFinding: {
    title: string;
    description: string | null;
    observation: string | null;
    severity: string;
    area: string;
    screen: string | null;
    principle: string | null;
    why: string | null;
    recommendation: string | null;
    businessImpact: string | null;
    a11yImpact: string | null;
    confidence: number;
  };
  userComments: string[];
  reviewContext: string;
  reviewDepth: string;
}): Promise<{
  issue: string;
  fix: string;
  severity: "P0" | "P1" | "P2";
  why: string;
  confidence: number;
  businessImpact: string | null;
  a11yImpact: string | null;
  acceptanceCriteria: string[];
}> {
  const module = await loadAgenticModule();

  // Use the targeted refineSingleFinding instead of running the full pipeline
  const refined = await module.refineSingleFinding({
    originalFinding: params.originalFinding,
    userComments: params.userComments,
    screenshot: params.screenshot,
    reviewContext: params.reviewContext,
    reviewDepth: params.reviewDepth,
  });

  return refined;
}

export { toModelScreenshotDataUrl, type ReviewAssetRecord };