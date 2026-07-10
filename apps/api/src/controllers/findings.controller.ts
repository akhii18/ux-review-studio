import { Request, Response } from "express";
import { FindingsService } from "../services/findings.service";
import {
  FindingsQuerySchema,
  TriageFindingSchema,
  UpdateFindingSchema,
  EscalateFindingSchema,
} from "@uxm/shared";
import { AppError } from "../middleware/errorHandler";

function getUserId(req: Request): string {
  const userId = req.user?.sub;
  if (!userId) throw new AppError(401, "Authentication required");
  return userId;
}

export const FindingsController = {
  async getByReview(req: Request, res: Response) {
    const query = FindingsQuerySchema.parse(req.query);
    const result = await FindingsService.getByReview(req.params.id as string, getUserId(req), query);
    res.json({ success: true, data: result });
  },

  async getGroupedByArea(req: Request, res: Response) {
    const result = await FindingsService.getGroupedByArea(req.params.id as string, getUserId(req));
    res.json({ success: true, data: result });
  },

  async getNextUntriaged(req: Request, res: Response) {
    const finding = await FindingsService.getNextUntriaged(req.params.id as string, getUserId(req));
    res.json({ success: true, data: finding });
  },

  async triage(req: Request, res: Response) {
    const payload = TriageFindingSchema.parse(req.body);
    const finding = await FindingsService.triage(req.params.id as string, getUserId(req), payload);
    res.json({ success: true, data: finding });
  },

  async update(req: Request, res: Response) {
    const payload = UpdateFindingSchema.parse(req.body);
    const finding = await FindingsService.update(req.params.id as string, getUserId(req), payload);
    res.json({ success: true, data: finding });
  },

  async escalate(req: Request, res: Response) {
    const { emails, recipients, reason } = EscalateFindingSchema.parse(req.body);
    const finding = await FindingsService.escalate(req.params.id as string, getUserId(req), emails, reason, recipients);
    res.json({ success: true, data: finding });
  },

  async getRecurring(req: Request, res: Response) {
    const result = await FindingsService.getRecurring(getUserId(req));
    res.json({ success: true, data: result });
  },
};
