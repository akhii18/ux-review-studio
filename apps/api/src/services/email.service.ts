import nodemailer from "nodemailer";
import { config } from "../config";
import { AppError } from "../middleware/errorHandler";

function getTransporter() {
  const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass } = config;
  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new AppError(500, "SMTP is not configured on the server");
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

export const EmailService = {
  async sendVerificationEmail(input: { to: string; name: string; verificationLink: string }) {
    const from = config.smtpFrom;
    if (!from) {
      throw new AppError(500, "SMTP_FROM is not configured on the server");
    }

    const transporter = getTransporter();

    await transporter.sendMail({
      from,
      to: input.to,
      subject: "Verify your UX Review Studio account",
      text: [
        `Hello ${input.name},`,
        "",
        "Please verify your email address by clicking the link below:",
        input.verificationLink,
        "",
        "This link expires in 24 hours.",
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
          <p>Hello ${input.name},</p>
          <p>Please verify your email address by clicking the button below:</p>
          <p>
            <a href="${input.verificationLink}" style="display:inline-block;padding:10px 16px;background:#12083c;color:#ffffff;text-decoration:none;border-radius:8px;">
              Verify Email
            </a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <p><a href="${input.verificationLink}">${input.verificationLink}</a></p>
          <p>This link expires in 24 hours.</p>
        </div>
      `,
    });
  },

  async sendPasswordResetEmail(input: { to: string; name: string; resetLink: string }) {
    const from = config.smtpFrom;
    if (!from) {
      throw new AppError(500, "SMTP_FROM is not configured on the server");
    }

    const transporter = getTransporter();

    await transporter.sendMail({
      from,
      to: input.to,
      subject: "Reset your UX Review Studio password",
      text: [
        `Hello ${input.name},`,
        "",
        "You requested a password reset. Use the link below to set a new password:",
        input.resetLink,
        "",
        "This link expires in 1 hour. If you did not request this, you can ignore this email.",
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
          <p>Hello ${input.name},</p>
          <p>You requested a password reset. Click the button below to set a new password:</p>
          <p>
            <a href="${input.resetLink}" style="display:inline-block;padding:10px 16px;background:#12083c;color:#ffffff;text-decoration:none;border-radius:8px;">
              Reset Password
            </a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <p><a href="${input.resetLink}">${input.resetLink}</a></p>
          <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });
  },
};
