import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { config } from "../config";
import { AppError } from "../middleware/errorHandler";
import { EmailService } from "./email.service";
import { deleteStorageRefs } from "./supabaseStorage";

const EMAIL_VERIFICATION_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const GENERIC_RESET_MESSAGE = "If an account exists for this email, password reset instructions have been sent.";
const GENERIC_VERIFICATION_MESSAGE = "If an unverified account exists for this email, a verification email has been sent.";

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

function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function addMilliseconds(milliseconds: number): Date {
  return new Date(Date.now() + milliseconds);
}

function assertStrongPassword(password: string): void {
  const isStrong =
    password.length >= 10 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  if (!isStrong) {
    throw new AppError(400, "Password must have at least one capital, one lower case, one numeric, one special character, and be minimum 10 characters long.");
  }
}

function buildVerificationLink(rawToken: string): string {
  const url = new URL("/auth/verify-email", config.webAppUrl);
  url.searchParams.set("token", rawToken);
  return url.toString();
}

function buildResetLink(rawToken: string): string {
  const url = new URL("/auth/reset-password", config.webAppUrl);
  url.searchParams.set("token", rawToken);
  return url.toString();
}

export const AuthService = {
  async signup(input: { name: string; email: string; password: string }) {
    const email = normalizeEmail(input.email);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, "An account already exists for this email");
    }

    assertStrongPassword(input.password);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const verificationToken = generateRawToken();
    const hashedVerificationToken = hashToken(verificationToken);
    const name = input.name.trim();

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        isEmailVerified: false,
        emailVerificationToken: hashedVerificationToken,
        emailVerificationExpiry: addMilliseconds(EMAIL_VERIFICATION_TTL_MS),
      },
    });

    await EmailService.sendVerificationEmail({
      to: email,
      name,
      verificationLink: buildVerificationLink(verificationToken),
    });

    return {
      message: "Account created. Check your email to verify your account before signing in.",
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

    if (!user.isEmailVerified) {
      throw new AppError(403, "Email not verified. Please verify your email before signing in.");
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
    const hashedToken = hashToken(token);
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new AppError(400, "Verification link is invalid or expired");
    }

    if (!user.isEmailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
        },
      });
    }

    return {
      message: "Email verified successfully. You can now sign in.",
      email: user.email,
      name: user.name,
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

  async deleteAccount(userId: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
        reviews: {
          select: {
            assets: {
              select: { blobUrl: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, "Password is incorrect");
    }

    const storageRefs = user.reviews.flatMap((review) =>
      review.assets.map((asset) => asset.blobUrl).filter((blobUrl): blobUrl is string => Boolean(blobUrl))
    );

    if (storageRefs.length > 0) {
      try {
        await deleteStorageRefs(storageRefs);
      } catch (error) {
        console.error("[Auth] Failed to delete account storage assets", error);
      }
    }

    await prisma.user.delete({ where: { id: user.id } });
    return { message: "Account deleted permanently" };
  },

  async forgotPassword(emailInput: string) {
    const email = normalizeEmail(emailInput);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: GENERIC_RESET_MESSAGE };
    }

    const resetToken = generateRawToken();
    const hashedToken = hashToken(resetToken);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpiry: addMilliseconds(PASSWORD_RESET_TTL_MS),
      },
    });

    try {
      await EmailService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetLink: buildResetLink(resetToken),
      });
    } catch (error) {
      console.error("[Auth] Failed to send password reset email", error);
    }

    return { message: GENERIC_RESET_MESSAGE };
  },

  async resetPassword(resetToken: string, newPassword: string) {
    assertStrongPassword(newPassword);
    const hashedToken = hashToken(resetToken);

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

  async resendVerification(emailInput: string) {
    const email = normalizeEmail(emailInput);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.isEmailVerified) {
      return { message: GENERIC_VERIFICATION_MESSAGE };
    }

    const verificationToken = generateRawToken();
    const hashedToken = hashToken(verificationToken);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: addMilliseconds(EMAIL_VERIFICATION_TTL_MS),
      },
    });

    try {
      await EmailService.sendVerificationEmail({
        to: user.email,
        name: user.name,
        verificationLink: buildVerificationLink(verificationToken),
      });
    } catch (error) {
      console.error("[Auth] Failed to resend verification email", error);
    }

    return { message: GENERIC_VERIFICATION_MESSAGE };
  },
};
