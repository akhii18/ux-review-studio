import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../middleware/errorHandler";
import { NotificationsService } from "../services/notifications.service";

const NotificationSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  href: z.string().optional(),
  reviewId: z.string().optional(),
  dedupeKey: z.string().optional(),
  read: z.boolean().optional(),
  createdAt: z.string().optional(),
});

function getUserId(req: Request): string {
  const userId = req.user?.sub;
  if (!userId) throw new AppError(401, "Authentication required");
  return userId;
}

export const NotificationsController = {
  async list(req: Request, res: Response) {
    const items = await NotificationsService.list(getUserId(req));
    res.json({ success: true, data: items });
  },

  async create(req: Request, res: Response) {
    const payload = NotificationSchema.parse(req.body);
    const item = await NotificationsService.create(getUserId(req), payload);
    res.status(201).json({ success: true, data: item });
  },

  async markRead(req: Request, res: Response) {
    const item = await NotificationsService.markRead(getUserId(req), req.params.id as string);
    if (!item) throw new AppError(404, "Notification not found");
    res.json({ success: true, data: item });
  },

  async markAllRead(req: Request, res: Response) {
    const result = await NotificationsService.markAllRead(getUserId(req));
    res.json({ success: true, data: result });
  },

  async clear(req: Request, res: Response) {
    const result = await NotificationsService.clear(getUserId(req));
    res.json({ success: true, data: result });
  },
};