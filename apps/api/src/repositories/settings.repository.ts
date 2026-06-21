import { prisma } from "../config/prisma";

export const SettingsRepository = {
  async getAll(): Promise<Record<string, unknown>> {
    const rows = await prisma.setting.findMany();
    return Object.fromEntries(rows.map((r: (typeof rows)[number]) => [r.key, r.value]));
  },

  async upsertMany(updates: Record<string, unknown>) {
    await prisma.$transaction(
      Object.entries(updates).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value: value as never },
          create: { key, value: value as never },
        })
      )
    );
    return this.getAll();
  },
};
