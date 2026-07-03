import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err.name === "PrismaClientInitializationError") {
    res.status(503).json({
      success: false,
      error: "Database connection is unavailable. Check DATABASE_URL and Supabase project status.",
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: "Validation error",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, error: err.message });
    return;
  }

  console.error("[API Error]", err);
  res.status(500).json({ success: false, error: "Internal server error" });
}
