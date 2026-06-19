import { Request, Response } from "express";
import { SettingsService } from "../services/settings.service";
import { UpdateSettingsSchema } from "@uxm/shared";

export const SettingsController = {
  async get(_req: Request, res: Response) {
    const data = await SettingsService.get();
    res.json({ success: true, data });
  },

  async update(req: Request, res: Response) {
    const payload = UpdateSettingsSchema.parse(req.body);
    const data = await SettingsService.update(payload);
    res.json({ success: true, data });
  },
};
