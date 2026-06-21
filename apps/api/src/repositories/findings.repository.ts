import { prisma } from "../config/prisma";
import type { FindingsQuery, UpdateFinding } from "@uxm/shared";
import type { FindingStatus, ReviewArea, Severity } from "@prisma/client";

export const FindingsRepository = {
  async findByReview(reviewId: string, query: FindingsQuery) {
    const { area, status, severity, page, pageSize, sortBy, sortOrder } = query;

    const where = {
      reviewId,
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
        include: { reviewBasis: true },
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

  async findGroupedByArea(reviewId: string) {
    const findings = await prisma.finding.findMany({
      where: { reviewId },
      include: { reviewBasis: true },
      orderBy: [{ severity: "asc" }, { confidence: "desc" }],
    });

    const grouped: Record<string, typeof findings> = {};
    for (const f of findings) {
      if (!grouped[f.area]) grouped[f.area] = [];
      grouped[f.area].push(f);
    }
    return grouped;
  },

  async findNextUntriaged(reviewId: string) {
    return prisma.finding.findFirst({
      where: { reviewId, status: "PROPOSED" },
      include: { reviewBasis: true },
      orderBy: [{ severity: "asc" }, { confidence: "desc" }],
    });
  },

  async findById(id: string) {
    return prisma.finding.findUnique({
      where: { id },
      include: { reviewBasis: true },
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
      include: { reviewBasis: true },
    });
  },


  async escalate(id: string, reason: string) {
    return prisma.finding.update({
      where: { id },
      data: {
        status: "ESCALATED",
        escalationReason: reason,
        updatedAt: new Date(),
      },
      include: { reviewBasis: true },
    });
  },

  async findRecurring() {
    const results = await prisma.finding.groupBy({
      by: ["title", "area", "principle"],
      where: { status: { not: "DISMISSED" } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      having: { id: { _count: { gt: 1 } } },
    });

    return results.map((r) => ({
      title: r.title,
      area: r.area,
      principle: r.principle ?? "—",
      count: r._count.id,
    }));
  },
};
