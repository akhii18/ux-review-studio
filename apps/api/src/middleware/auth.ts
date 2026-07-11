import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../config/prisma";
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

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = getTokenFromRequest(req);
  if (!token) {
    throw new AppError(401, "Authentication required");
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as Express.UserTokenPayload;
    if (!payload?.sub) {
      throw new AppError(401, "Invalid authentication token");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isEmailVerified: true },
    });

    if (!user) {
      throw new AppError(401, "Invalid authentication token");
    }

    if (!user.isEmailVerified) {
      throw new AppError(403, "Email not verified. Please verify your email before continuing.");
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
