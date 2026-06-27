import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { AppError } from "./errorHandler";

function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const tokenCookie = cookieHeader
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith("token="));

  if (!tokenCookie) return null;
  return decodeURIComponent(tokenCookie.slice("token=".length));
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = getTokenFromRequest(req);
  if (!token) {
    throw new AppError(401, "Authentication required");
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as Express.UserTokenPayload;
    if (!payload?.sub) {
      throw new AppError(401, "Invalid authentication token");
    }

    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(401, "Invalid or expired authentication token");
  }
}
