import { Request, Response } from "express";
import { ChecklistsService } from "../services/checklists.service";
import {
  CreateChecklistSchema,
  UpdateChecklistSchema,
  ApproveChecklistSchema,
} from "@uxm/shared";
import { AppError } from "../middleware/errorHandler";

function getUserId(req: Request): string {
  const userId = req.user?.sub;
  if (!userId) throw new AppError(401, "Authentication required");
  return userId;
}

export const ChecklistsController = {
  async getAll(req: Request, res: Response) {
    const data = await ChecklistsService.getAll(getUserId(req));
    res.json({ success: true, data });
  },

  async getById(req: Request, res: Response) {
    const data = await ChecklistsService.getById(req.params.id as string, getUserId(req));
    res.json({ success: true, data });
  },

  async create(req: Request, res: Response) {
    const payload = CreateChecklistSchema.parse(req.body);
    const data = await ChecklistsService.create(getUserId(req), payload);
    res.status(201).json({ success: true, data });
  },

  async update(req: Request, res: Response) {
    const payload = UpdateChecklistSchema.parse(req.body);
    const performedBy = (req.headers["x-user"] as string) ?? "user";
    const data = await ChecklistsService.update(req.params.id as string, getUserId(req), payload, performedBy);
    res.json({ success: true, data });
  },

  async approve(req: Request, res: Response) {
    const { approvedBy } = ApproveChecklistSchema.parse(req.body);
    const data = await ChecklistsService.approve(req.params.id as string, getUserId(req), approvedBy);
    res.json({ success: true, data });
  },
};
