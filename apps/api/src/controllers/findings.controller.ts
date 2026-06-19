import { Request, Response } from "express";
import { FindingsService } from "../services/findings.service";
import {
  FindingsQuerySchema,
  TriageFindingSchema,
  UpdateFindingSchema,
  EscalateFindingSchema,
} from "@uxm/shared";

export const FindingsController = {
  async getByReview(req: Request, res: Response) {
    const query = FindingsQuerySchema.parse(req.query);
    const result = await FindingsService.getByReview(req.params.id as string, query);
    res.json({ success: true, data: result });
  },

  async getGroupedByArea(req: Request, res: Response) {
    const result = await FindingsService.getGroupedByArea(req.params.id as string);
    res.json({ success: true, data: result });
  },

  async getNextUntriaged(req: Request, res: Response) {
    const finding = await FindingsService.getNextUntriaged(req.params.id as string);
    res.json({ success: true, data: finding });
  },

  async triage(req: Request, res: Response) {
    const payload = TriageFindingSchema.parse(req.body);
    const finding = await FindingsService.triage(req.params.id as string, payload);
    res.json({ success: true, data: finding });
  },

  async update(req: Request, res: Response) {
    const payload = UpdateFindingSchema.parse(req.body);
    const finding = await FindingsService.update(req.params.id as string, payload);
    res.json({ success: true, data: finding });
  },

  async escalate(req: Request, res: Response) {
    const { reason } = EscalateFindingSchema.parse(req.body);
    const finding = await FindingsService.escalate(req.params.id as string, reason);
    res.json({ success: true, data: finding });
  },

  async getRecurring(_req: Request, res: Response) {
    const result = await FindingsService.getRecurring();
    res.json({ success: true, data: result });
  },
};
