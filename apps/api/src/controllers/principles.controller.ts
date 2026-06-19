import { Request, Response } from "express";
import { PrinciplesService } from "../services/principles.service";
import { CreatePrincipleSchema, UpdatePrincipleSchema } from "@uxm/shared";

export const PrinciplesController = {
  async getAll(req: Request, res: Response) {
    const category = req.query.category as string | undefined;
    const enabled =
      req.query.enabled === "true" ? true : req.query.enabled === "false" ? false : undefined;
    const data = await PrinciplesService.getAll(category, enabled);
    res.json({ success: true, data });
  },

  async create(req: Request, res: Response) {
    const payload = CreatePrincipleSchema.parse(req.body);
    const data = await PrinciplesService.create(payload);
    res.status(201).json({ success: true, data });
  },

  async update(req: Request, res: Response) {
    const payload = UpdatePrincipleSchema.parse(req.body);
    const data = await PrinciplesService.update(req.params.id as string, payload);
    res.json({ success: true, data });
  },
};
