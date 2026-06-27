import { PrismaClient } from "@prisma/client";
import { REVIEW_BASIS_LIBRARY, DEFAULT_SETTINGS } from "../../../packages/shared/src/constants";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database…");

  const seedUserEmail = "default.user@uxreview.local";
  const seedUser = await prisma.user.upsert({
    where: { email: seedUserEmail },
    update: {},
    create: {
      name: "Default User",
      email: seedUserEmail,
      passwordHash: await bcrypt.hash("ChangeMe123!", 12),
    },
  });

  // ── UX Principles ──────────────────────────────────────────────────────────
  console.log("  → Seeding UX principles…");
  for (const seed of REVIEW_BASIS_LIBRARY) {
    await prisma.uxPrinciple.upsert({
      where: { name: seed.name },
      update: {},
      create: {
        name: seed.name,
        description: seed.explanation,
        category: seed.category,
        source: seed.type,
        enabled: true,
        isCustom: false,
      },
    });
  }

  // ── Default Settings ────────────────────────────────────────────────────────
  console.log("  → Seeding default settings…");
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({
      where: { userId_key: { userId: seedUser.id, key } },
      update: {},
      create: { userId: seedUser.id, key, value },
    });
  }

  // ── Sample Checklist ───────────────────────────────────────────────────────
  console.log("  → Seeding sample checklist…");
  const existing = await prisma.checklist.findFirst({
    where: { userId: seedUser.id, title: "Baseline UX Governance" },
  });
  if (!existing) {
    await prisma.checklist.create({
      data: {
        userId: seedUser.id,
        title: "Baseline UX Governance",
        description: "Standard checklist applied to every review. Covers heuristics, accessibility, and content quality.",
        status: "APPROVED",
        version: 1,
        approvedBy: "System",
        approvedAt: new Date(),
        items: {
          create: [
            { label: "Visibility of system status is clear", area: "USABILITY", required: true, order: 0 },
            { label: "All interactive elements have a visible focus state", area: "ACCESSIBILITY", required: true, order: 1 },
            { label: "Text contrast meets WCAG AA (4.5:1)", area: "ACCESSIBILITY", required: true, order: 2 },
            { label: "Spacing follows the 8pt grid", area: "CONSISTENCY", required: false, order: 3 },
            { label: "Button labels start with a verb", area: "CONTENT_UX", required: true, order: 4 },
            { label: "Error messages are plain-language and actionable", area: "CONTENT_UX", required: true, order: 5 },
          ],
        },
        history: {
          create: [
            { action: "APPROVED", performedBy: "System", notes: "Initial approved baseline" },
          ],
        },
      },
    });
  }

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
