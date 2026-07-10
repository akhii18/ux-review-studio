import { prisma } from "../config/prisma";
import type { Prisma } from "@prisma/client";
import type { FindingStatus, FindingsQuery, ReviewArea, Severity, UpdateFinding } from "@uxm/shared";

export const FindingsRepository = {
  async findByReview(reviewId: string, userId: string, query: FindingsQuery) {
    const { area, status, severity, page, pageSize, sortBy, sortOrder } = query;

    const where = {
      reviewId,
      review: { userId },
      ...(area && { area: area as ReviewArea }),
      ...(status && { status: status as FindingStatus }),
      ...(severity && { severity: severity as Severity }),
    };

    const orderBy =
      sortBy === "severity"
        ? { severity: sortOrder as "asc" | "desc" }
        : sortBy === "confidence"
          ? { confidence: sortOrder as "asc" | "desc" }
          : { createdAt: sortOrder as "asc" | "desc" };

    const [data, total] = await Promise.all([
      prisma.finding.findMany({
        where,
        include: { reviewBasis: true, comments: { orderBy: { createdAt: "asc" } } },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.finding.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  async findGroupedByArea(reviewId: string, userId: string) {
    const findings = await prisma.finding.findMany({
      where: { reviewId, review: { userId } },
      include: { reviewBasis: true, comments: { orderBy: { createdAt: "asc" } } },
      orderBy: [{ severity: "asc" }, { confidence: "desc" }],
    });

    const grouped: Record<string, typeof findings> = {};
    for (const f of findings) {
      if (!grouped[f.area]) grouped[f.area] = [];
      grouped[f.area].push(f);
    }
    return grouped;
  },

  async findNextUntriaged(reviewId: string, userId: string) {
    return prisma.finding.findFirst({
      where: { reviewId, status: "PROPOSED", review: { userId } },
      include: { reviewBasis: true, comments: { orderBy: { createdAt: "asc" } } },
      orderBy: [{ severity: "asc" }, { confidence: "desc" }],
    });
  },

  async findById(id: string, userId: string) {
    return prisma.finding.findFirst({
      where: { id, review: { userId } },
      include: { reviewBasis: true, comments: { orderBy: { createdAt: "asc" } } },
    });
  },

  async update(id: string, data: UpdateFinding) {
    const { reviewBasis, ...rest } = data;
    return prisma.finding.update({
      where: { id },
      data: {
        ...rest,
        updatedAt: new Date(),
        ...(reviewBasis !== undefined && {
          reviewBasis: {
            deleteMany: {},
            create: reviewBasis.map((b) => ({
              type: b.type,
              name: b.name,
              explanation: b.explanation,
            })),
          },
        }),
      },
      include: { reviewBasis: true, comments: { orderBy: { createdAt: "asc" } } },
    });
  },


  async escalate(id: string, reason: string, aiMetadata?: Prisma.InputJsonValue) {
    return prisma.finding.update({
      where: { id },
      data: {
        status: "ESCALATED",
        escalationReason: reason,
        aiMetadata: aiMetadata ?? undefined,
        updatedAt: new Date(),
      },
      include: { reviewBasis: true, comments: { orderBy: { createdAt: "asc" } } },
    });
  },

  async createComment(findingId: string, text: string, authorName: string = "User") {
    return prisma.comment.create({
      data: {
        findingId,
        text,
        authorName,
      },
    });
  },

  async getCommentsByFinding(findingId: string) {
    return prisma.comment.findMany({
      where: { findingId },
      orderBy: { createdAt: "asc" },
    });
  },

  async findRecurring(userId: string) {
    const results = await prisma.finding.groupBy({
      by: ["title", "area", "principle"],
      where: { status: { not: "DISMISSED" }, review: { userId } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      having: { id: { _count: { gt: 1 } } },
    });

    return results.map((r: (typeof results)[number]) => ({
      title: r.title,
      area: r.area,
      principle: r.principle ?? "—",
      count: r._count.id,
    }));
  },
};
