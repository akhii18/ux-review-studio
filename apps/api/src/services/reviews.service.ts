import { ReviewsRepository } from "../repositories/reviews.repository";
import { AppError } from "../middleware/errorHandler";
import { getSignedStorageReadUrl, uploadReviewAssetToStorage } from "./supabaseStorage";
import { config } from "../config";
import { prisma } from "../config/prisma";
import crypto from "crypto";

type ReviewAssetRecord = {
  storageRef?: string | null;
  blobUrl: string | null;
  name: string;
  mimeType: string;
  contentText: string | null;
  sizeBytes: number | null;
};

type ReviewAnalyticsRecord = {
  id: string;
  name: string;
  product: string;
  status: string;
  uxScore: number | null;
  createdAt: Date;
  _count: { findings: number };
};

type FindingAnalyticsRecord = {
  severity: "P0" | "P1" | "P2";
  area: string;
  status: string;
};

type DraftAssetInput = {
  name: string;
  mimeType: string;
  base64Data?: string;
  blobUrl?: string;
  contentText?: string;
  sizeBytes?: number;
};

type DraftReviewInput = {
  reviewId?: string;
  name: string;
  product: string;
  domain?: string;
  reviewType?: string;
  owner?: string;
  criteria?: string[];
  depth?: string;
  confidenceThreshold?: number;
  stage?: string;
  assets?: DraftAssetInput[];
};

type ReviewExportRecord = {
  id: string;
  title: string;
  severity: string;
  area: string;
  screen: string | null;
  observation: string | null;
  why: string | null;
  recommendation: string | null;
  businessImpact: string | null;
  a11yImpact: string | null;
  status: string;
  reviewBasis: Array<{ type: string; name: string; explanation: string }>;
};

function isExportableFindings(findings: ReviewExportRecord[]): boolean {
  const proposedCount = findings.filter((finding) => finding.status === "PROPOSED").length;
  const approved = findings.filter((finding) => finding.status === "ACCEPTED" || finding.status === "EDITED");
  return proposedCount === 0 && approved.length > 0 && approved.every((finding) => finding.reviewBasis.length > 0);
}

function buildExportMarkdown(review: { name: string; product: string; domain: string; reviewType: string; uxScore: number | null; stage: string | null }, findings: ReviewExportRecord[]) {
  const included = findings.filter((finding) => finding.status === "ACCEPTED" || finding.status === "EDITED");
  const dismissed = findings.filter((finding) => finding.status === "DISMISSED");
  const escalated = findings.filter((finding) => finding.status === "ESCALATED");

  const renderBasis = (basis: ReviewExportRecord["reviewBasis"]) =>
    basis.length > 0
      ? basis.map((item) => `- **${item.name}** (${item.type})${item.explanation ? `: ${item.explanation}` : ""}`).join("\n")
      : "- Basis not provided";

  const renderFinding = (finding: ReviewExportRecord, index: number) => [
    `### ${index + 1}. ${finding.title}`,
    `- Severity: ${finding.severity}`,
    `- Area: ${finding.area}`,
    `- Screen: ${finding.screen ?? "Unknown"}`,
    finding.observation ? `- Observation: ${finding.observation}` : null,
    finding.why ? `- Why it matters: ${finding.why}` : null,
    finding.recommendation ? `- Recommendation: ${finding.recommendation}` : null,
    finding.businessImpact ? `- Business impact: ${finding.businessImpact}` : null,
    finding.a11yImpact ? `- Accessibility impact: ${finding.a11yImpact}` : null,
    `- Review basis:\n${renderBasis(finding.reviewBasis)}`,
  ].filter(Boolean).join("\n");

  return [
    `# ${review.name} — Final UX Review`,
    "",
    `- Product: ${review.product}`,
    `- Domain: ${review.domain || "—"}`,
    `- Review type: ${review.reviewType}`,
    `- UX score: ${review.uxScore ?? "—"}`,
    `- Review stage: ${review.stage || "completed"}`,
    `- Included findings: ${included.length}`,
    `- Dismissed findings: ${dismissed.length}`,
    `- Escalated findings: ${escalated.length}`,
    "",
    "## Executive Summary",
    included.length > 0
      ? "This report includes only findings that were accepted or edited during triage. Dismissed and escalated items are excluded from the export."
      : "No findings were accepted for export.",
    "",
    "## Included Findings",
    included.length > 0
      ? included.map((finding, index) => renderFinding(finding, index)).join("\n\n")
      : "No findings were approved for export.",
  ].join("\n");
}

