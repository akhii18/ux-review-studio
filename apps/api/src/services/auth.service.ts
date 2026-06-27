import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { config } from "../config";
import { AppError } from "../middleware/errorHandler";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function signUserToken(user: { id: string; email: string; name: string }): string {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresInSeconds }
  );
}

export const AuthService = {
  async signup(input: { name: string; email: string; password: string }) {
    const email = normalizeEmail(input.email);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, "An account already exists for this email");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash,
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    return {
      message: "Account created successfully.",
    };
  },

  async signin(input: { email: string; password: string }) {
    const email = normalizeEmail(input.email);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(401, "Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, "Invalid email or password");
    }

    const token = signUserToken(user);
    return {
      token,
      expiresInSeconds: config.jwtExpiresInSeconds,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  },

  async verifyEmail(token: string) {
    return {
      message: "Email verification is disabled for now.",
      email: "",
      name: "",
    };
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    return user;
  },

  async updateMe(userId: string, name: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    const token = signUserToken(user);
    return {
      token,
      expiresInSeconds: config.jwtExpiresInSeconds,
      user,
    };
  },

  async forgotPassword(emailInput: string) {
    throw new AppError(503, "Forgot password is disabled for now.");
  },

  async resetPassword(resetToken: string, newPassword: string) {
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new AppError(400, "Reset token is invalid or expired");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
      },
    });

    return { message: "Password updated successfully" };
  },
};
