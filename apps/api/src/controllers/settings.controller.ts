import { Request, Response } from "express";
import { SettingsService } from "../services/settings.service";
import { UpdateSettingsSchema } from "@uxm/shared";
import { AppError } from "../middleware/errorHandler";

function getUserId(req: Request): string {
  const userId = req.user?.sub;
  if (!userId) throw new AppError(401, "Authentication required");
  return userId;
}

export const SettingsController = {
  async get(req: Request, res: Response) {
    const data = await SettingsService.get(getUserId(req));
    res.json({ success: true, data });
  },

  async update(req: Request, res: Response) {
    const payload = UpdateSettingsSchema.parse(req.body);
    const data = await SettingsService.update(getUserId(req), payload);
    res.json({ success: true, data });
  },
};
