import { SettingsRepository } from "../repositories/settings.repository";
import type { UpdateSettings } from "@uxm/shared";
import { DEFAULT_SETTINGS } from "@uxm/shared";

export const SettingsService = {
  async get(userId: string) {
    const current = await SettingsRepository.getAll(userId);
    return { ...DEFAULT_SETTINGS, ...current };
  },

  async update(userId: string, data: UpdateSettings) {
    const updates = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    );
    return SettingsRepository.upsertMany(userId, updates);
  },
};