export const ReviewsService = {
  async list(userId: string) {
    return ReviewsRepository.list(userId);
  },

  async getById(id: string, userId: string) {
    const review = await ReviewsRepository.findById(id, userId);
    if (!review) throw new AppError(404, "Review not found");

    return {
      ...review,
      assets: await Promise.all(
        review.assets.map(async (asset: ReviewAssetRecord) => ({
          ...asset,
          storageRef: asset.blobUrl,
          blobUrl: asset.blobUrl ? await getSignedStorageReadUrl(asset.blobUrl) : asset.blobUrl,
        }))
      ),
    };
  },

  async create(userId: string, data: {
    name: string;
    product: string;
    domain?: string;
    reviewType?: string;
    owner?: string;
    criteria?: string[];
    depth?: string;
    confidenceThreshold?: number;
  }) {
    return ReviewsRepository.create(userId, data);
  },

  async saveDraft(userId: string, data: DraftReviewInput) {
    const review = await ReviewsRepository.saveDraft(userId, data.reviewId ?? null, {
      name: data.name,
      product: data.product,
      domain: data.domain,
      reviewType: data.reviewType,
      owner: data.owner,
      criteria: data.criteria,
      depth: data.depth,
      confidenceThreshold: data.confidenceThreshold,
      stage: data.stage,
    });

    if (!review) {
      throw new AppError(404, "Review not found");
    }

    if (data.assets) {
      await ReviewsRepository.replaceAssets(review.id, data.assets.map((asset) => ({
        name: asset.name,
        mimeType: asset.mimeType,
        blobUrl: asset.base64Data
          ? `data:${asset.mimeType};base64,${asset.base64Data}`
          : asset.blobUrl,
        contentText: asset.contentText,
        sizeBytes: asset.sizeBytes,
      })));
    }

    const savedReview = await ReviewsRepository.findById(review.id, userId);
    if (!savedReview) {
      throw new AppError(404, "Review not found");
    }

    return savedReview;
  },

  async saveAsset(userId: string, reviewId: string, asset: {
    name: string;
    mimeType: string;
    base64Data?: string;
    blobUrl?: string;
    contentText?: string;
    sizeBytes?: number;
  }) {
    const review = await ReviewsRepository.findById(reviewId, userId);
    if (!review) throw new AppError(404, "Review not found");

    if (asset.base64Data) {
      const hasSupabaseStorageConfig = Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);

      if (hasSupabaseStorageConfig) {
        const uploaded = await uploadReviewAssetToStorage({
          reviewId,
          name: asset.name,
          mimeType: asset.mimeType,
          base64Data: asset.base64Data,
        });

        return ReviewsRepository.saveAsset(reviewId, {
          name: asset.name,
          mimeType: asset.mimeType,
          blobUrl: uploaded.storageRef,
          contentText: asset.contentText,
          sizeBytes: asset.sizeBytes,
        });
      }

      const inlineDataUrl = `data:${asset.mimeType};base64,${asset.base64Data}`;

      return ReviewsRepository.saveAsset(reviewId, {
        name: asset.name,
        mimeType: asset.mimeType,
        blobUrl: inlineDataUrl,
        contentText: asset.contentText,
        sizeBytes: asset.sizeBytes,
      });
    }

    return ReviewsRepository.saveAsset(reviewId, {
      name: asset.name,
      mimeType: asset.mimeType,
      blobUrl: asset.blobUrl,
      contentText: asset.contentText,
      sizeBytes: asset.sizeBytes,
    });
  },

  async startReview(reviewId: string, userId: string) {
    const review = await ReviewsRepository.findById(reviewId, userId);
    if (!review) throw new AppError(404, "Review not found");
    if (review.status === "in_progress") throw new AppError(409, "Review already in progress");
    if (review.status === "completed")   throw new AppError(409, "Review already completed");

    await ReviewsRepository.setInProgress(reviewId, userId);

    // Fire pipeline asynchronously — do not await
    setImmediate(() => {
      import("./ai/orchestrator.js").then(({ runReviewPipeline }) => {
        runReviewPipeline(reviewId).catch((err: unknown) => {
          console.error("Pipeline failed for review", reviewId, err);
        });
      });
    });

    return { started: true };
  },

  async getProgress(reviewId: string, userId: string) {
    const progress = await ReviewsRepository.getProgress(reviewId, userId);
    if (!progress) throw new AppError(404, "Review not found");
    return progress;
  },

  async delete(id: string, userId: string) {
    const review = await ReviewsRepository.findById(id, userId);
    if (!review) throw new AppError(404, "Review not found");
    return ReviewsRepository.delete(id, userId);
  },

  async exportReport(reviewId: string, userId: string) {
    const review = await prisma.review.findFirst({
      where: { id: reviewId, userId },
      include: { findings: { include: { reviewBasis: true } }, reports: { orderBy: { createdAt: "desc" } } },
    });

    if (!review) {
      throw new AppError(404, "Review not found");
    }

    const findings = review.findings as ReviewExportRecord[];
    if (!isExportableFindings(findings)) {
      throw new AppError(409, "Triage or review the findings for report export");
    }

    const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const contentMd = buildExportMarkdown(review, findings);

    await prisma.report.deleteMany({
      where: { reviewId, status: "finalized" },
    });

    return prisma.report.create({
      data: {
        id: `rep-${crypto.randomUUID().slice(0, 8)}`,
        reviewId,
        name: `${review.name} — Final UX Report`,
        template: review.reviewType,
        executiveSummary: `Accepted ${findings.filter((finding) => finding.status === "ACCEPTED" || finding.status === "EDITED").length} findings for export.`,
        contentMd,
        status: "finalized",
        createdBy: currentUser?.name ?? review.owner,
      },
    });
  },

  async getAnalytics(userId: string) {
    const { prisma } = await import("../config/prisma.js");

    const [reviews, findings]: [ReviewAnalyticsRecord[], FindingAnalyticsRecord[]] = await Promise.all([
      prisma.review.findMany({
        where: { userId },
        include: { _count: { select: { findings: true } } },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      }),
      prisma.finding.findMany({
        where: { status: { not: "DISMISSED" }, review: { userId } },
      }),
    ]);

    const completed = reviews.filter((r) => r.status === "completed");
    const avgUxScore = completed.length
      ? Math.round(completed.reduce((sum, r) => sum + (r.uxScore ?? 0), 0) / completed.length)
      : 0;

    const p0 = findings.filter((f) => f.severity === "P0").length;
    const p1 = findings.filter((f) => f.severity === "P1").length;
    const p2 = findings.filter((f) => f.severity === "P2").length;

    const byArea: Record<string, number> = {};
    for (const f of findings) {
      byArea[f.area] = (byArea[f.area] ?? 0) + 1;
    }

    const recent = reviews.slice(0, 5).map((r) => ({
      id: r.id,
      name: r.name,
      product: r.product,
      status: r.status,
      uxScore: r.uxScore,
      findingCount: r._count.findings,
      createdAt: r.createdAt,
    }));

    return {
      kpis: {
        totalReviews:   reviews.length,
        completedReviews: completed.length,
        totalFindings:  findings.length,
        avgUxScore,
        p0Count: p0,
        p1Count: p1,
        p2Count: p2,
      },
      findingsByArea: byArea,
      recentReviews:  recent,
      needsAttention: findings.filter((f) => f.severity === "P0" && f.status === "PROPOSED").length,
    };
  },
};
