import { Request, Response } from "express";
import { ChecklistsService } from "../services/checklists.service";
import {
  CreateChecklistSchema,
  UpdateChecklistSchema,
  ApproveChecklistSchema,
} from "@uxm/shared";

export const ChecklistsController = {
  async getAll(_req: Request, res: Response) {
    const data = await ChecklistsService.getAll();
    res.json({ success: true, data });
  },

  async getById(req: Request, res: Response) {
    const data = await ChecklistsService.getById(req.params.id as string);
    res.json({ success: true, data });
  },

  async create(req: Request, res: Response) {
    const payload = CreateChecklistSchema.parse(req.body);
    const data = await ChecklistsService.create(payload);
    res.status(201).json({ success: true, data });
  },

  async update(req: Request, res: Response) {
    const payload = UpdateChecklistSchema.parse(req.body);
    const performedBy = (req.headers["x-user"] as string) ?? "user";
    const data = await ChecklistsService.update(req.params.id as string, payload, performedBy);
    res.json({ success: true, data });
  },

  async approve(req: Request, res: Response) {
    const { approvedBy } = ApproveChecklistSchema.parse(req.body);
    const data = await ChecklistsService.approve(req.params.id as string, approvedBy);
    res.json({ success: true, data });
  },
};
