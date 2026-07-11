import type { Request, Response } from "express";
import { z } from "zod";
import { AuthService } from "../services/auth.service";
import { AppError } from "../middleware/errorHandler";

const SignupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(10),
});

const SigninSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

const ResendVerificationSchema = z.object({
  email: z.string().email(),
});

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(10),
});

const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});

const UpdateMeSchema = z.object({
  name: z.string().min(1).optional(),
  avatarDataUrl: z.string().max(1_500_000).nullable().optional(),
});

const DeleteAccountSchema = z.object({
  password: z.string().min(1),
});

export const AuthController = {
  async signup(req: Request, res: Response) {
    const payload = SignupSchema.parse(req.body);
    const result = await AuthService.signup(payload);
    res.status(201).json({ success: true, data: result });
  },

  async signin(req: Request, res: Response) {
    const payload = SigninSchema.parse(req.body);
    const result = await AuthService.signin(payload);
    res.json({ success: true, data: result });
  },

  async me(req: Request, res: Response) {
    if (!req.user?.sub) {
      throw new AppError(401, "Authentication required");
    }

    const result = await AuthService.me(req.user.sub);
    res.json({ success: true, data: result });
  },

  async updateMe(req: Request, res: Response) {
    if (!req.user?.sub) {
      throw new AppError(401, "Authentication required");
    }

    const payload = UpdateMeSchema.parse(req.body);
    const result = await AuthService.updateMe(req.user.sub, payload);
    res.json({ success: true, data: result });
  },

  async deleteAccount(req: Request, res: Response) {
    if (!req.user?.sub) {
      throw new AppError(401, "Authentication required");
    }

    const payload = DeleteAccountSchema.parse(req.body);
    const result = await AuthService.deleteAccount(req.user.sub, payload.password);
    res.json({ success: true, data: result });
  },

  async forgotPassword(req: Request, res: Response) {
    const payload = ForgotPasswordSchema.parse(req.body);
    const result = await AuthService.forgotPassword(payload.email);
    res.json({ success: true, data: result });
  },

  async resendVerification(req: Request, res: Response) {
    const payload = ResendVerificationSchema.parse(req.body);
    const result = await AuthService.resendVerification(payload.email);
    res.json({ success: true, data: result });
  },

  async resetPassword(req: Request, res: Response) {
    const payload = ResetPasswordSchema.parse(req.body);
    const result = await AuthService.resetPassword(payload.token, payload.password);
    res.json({ success: true, data: result });
  },

  async verifyEmail(req: Request, res: Response) {
    const payload = VerifyEmailSchema.parse(req.query);
    const result = await AuthService.verifyEmail(payload.token);
    res.json({ success: true, data: result });
  },
};
