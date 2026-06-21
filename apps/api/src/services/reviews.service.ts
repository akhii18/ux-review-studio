import { ReviewsRepository } from "../repositories/reviews.repository";
import { AppError } from "../middleware/errorHandler";

export const ReviewsService = {
  async list() {
    return ReviewsRepository.list();
  },

  async getById(id: string) {
    const review = await ReviewsRepository.findById(id);
    if (!review) throw new AppError(404, "Review not found");
    return review;
  },

  async create(data: {
    name: string;
    product: string;
    domain?: string;
    reviewType?: string;
    owner?: string;
    criteria?: string[];
    depth?: string;
    confidenceThreshold?: number;
  }) {
    return ReviewsRepository.create(data);
  },

  async saveAsset(reviewId: string, asset: {
    name: string;
    mimeType: string;
    base64Data?: string;
    contentText?: string;
    sizeBytes?: number;
  }) {
    const review = await ReviewsRepository.findById(reviewId);
    if (!review) throw new AppError(404, "Review not found");
    return ReviewsRepository.saveAsset(reviewId, asset);
  },

  async startReview(reviewId: string) {
    const review = await ReviewsRepository.findById(reviewId);
    if (!review) throw new AppError(404, "Review not found");
    if (review.status === "in_progress") throw new AppError(409, "Review already in progress");
    if (review.status === "completed")   throw new AppError(409, "Review already completed");

    await ReviewsRepository.setInProgress(reviewId);

    // Fire pipeline asynchronously — do not await
    setImmediate(() => {
      import("./ai/orchestrator").then(({ runReviewPipeline }) => {
        runReviewPipeline(reviewId).catch((err: unknown) => {
          console.error("Pipeline failed for review", reviewId, err);
        });
      });
    });

    return { started: true };
  },

  async getProgress(reviewId: string) {
    return ReviewsRepository.getProgress(reviewId);
  },

  async delete(id: string) {
    const review = await ReviewsRepository.findById(id);
    if (!review) throw new AppError(404, "Review not found");
    return ReviewsRepository.delete(id);
  },

  async getAnalytics() {
    const { prisma } = await import("../config/prisma");

    const [reviews, findings] = await Promise.all([
      prisma.review.findMany({ include: { _count: { select: { findings: true } } } }),
      prisma.finding.findMany({ where: { status: { not: "DISMISSED" } } }),
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
