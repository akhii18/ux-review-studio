import path from "node:path";
import { pathToFileURL } from "node:url";
import { prisma } from "../../config/prisma";
import { getSignedStorageReadUrl } from "../supabaseStorage";

type SynthesizedFinding = {
  id: string;
  region: string;
  elementRefs: string[];
  bboxRefs: Array<{ screenIndex: number; bbox: { x: number; y: number; width: number; height: number } }>;
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

const agenticSourcePath = path.resolve(__dirname, "../../../../agentic-ai/src/index.ts");
const agenticBuildPath = path.resolve(__dirname, "../../../../agentic-ai/dist/index.js");

let agenticModulePromise: Promise<{ runReviewGraph: (params: {
  screenshots: string[];
  context: string;
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

function clampConfidence(confidence: number): number {
  if (Number.isNaN(confidence)) return 80;
  return Math.min(100, Math.max(0, Math.round(confidence * 100)));
}

function resolveArea(finding: SynthesizedFinding): "USABILITY" | "ACCESSIBILITY" | "CONSISTENCY" | "CONTENT_UX" | "RISK" | "RECOMMENDATIONS" {
  const sources = new Set(finding.sources.map((source) => source.toLowerCase()));
  const principle = finding.principle.toLowerCase();

  if (sources.has("accessibility") || principle.includes("wcag") || principle.includes("accessibility")) {
    return "ACCESSIBILITY";
  }
  if (sources.has("contentmicrocopy") || principle.includes("copy") || principle.includes("microcopy")) {
    return "CONTENT_UX";
  }
  if (sources.has("gestalt") || sources.has("visualdesign") || principle.includes("gestalt") || principle.includes("visual")) {
    return "CONSISTENCY";
  }
  if (sources.has("cognitiveinteraction")) {
    return "USABILITY";
  }
  return "USABILITY";
}

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
    "- WCAG 2.2 AA",
    "- Cognitive interaction laws",
    "- Gestalt principles",
    "- Content clarity",
    "- Design-system consistency",
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
    "AI draft generated from the LangGraph review pipeline.",
  ].join("\n");

  return { executiveSummary, contentMd };
}

async function persistFindings(params: {
  reviewId: string;
  findings: SynthesizedFinding[];
}) {
  const { reviewId, findings } = params;

  for (const finding of findings) {
    const createdFinding = await prisma.finding.create({
      data: {
        reviewId,
        title: finding.issue.slice(0, 200),
        description: finding.issue,
        recommendation: finding.fix,
        severity: finding.severity,
        area: resolveArea(finding),
        screen: finding.region,
        principle: finding.principle,
        observation: finding.issue,
        why: finding.why,
        confidence: clampConfidence(finding.confidence),
        status: "PROPOSED",
        isAiGenerated: true,
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

    const screenshots = await Promise.all(
      review.assets
        .filter((asset: ReviewAssetRecord) => asset.mimeType.startsWith("image/"))
        .map(async (asset: ReviewAssetRecord) => {
          if (!asset.blobUrl) {
            throw new Error(`Asset ${asset.name} is missing a blobUrl`);
          }

          return getSignedStorageReadUrl(asset.blobUrl);
        })
    );

    if (screenshots.length === 0) {
      throw new Error("At least one image asset is required before starting the LangGraph review pipeline");
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

    const module = await loadAgenticModule();
    const finalState = await module.runReviewGraph({
      screenshots,
      context,
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

    const existingFindingIds = await prisma.finding.findMany({
      where: { reviewId },
      select: { id: true },
    }).then((rows: Array<{ id: string }>) => rows.map((row: { id: string }) => row.id));

    await prisma.$transaction([
      prisma.finding.deleteMany({ where: { reviewId } }),
      prisma.report.deleteMany({ where: { reviewId } }),
    ]);

    await persistFindings({ reviewId, findings });

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
    await prisma.review.update({
      where: { id: reviewId },
      data: {
        status: "failed",
        stage: "failed",
      },
    }).catch(() => undefined);

    throw err;
  }
}