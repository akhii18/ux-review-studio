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
