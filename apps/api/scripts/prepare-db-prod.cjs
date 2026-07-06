const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function hasMigrations() {
  const migrationsDir = path.resolve(process.cwd(), "prisma", "migrations");
  if (!fs.existsSync(migrationsDir)) return false;

  const entries = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."));

  return entries.length > 0;
}

function main() {
  console.log("[db:prepare:prod] Generating Prisma client...");
  run("npx", ["prisma", "generate"]);

  if (hasMigrations()) {
    console.log("[db:prepare:prod] Applying Prisma migrations...");
    run("npx", ["prisma", "migrate", "deploy"]);
    return;
  }

  console.warn("[db:prepare:prod] No migrations directory found; syncing schema with prisma db push.");
  run("npx", ["prisma", "db", "push", "--skip-generate"]);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[db:prepare:prod] Failed:", message);
  process.exit(1);
}
