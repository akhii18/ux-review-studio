import path from "node:path";
import { pathToFileURL } from "node:url";
import { prisma } from "../../config/prisma";
import { getSignedStorageReadUrl } from "../supabaseStorage";

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
  bboxRefs: Array<{
    screenIndex: number;
    bbox: { x: number; y: number; width: number; height: number };
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
};

type AgenticRunResult = {
  groundingOutput?: {
    elements: Array<{
      elementId: string;
      screenIndex: number;
      bbox: { x: number; y: number; width: number; height: number };
    }>;
  } | null;
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

// ── Module loader ─────────────────────────────────────────────────────────────

const agenticSourcePath = path.resolve(__dirname, "../../../../agentic-ai/src/index.ts");
// In production this file is compiled under apps/api/dist/src/services/ai,
// so the agentic-ai package lives one level higher than the source-time path.
const agenticBuildPath = path.resolve(__dirname, "../../../../../agentic-ai/dist/index.js");

let agenticModulePromise: Promise<{ runReviewGraph: (params: {
  screenshots: string[];
  context: string;
  reviewDepth?: string;
  selectedAgents?: string[];
  selectedPrinciples?: unknown;
}) => Promise<AgenticRunResult> }> | null = null;

async function loadAgenticModule() {
  if (!agenticModulePromise) {
    agenticModulePromise = import(
      pathToFileURL((process.env.NODE_ENV === "production" ? agenticBuildPath : agenticSourcePath)).href
    );
  }

  return agenticModulePromise;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clampConfidence(confidence: number): number {
  if (Number.isNaN(confidence)) return 80;
  return Math.min(100, Math.max(0, Math.round(confidence * 100)));
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

function collectFindingBboxRefs(
  finding: SynthesizedFinding,
  elementLookup: Map<string, { screenIndex: number; bbox: { x: number; y: number; width: number; height: number } }>
): Array<{ screenIndex: number; bbox: { x: number; y: number; width: number; height: number } }> {
  if (finding.bboxRefs.length > 0) {
    return finding.bboxRefs;
  }

  const refs = finding.elementRefs
    .map((elementRef) => elementLookup.get(elementRef))
    .filter((ref): ref is NonNullable<typeof ref> => Boolean(ref));

  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = [
      ref.screenIndex,
      ref.bbox.x,
      ref.bbox.y,
      ref.bbox.width,
      ref.bbox.height,
    ].join(":");

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
      `- Principle: ${finding.principle}`,
      `- Why it matters: ${finding.why}`,
      `- Recommendation: ${finding.fix}`,
      `- Sources: ${sources}`,
      `- Merged from: ${mergedFrom}`,
    ].join("\n");
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

async function persistFindings(params: {
  reviewId: string;
  findings: SynthesizedFinding[];
  imageAssetNames: string[];
  groundingElements: Array<{ elementId: string; screenIndex: number; bbox: { x: number; y: number; width: number; height: number } }>;
}) {
  const { reviewId, findings, imageAssetNames, groundingElements } = params;
  const elementLookup = new Map(
    groundingElements.map((element) => [
      element.elementId,
      { screenIndex: element.screenIndex, bbox: element.bbox },
    ])
  );

  for (const finding of findings) {
    const screenName = extractScreenName(finding, imageAssetNames);
    const bboxRefs = collectFindingBboxRefs(finding, elementLookup);

    const createdFinding = await prisma.finding.create({
      data: {
        reviewId,
        title: finding.issue.slice(0, 200),
        description: finding.issue,
        recommendation: finding.fix,
        severity: finding.severity,
        area: resolveArea(finding),
        screen: screenName,
        principle: finding.principle,
        observation: finding.issue,
        why: finding.why,
        confidence: clampConfidence(finding.confidence),
        status: "PROPOSED",
        isAiGenerated: true,
        bboxRefs: bboxRefs.length > 0 ? bboxRefs : undefined,
      },
    });

    const basisExplanation = finding.mergedFrom.length > 0
      ? `Synthesized from ${finding.sources.join(", ")} and merged from ${finding.mergedFrom.join(", ")}.`
      : `Synthesized from ${finding.sources.join(", ")}.`;

    await prisma.reviewBasisItem.create({
      data: {
        findingId: createdFinding.id,
        type: "LangGraph synthesis",
        name: finding.principle,
        explanation: basisExplanation,
      },
    });
  }
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

function formatPipelineFailure(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/\s+/g, " ").slice(0, 240);
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export async function runReviewPipeline(reviewId: string): Promise<void> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { assets: true },
  });

  if (!review) {
    throw new Error(`Review ${reviewId} not found`);
  }

  try {
    await prisma.review.update({ where: { id: reviewId }, data: { stage: "reading_inputs" } });

    // Collect image assets in order — the index maps to "screen{N}" in elementRefs
    const imageAssets = review.assets.filter(
      (asset: ReviewAssetRecord) => asset.mimeType.startsWith("image/")
    );
    const imageAssetNames = imageAssets.map((asset: ReviewAssetRecord) => asset.name);

    const screenshots = await Promise.all(
      imageAssets.map(async (asset: ReviewAssetRecord) => {
        if (!asset.blobUrl) {
          throw new Error(`Asset ${asset.name} is missing a blobUrl`);
        }

        return getSignedStorageReadUrl(asset.blobUrl);
      })
    );

    if (screenshots.length === 0) {
      throw new Error("At least one image asset is required before starting the review pipeline");
    }

    const textAssets = review.assets
      .filter((asset: ReviewAssetRecord) => Boolean(asset.contentText?.trim()))
      .map((asset: ReviewAssetRecord) => `--- ${asset.name} ---\n${asset.contentText?.trim()}`)
      .join("\n\n");

    const context = [
      buildReviewContext(review),
      textAssets ? `\nInput notes:\n${textAssets}` : "",
    ].join("\n");

    await prisma.review.update({ where: { id: reviewId }, data: { stage: "analyzing_screens" } });

    // Bug fix: convert subcategory IDs → agent names + selectedPrinciples map
    const { selectedAgents, selectedPrinciples } = deriveAgentSelection(review.criteria);

    const module = await loadAgenticModule();
    const finalState = await module.runReviewGraph({
      screenshots,
      context,
      reviewDepth: review.depth,
      // Only pass selectedAgents when the user actually chose subcategories.
      // If criteria is empty, run all agents (full review).
      selectedAgents: selectedAgents.length > 0 ? selectedAgents : undefined,
      // Pass the subcategory boolean map so each agent knows which
      // principle blocks to inject into its system prompt.
      selectedPrinciples: Object.keys(selectedPrinciples).length > 0 ? selectedPrinciples : undefined,
    });

    const synthesis = finalState.synthesisOutput;
    if (!synthesis) {
      throw new Error("LangGraph review pipeline returned no synthesis output");
    }

    const findings = synthesis.findings;
    const p0 = findings.filter((finding) => finding.severity === "P0").length;
    const p1 = findings.filter((finding) => finding.severity === "P1").length;
    const p2 = findings.filter((finding) => finding.severity === "P2").length;
    const uxScore = Math.max(0, 100 - (p0 * 8) - (p1 * 3) - p2);

    // Clear any existing findings/reports from previous runs
    await prisma.$transaction([
      prisma.finding.deleteMany({ where: { reviewId } }),
      prisma.report.deleteMany({ where: { reviewId } }),
    ]);

    await persistFindings({
      reviewId,
      findings,
      imageAssetNames,
      groundingElements: finalState.groundingOutput?.elements ?? [],
    });

    await prisma.review.update({ where: { id: reviewId }, data: { stage: "generating_report", uxScore } });

    const report = buildReportMarkdown({
      review,
      findings,
      uxScore,
      deduplicationNote: synthesis.deduplicationNote,
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

    await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: "completed",
        stage: "completed",
        uxScore,
      },
    });
  } catch (err) {
    const failureReason = formatPipelineFailure(err);
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