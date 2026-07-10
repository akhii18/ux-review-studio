const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: options.shell ?? process.platform === "win32",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function findUp(startDir, relativePath) {
  let currentDir = path.resolve(startDir);

  while (true) {
    const candidate = path.join(currentDir, relativePath);
    if (fs.existsSync(candidate)) return candidate;

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) return null;
    currentDir = parentDir;
  }
}

function runPrisma(args) {
  const prismaCli = findUp(process.cwd(), path.join("node_modules", "prisma", "build", "index.js"));
  if (!prismaCli) {
    throw new Error(`Unable to find Prisma CLI from ${process.cwd()}`);
  }

  run(process.execPath, [prismaCli, ...args], { shell: false });
}

function hasMigrations() {
  const migrationsDir = path.resolve(process.cwd(), "prisma", "migrations");
  if (!fs.existsSync(migrationsDir)) return false;

  const entries = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."));

  return entries.length > 0;
}

async function applyNonDestructiveFallbackSchema() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  try {
    console.log("[db:prepare:prod] Ensuring findings.bboxRefs exists without dropping existing columns...");
    await prisma.$executeRawUnsafe('ALTER TABLE "findings" ADD COLUMN IF NOT EXISTS "bboxRefs" JSONB');

    console.log("[db:prepare:prod] Ensuring auth verification/reset fields and indexes exist...");
    await prisma.$executeRawUnsafe('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isEmailVerified" BOOLEAN NOT NULL DEFAULT false');
    await prisma.$executeRawUnsafe('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerificationExpiry" TIMESTAMP(3)');
    await prisma.$executeRawUnsafe('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetPasswordToken" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetPasswordExpiry" TIMESTAMP(3)');
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "users_emailVerificationToken_idx" ON "users"("emailVerificationToken")');
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "users_resetPasswordToken_idx" ON "users"("resetPasswordToken")');

    if (process.env.VERIFY_LEGACY_USERS_WITHOUT_TOKENS === "true") {
      console.log("[db:prepare:prod] Marking legacy users without pending verification tokens as verified...");
      await prisma.$executeRawUnsafe('UPDATE "users" SET "isEmailVerified" = true WHERE "isEmailVerified" = false AND "emailVerificationToken" IS NULL');
    } else {
      console.log("[db:prepare:prod] Skipping legacy user auto-verification. Set VERIFY_LEGACY_USERS_WITHOUT_TOKENS=true to run it explicitly.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("[db:prepare:prod] Generating Prisma client...");
  runPrisma(["generate"]);

  if (hasMigrations()) {
    console.log("[db:prepare:prod] Applying Prisma migrations...");
    runPrisma(["migrate", "deploy"]);
    return;
  }

  console.warn("[db:prepare:prod] No migrations directory found; skipping destructive prisma db push fallback.");
  await applyNonDestructiveFallbackSchema();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[db:prepare:prod] Failed:", message);
  process.exit(1);
});
