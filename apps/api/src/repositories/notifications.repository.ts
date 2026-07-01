import { prisma } from "../config/prisma";

export type NotificationInput = {
  type: string;
  title: string;
  message: string;
  href?: string;
  reviewId?: string;
  dedupeKey?: string;
  read?: boolean;
  createdAt?: string;
};

export const NotificationsRepository = {
  async list(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  },

  async create(userId: string, data: NotificationInput) {
    const readAt = data.read ? new Date(data.createdAt ?? new Date().toISOString()) : null;

    if (data.dedupeKey) {
      const existing = await prisma.notification.findFirst({
        where: { userId, dedupeKey: data.dedupeKey },
        select: { id: true, readAt: true },
      });

      if (existing) {
        return prisma.notification.update({
          where: { id: existing.id },
          data: {
            type: data.type,
            title: data.title,
            message: data.message,
            href: data.href ?? null,
            reviewId: data.reviewId ?? null,
            readAt: existing.readAt ?? readAt,
          },
        });
      }
    }

    return prisma.notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        href: data.href ?? null,
        reviewId: data.reviewId ?? null,
        dedupeKey: data.dedupeKey ?? null,
        readAt,
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
      },
    });
  },

  async markRead(userId: string, id: string) {
    const notification = await prisma.notification.findFirst({ where: { id, userId }, select: { id: true } });
    if (!notification) return null;

    return prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });
  },

  async markAllRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  },

  async clear(userId: string) {
    await prisma.notification.deleteMany({ where: { userId } });
  },
};