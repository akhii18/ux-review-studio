import { prisma } from "../config/prisma";

type ReviewDepth = "quick" | "standard" | "deep";
type FindingMetadataOptions = string[];

export const ReviewsRepository = {
  async list(userId: string) {
    return prisma.review.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { findings: true } },
        findings: {
          select: {
            severity: true,
            status: true,
            reviewBasis: { select: { id: true } },
          },
        },
      },
    });
  },

  async findById(id: string, userId: string) {
    return prisma.review.findFirst({
      where: { id, userId },
      include: {
        findings: { include: { reviewBasis: true } },
        assets: true,
        reports: { orderBy: { createdAt: "desc" } },
      },
    });
  },

  async create(userId: string, data: {
    name: string;
    product: string;
    domain?: string;
    reviewType?: string;
    owner?: string;
    criteria?: string[];
    findingMetadataOptions?: FindingMetadataOptions;
    depth?: ReviewDepth;
    confidenceThreshold?: number;
  }) {
    return prisma.review.create({
      data: {
        userId,
        name:                data.name,
        product:             data.product,
        domain:              data.domain ?? "",
        reviewType:          data.reviewType ?? "full",
        owner:               data.owner ?? "User",
        criteria:            data.criteria ?? [],
        depth:               data.depth ?? "standard",
        confidenceThreshold: data.confidenceThreshold ?? 75,
        status:              "draft",
      },
    });
  },

  async saveDraft(userId: string, reviewId: string | null, data: {
    name: string;
    product: string;
    domain?: string;
    reviewType?: string;
    owner?: string;
    criteria?: string[];
    findingMetadataOptions?: FindingMetadataOptions;
    depth?: ReviewDepth;
    confidenceThreshold?: number;
    stage?: string;
  }) {
    const payload = {
      name: data.name,
      product: data.product,
      domain: data.domain ?? "",
      reviewType: data.reviewType ?? "full",
      owner: data.owner ?? "User",
      criteria: data.criteria ?? [],
      depth: data.depth ?? "standard",
      confidenceThreshold: data.confidenceThreshold ?? 75,
      status: "draft",
      stage: data.stage ?? "draft:setup",
    };

    if (reviewId) {
      const existing = await prisma.review.findFirst({ where: { id: reviewId, userId }, select: { id: true } });
      if (!existing) return null;

      return prisma.review.update({
        where: { id: existing.id },
        data: payload,
      });
    }

    return prisma.review.create({
      data: {
        userId,
        ...payload,
      },
    });
  },

  async replaceAssets(reviewId: string, assets: Array<{
    name: string;
    mimeType: string;
    blobUrl?: string;
    contentText?: string;
    sizeBytes?: number;
  }>) {
    await prisma.asset.deleteMany({ where: { reviewId } });

    if (assets.length === 0) {
      return [];
    }

    return prisma.asset.createMany({
      data: assets.map((asset) => ({
        reviewId,
        name: asset.name,
        mimeType: asset.mimeType,
        blobUrl: asset.blobUrl ?? null,
        contentText: asset.contentText ?? null,
        sizeBytes: asset.sizeBytes ?? null,
      })),
    });
  },

  async saveAsset(reviewId: string, asset: {
    name: string;
    mimeType: string;
    blobUrl?: string;
    contentText?: string;
    sizeBytes?: number;
  }) {
    return prisma.asset.create({
      data: {
        reviewId,
        name:        asset.name,
        mimeType:    asset.mimeType,
        blobUrl:     asset.blobUrl ?? null,
        contentText: asset.contentText ?? null,
        sizeBytes:   asset.sizeBytes ?? null,
      },
    });
  },

  async setInProgress(reviewId: string, userId: string) {
    const review = await prisma.review.findFirst({ where: { id: reviewId, userId }, select: { id: true } });
    if (!review) return null;

    return prisma.review.update({
      where: { id: review.id },
      data: { status: "in_progress", stage: "reading_inputs" },
    });
  },

  async getProgress(reviewId: string, userId: string) {
    const review = await prisma.review.findFirst({
      where: { id: reviewId, userId },
      select: { status: true, stage: true, uxScore: true },
    });
    if (!review) return null;

    const findingCount = await prisma.finding.count({ where: { reviewId } });
    return { ...review, findingCount };
  },

  async delete(id: string, userId: string) {
    const review = await prisma.review.findFirst({ where: { id, userId }, select: { id: true } });
    if (!review) return null;
    return prisma.review.delete({ where: { id: review.id } });
  },
};
