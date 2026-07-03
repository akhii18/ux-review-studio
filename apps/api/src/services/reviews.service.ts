import { ReviewsRepository } from "../repositories/reviews.repository";
import { AppError } from "../middleware/errorHandler";
import { getSignedStorageReadUrl, uploadReviewAssetToStorage } from "./supabaseStorage";
import { config } from "../config";
import { prisma } from "../config/prisma";
import crypto from "crypto";
import { convertLegacyDoc } from "./docConversion.service";

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
  createdAt: Date;
  review: {
    product: string;
  };
};

type AnalyticsRange = "1m" | "3m" | "6m" | "1y" | "custom";

type AnalyticsQueryOptions = {
  range?: AnalyticsRange;
  startDate?: string;
  endDate?: string;
  product?: string;
  domain?: string;
  reviewType?: string;
  owner?: string;
};

function parseIsoDateToUtcBoundary(value: string, endOfDay: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveAnalyticsDateRange(options?: AnalyticsQueryOptions): { gte: Date; lte: Date } {
  const now = new Date();
  const selectedRange = options?.range ?? "1y";

  if (selectedRange === "custom") {
    const startDate = options?.startDate ? parseIsoDateToUtcBoundary(options.startDate, false) : null;
    const endDate = options?.endDate ? parseIsoDateToUtcBoundary(options.endDate, true) : null;
    if (!startDate || !endDate || startDate > endDate) {
      throw new AppError(400, "Invalid custom date range");
    }
    return { gte: startDate, lte: endDate };
  }

  const monthsByRange: Record<Exclude<AnalyticsRange, "custom">, number> = {
    "1m": 1,
    "3m": 3,
    "6m": 6,
    "1y": 12,
  };

  const startDate = new Date(now);
  startDate.setUTCMonth(startDate.getUTCMonth() - monthsByRange[selectedRange]);
  return { gte: startDate, lte: now };
}

function monthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function toTitleLabel(value: string): string {
  const title = value
    .replace(/_/g, " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return title
    .replace(/\bUx\b/g, "UX")
    .replace(/\bUi\b/g, "UI")
    .replace(/\bAi\b/g, "AI")
    .replace(/\bPrd\b/g, "PRD");
}

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
    const reviews = await ReviewsRepository.list(userId);

    return reviews.map((review: any) => {
      const priorityBreakdown = (review.findings ?? []).reduce((acc: Record<string, number>, finding: { severity: string }) => {
        acc[finding.severity] = (acc[finding.severity] ?? 0) + 1;
        return acc;
      }, { P0: 0, P1: 0, P2: 0 });

      return {
        ...review,
        priorityBreakdown,
      };
    });
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

  async convertLegacyDoc(_userId: string, payload: {
    name: string;
    mimeType: string;
    base64Data: string;
  }) {
    const isLegacyDocMime = payload.mimeType === "application/msword";
    const isLegacyDocName = payload.name.toLowerCase().endsWith(".doc");

    if (!isLegacyDocMime && !isLegacyDocName) {
      throw new AppError(400, "Only legacy .doc files are supported by this converter route");
    }

    try {
      return await convertLegacyDoc({
        fileName: payload.name,
        base64Data: payload.base64Data,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown conversion error";
      throw new AppError(422, `Failed to convert legacy .doc: ${detail}`);
    }
  },

  async startReview(reviewId: string, userId: string) {
    const review = await ReviewsRepository.findById(reviewId, userId);
    if (!review) throw new AppError(404, "Review not found");
    if (review.status === "in_progress") throw new AppError(409, "Review already in progress");
    if (review.status === "completed")   throw new AppError(409, "Review already completed");

    await ReviewsRepository.setInProgress(reviewId, userId);

    // Fire pipeline asynchronously — do not await
    setImmediate(() => {
      import("./ai/agentic.js").then(({ runReviewPipeline }) => {
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

  async getAnalytics(userId: string, options?: AnalyticsQueryOptions) {
    const dateRange = resolveAnalyticsDateRange(options);

    const reviewFieldFilters: Record<string, string> = {};
    if (options?.product && options.product !== "all") reviewFieldFilters.product = options.product;
    if (options?.domain && options.domain !== "all") reviewFieldFilters.domain = options.domain;
    if (options?.reviewType && options.reviewType !== "all") reviewFieldFilters.reviewType = options.reviewType;
    if (options?.owner && options.owner !== "all") reviewFieldFilters.owner = options.owner;

    const [reviews, findings, allReviewMeta]: [
      ReviewAnalyticsRecord[],
      FindingAnalyticsRecord[],
      Array<{ product: string; domain: string; reviewType: string; owner: string }>
    ] = await Promise.all([
      prisma.review.findMany({
        where: {
          userId,
          createdAt: dateRange,
          ...reviewFieldFilters,
        },
        include: { _count: { select: { findings: true } } },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      }),
      prisma.finding.findMany({
        where: {
          review: {
            userId,
            ...reviewFieldFilters,
          },
          createdAt: dateRange,
        },
        select: {
          severity: true,
          area: true,
          status: true,
          createdAt: true,
          review: {
            select: {
              product: true,
            },
          },
        },
      }),
      prisma.review.findMany({
        where: { userId },
        select: {
          product: true,
          domain: true,
          reviewType: true,
          owner: true,
        },
      }),
    ]);

    const filterOptions = {
      products: Array.from(new Set(allReviewMeta.map((review) => (review.product || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
      domains: Array.from(new Set(allReviewMeta.map((review) => (review.domain || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
      reviewTypes: Array.from(new Set(allReviewMeta.map((review) => (review.reviewType || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
      owners: Array.from(new Set(allReviewMeta.map((review) => (review.owner || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    };

    const completed = reviews.filter((r) => String(r.status).toLowerCase() === "completed");
    const avgUxScore = completed.length
      ? Math.round(completed.reduce((sum, r) => sum + (r.uxScore ?? 0), 0) / completed.length)
      : 0;

    const openFindings = findings.filter((f) => f.status !== "DISMISSED");

    const p0 = openFindings.filter((f) => f.severity === "P0").length;
    const p1 = openFindings.filter((f) => f.severity === "P1").length;
    const p2 = openFindings.filter((f) => f.severity === "P2").length;

    const acceptedOrEdited = findings.filter((f) => f.status === "ACCEPTED" || f.status === "EDITED").length;
    const dismissed = findings.filter((f) => f.status === "DISMISSED").length;
    const totalFindings = findings.length;
    const acceptanceRate = totalFindings > 0 ? Math.round((acceptedOrEdited / totalFindings) * 100) : 0;
    const dismissalRate = totalFindings > 0 ? Math.round((dismissed / totalFindings) * 100) : 0;

    const byArea: Record<string, number> = {};
    for (const f of openFindings) {
      byArea[f.area] = (byArea[f.area] ?? 0) + 1;
    }

    const byCategory = Object.entries(byArea)
      .map(([area, count]) => ({ c: toTitleLabel(area), n: count }))
      .sort((a, b) => b.n - a.n);

    const byProductMap: Record<string, number> = {};
    for (const f of openFindings) {
      const product = (f.review.product || "Unknown product").trim() || "Unknown product";
      byProductMap[product] = (byProductMap[product] ?? 0) + 1;
    }

    const byProduct = Object.entries(byProductMap)
      .map(([product, count]) => ({ p: product, n: count }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);

    const trendBuckets = new Map<string, { scoreSum: number; scoreCount: number; reviews: number; accepted: number; findings: number }>();
    for (const review of reviews) {
      const key = monthKey(review.createdAt);
      const current = trendBuckets.get(key) ?? { scoreSum: 0, scoreCount: 0, reviews: 0, accepted: 0, findings: 0 };
      current.reviews += 1;
      if (typeof review.uxScore === "number") {
        current.scoreSum += review.uxScore;
        current.scoreCount += 1;
      }
      trendBuckets.set(key, current);
    }

    for (const finding of findings) {
      const key = monthKey(finding.createdAt);
      const current = trendBuckets.get(key) ?? { scoreSum: 0, scoreCount: 0, reviews: 0, accepted: 0, findings: 0 };
      current.findings += 1;
      if (finding.status === "ACCEPTED" || finding.status === "EDITED") {
        current.accepted += 1;
      }
      trendBuckets.set(key, current);
    }

    const trend = Array.from(trendBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([m, bucket]) => ({
        m,
        score: bucket.scoreCount > 0 ? Math.round(bucket.scoreSum / bucket.scoreCount) : 0,
        reviews: bucket.reviews,
        accept: bucket.findings > 0 ? Math.round((bucket.accepted / bucket.findings) * 100) : 0,
      }));

    const a11yBuckets = new Map<string, { resolved: number; total: number }>();
    for (const finding of findings) {
      if (finding.area !== "ACCESSIBILITY") continue;
      const key = monthKey(finding.createdAt);
      const current = a11yBuckets.get(key) ?? { resolved: 0, total: 0 };
      current.total += 1;
      if (finding.status === "ACCEPTED" || finding.status === "EDITED") {
        current.resolved += 1;
      }
      a11yBuckets.set(key, current);
    }

    const a11yTrend = Array.from(a11yBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([m, bucket]) => ({
        m,
        v: bucket.total > 0 ? Math.round((bucket.resolved / bucket.total) * 100) : 0,
      }));

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
        totalFindings,
        avgUxScore,
        p0Count: p0,
        p1Count: p1,
        p2Count: p2,
        acceptanceRate,
        dismissalRate,
      },
      findingsByArea: byArea,
      byCategory,
      byProduct,
      trend,
      a11yTrend,
      recentReviews:  recent,
      needsAttention: findings.filter((f) => f.severity === "P0" && f.status === "PROPOSED").length,
      filterOptions,
    };
  },
};
