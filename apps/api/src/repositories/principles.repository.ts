import { prisma } from "../config/prisma";
import type { CreatePrinciple, PrincipleCategory, UpdatePrinciple } from "@uxm/shared";

export const PrinciplesRepository = {
  async findAll(category?: string, enabled?: boolean) {
    return prisma.uxPrinciple.findMany({
      where: {
        ...(category && { category: category as PrincipleCategory }),
        ...(enabled !== undefined && { enabled }),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  },

  async findById(id: string) {
    return prisma.uxPrinciple.findUnique({ where: { id } });
  },

  async create(data: CreatePrinciple) {
    return prisma.uxPrinciple.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category as PrincipleCategory,
        source: data.source,
        enabled: data.enabled,
        isCustom: true,
      },
    });
  },

  async update(id: string, data: UpdatePrinciple) {
    return prisma.uxPrinciple.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category && { category: data.category as PrincipleCategory }),
        ...(data.source !== undefined && { source: data.source }),
        ...(data.enabled !== undefined && { enabled: data.enabled }),
      },
    });
  },
};
