import { prisma } from "../config/prisma";
import type { CreateChecklist, UpdateChecklist } from "@uxm/shared";
import type { ReviewArea } from "@prisma/client";

export const ChecklistsRepository = {
  async findAll() {
    return prisma.checklist.findMany({
      include: { items: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string) {
    return prisma.checklist.findUnique({
      where: { id },
      include: {
        items: { orderBy: { order: "asc" } },
        history: { orderBy: { createdAt: "desc" } },
      },
    });
  },

  async create(data: CreateChecklist) {
    return prisma.checklist.create({
      data: {
        title: data.title,
        description: data.description,
        items: {
          create: data.items.map((item) => ({
            label: item.label,
            description: item.description,
            principleId: item.principleId,
            area: item.area as ReviewArea | undefined,
            required: item.required,
            order: item.order,
          })),
        },
        history: {
          create: [{ action: "CREATED", performedBy: "user" }],
        },
      },
      include: { items: { orderBy: { order: "asc" } } },
    });
  },

  async update(id: string, data: UpdateChecklist, performedBy: string) {
    const checklist = await prisma.checklist.findUnique({ where: { id } });
    if (!checklist) return null;

    return prisma.$transaction(async (tx) => {
      if (data.items !== undefined) {
        await tx.checklistItem.deleteMany({ where: { checklistId: id } });
        await tx.checklistItem.createMany({
          data: data.items.map((item, i) => ({
            checklistId: id,
            label: item.label,
            description: item.description,
            principleId: item.principleId,
            area: item.area as ReviewArea | undefined,
            required: item.required ?? true,
            order: item.order ?? i,
          })),
        });
      }

      const updated = await tx.checklist.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          version: { increment: 1 },
        },
        include: { items: { orderBy: { order: "asc" } } },
      });

      await tx.checklistHistory.create({
        data: { checklistId: id, action: "UPDATED", performedBy },
      });

      return updated;
    });
  },

  async approve(id: string, approvedBy: string) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.checklist.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedBy,
        },
        include: { items: { orderBy: { order: "asc" } } },
      });

      await tx.checklistHistory.create({
        data: { checklistId: id, action: "APPROVED", performedBy: approvedBy },
      });

      return updated;
    });
  },
};
