import { prisma } from "../config/prisma";

export const SettingsRepository = {
  async getAll(userId: string): Promise<Record<string, unknown>> {
    const rows = await prisma.setting.findMany({ where: { userId } });
    return Object.fromEntries(rows.map((r: (typeof rows)[number]) => [r.key, r.value]));
  },

  async upsertMany(userId: string, updates: Record<string, unknown>) {
    await prisma.$transaction(
      Object.entries(updates).map(([key, value]) =>
        prisma.setting.upsert({
          where: { userId_key: { userId, key } },
          update: { value: value as never },
          create: { userId, key, value: value as never },
        })
      )
    );
    return this.getAll(userId);
  },
};
