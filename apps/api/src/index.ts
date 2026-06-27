import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import fs from "fs";
import path from "path";

// Setup server log mirroring
const logFilePath = path.join(process.cwd(), "api.log");
const logStream = fs.createWriteStream(logFilePath, { flags: "a" });

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args) => {
  originalLog(...args);
  logStream.write(`[LOG] [${new Date().toISOString()}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(" ")}\n`);
};

console.error = (...args) => {
  originalError(...args);
  logStream.write(`[ERROR] [${new Date().toISOString()}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(" ")}\n`);
};

console.warn = (...args) => {
  originalWarn(...args);
  logStream.write(`[WARN] [${new Date().toISOString()}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(" ")}\n`);
};

import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import { requireAuth } from "./middleware/auth";

import authRouter from "./routes/auth.routes";
import reviewsRouter from "./routes/reviews.routes";
import findingsRouter from "./routes/findings.routes";
import checklistsRouter from "./routes/checklists.routes";
import principlesRouter from "./routes/principles.routes";
import settingsRouter from "./routes/settings.routes";

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: config.nodeEnv === "development" ? true : config.corsOrigin,
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: "50mb" }));

app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev", {
  stream: {
    write: (message) => {
      process.stdout.write(message);
      logStream.write(`[HTTP] [${new Date().toISOString()}] ${message}`);
    }
  }
}));

// ── Health check ───────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", env: config.nodeEnv });
});

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);

app.use("/api", requireAuth);
app.use("/api/reviews", reviewsRouter);
app.use("/api/findings", findingsRouter);
app.use("/api/checklists", checklistsRouter);
app.use("/api/principles", principlesRouter);
app.use("/api/settings", settingsRouter);

// ── 404 ────────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ── Error handler ──────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`✅ UXM Co-Pilot API running on http://localhost:${config.port}`);
});

export default app;
