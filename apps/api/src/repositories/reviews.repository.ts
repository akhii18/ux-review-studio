import { prisma } from "../config/prisma";

export const ReviewsRepository = {
  async list() {
    return prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { findings: true } },
      },
    });
  },

  async findById(id: string) {
    return prisma.review.findUnique({
      where: { id },
      include: {
        findings: { include: { reviewBasis: true } },
        assets: true,
        reports: { orderBy: { createdAt: "desc" } },
      },
    });
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
    return prisma.review.create({
      data: {
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

  async setInProgress(reviewId: string) {
    return prisma.review.update({
      where: { id: reviewId },
      data: { status: "in_progress", stage: "reading_inputs" },
    });
  },

  async getProgress(reviewId: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { status: true, stage: true, uxScore: true },
    });
    const findingCount = await prisma.finding.count({ where: { reviewId } });
    return { ...review, findingCount };
  },

  async delete(id: string) {
    return prisma.review.delete({ where: { id } });
  },
};
