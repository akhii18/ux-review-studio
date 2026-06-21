import { SettingsRepository } from "../repositories/settings.repository";
import type { UpdateSettings } from "@uxm/shared";

export const SettingsService = {
  async get() {
    return SettingsRepository.getAll();
  },

  async update(data: UpdateSettings) {
    const updates = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    );
    return SettingsRepository.upsertMany(updates);
  },
};
