import { EmailClient, type EmailAttachment, type EmailMessage } from "@azure/communication-email";
import { config } from "../config";
import { AppError } from "../middleware/errorHandler";

const ACS_EMAIL_API_VERSION = "2023-03-31";

function getEmailClient() {
  const connectionString = config.azureCommunicationEmailConnectionString;
  if (!connectionString) {
    throw new AppError(500, "AZURE_COMMUNICATION_EMAIL_CONNECTION_STRING is not configured on the server");
  }

  return new EmailClient(connectionString, { apiVersion: ACS_EMAIL_API_VERSION } as unknown as ConstructorParameters<typeof EmailClient>[1]);
}

function getSenderAddress() {
  const senderAddress = config.azureCommunicationEmailSenderAddress;
  if (!senderAddress) {
    throw new AppError(500, "AZURE_COMMUNICATION_EMAIL_SENDER_ADDRESS is not configured on the server");
  }

  return senderAddress;
}

async function sendEmail(input: {
  to: string[];
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachment[];
}) {
  const message: EmailMessage = {
    senderAddress: getSenderAddress(),
    recipients: {
      to: input.to.map((address) => ({ address })),
    },
    content: {
      subject: input.subject,
      plainText: input.text,
      html: input.html,
    },
    attachments: input.attachments,
  };

  try {
    const poller = await getEmailClient().beginSend(message);
    await poller.pollUntilDone();
  } catch (err) {
    const statusCode = typeof (err as { statusCode?: unknown }).statusCode === "number" ? (err as { statusCode: number }).statusCode : 502;
    const code = typeof (err as { code?: unknown }).code === "string" ? (err as { code: string }).code : "Unknown";
    const message = code === "Denied" || statusCode === 401
      ? "Azure Communication Services Email rejected the send request with 401 Denied before mailbox delivery. The configured Communication Service resource/key is not authorized to send as the configured sender address; recipient allow-listing in Outlook will not affect this error."
      : "Azure Communication Services Email failed to send the message.";
    throw new AppError(statusCode >= 400 && statusCode < 600 ? statusCode : 502, message);
  }
}

async function fetchInlineAttachmentFromUrl(url: string): Promise<EmailAttachment | null> {
  const response = await fetch(url);
  if (!response.ok) return null;

  const contentType = response.headers.get("content-type") ?? "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    name: "screenshot.png",
    contentType,
    contentInBase64: buffer.toString("base64"),
    contentId: "screenshot",
  };
}

export const EmailService = {
  async sendVerificationEmail(input: { to: string; name: string; verificationLink: string }) {
    await sendEmail({
      to: [input.to],
      subject: "Verify your UX Review Studio account",
      text: [
        `Hello ${input.name},`,
        "",
        "Please verify your email address by clicking the link below:",
        input.verificationLink,
        "",
        "This link expires in 1 hour.",
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
          <p>This link expires in 1 hour.</p>
        </div>
      `,
    });
  },

  async sendPasswordResetEmail(input: { to: string; name: string; resetLink: string }) {
    await sendEmail({
      to: [input.to],
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

  async sendEscalationEmail(input: {
    to: string[];
    escalatorName: string;
    escalatorEmail: string;
    finding: {
      title: string;
      severity: string;
      area: string;
      description?: string;
      observation?: string;
      why?: string;
      recommendation?: string;
      reviewBasis?: Array<{ type: string; name: string; explanation?: string }>;
      businessImpact?: string;
      a11yImpact?: string;
      confidence?: number;
      aiMetadata?: {
        acceptanceCriteria?: string[];
        wcagCriteria?: string;
        requirementTraceability?: string;
      } | null;
    };
    reviewName: string;
    reason: string;
    workspaceLink: string;
    screenshotUrl?: string;
    screenshotBase64?: string;
    screenshotMimeType?: string;
  }) {
    const attachments: EmailAttachment[] = [];
    let imageHtml = "";

    if (input.screenshotBase64 && input.screenshotMimeType) {
      attachments.push({
        name: "screenshot.png",
        contentType: input.screenshotMimeType,
        contentInBase64: input.screenshotBase64,
        contentId: "screenshot",
      });
      imageHtml = `
        <div style="margin-top: 24px; padding: 12px; border: 1px dashed #d1d5db; border-radius: 8px; background-color: #f9fafb; text-align: center;">
          <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #4b5563; text-align: left;">VISUAL CONTEXT</p>
          <img src="cid:screenshot" style="max-width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" alt="Screenshot of the issue" />
        </div>
      `;
    } else if (input.screenshotUrl) {
      const attachment = await fetchInlineAttachmentFromUrl(input.screenshotUrl);
      if (attachment) attachments.push(attachment);
      imageHtml = `
        <div style="margin-top: 24px; padding: 12px; border: 1px dashed #d1d5db; border-radius: 8px; background-color: #f9fafb; text-align: center;">
          <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: #4b5563; text-align: left;">VISUAL CONTEXT</p>
          <img src="cid:screenshot" style="max-width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" alt="Screenshot of the issue" />
        </div>
      `;
    }

    const severityBg = input.finding.severity === "P0" ? "#fee2e2" : input.finding.severity === "P1" ? "#fef3c7" : "#f3f4f6";
    const severityColor = input.finding.severity === "P0" ? "#991b1b" : input.finding.severity === "P1" ? "#92400e" : "#1f2937";

    const renderBasis = (): string => {
      const basis = input.finding.reviewBasis;
      if (!basis || basis.length === 0) return "";
      const items = basis.map(b => `
        <div style="padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; background-color: #f9fafb; margin-bottom: 6px;">
          <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 0.03em;">${b.type}</span>
          <p style="margin: 2px 0 0 0; font-size: 13px; font-weight: 600; color: #111827;">${b.name}</p>
          ${b.explanation ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #4b5563; line-height: 1.4;">${b.explanation}</p>` : ""}
        </div>
      `).join("");
      return `
        <div style="margin-top: 20px;">
          <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; color: #4b5563; text-transform: uppercase; letter-spacing: 0.05em;">Review Basis</p>
          ${items}
        </div>
      `;
    };

    const renderAcceptanceCriteria = (): string => {
      const criteria = input.finding.aiMetadata?.acceptanceCriteria;
      if (!criteria || criteria.length === 0) return "";
      const items = criteria.map(c => `<li style="margin-bottom: 4px;">${c}</li>`).join("");
      return `
        <div style="margin-top: 16px; font-size: 14px;">
          <p style="margin: 0 0 6px 0; font-weight: 600; color: #4b5563;">Acceptance Criteria:</p>
          <ul style="margin: 0; padding-left: 20px; color: #1f2937;">${items}</ul>
        </div>
      `;
    };

    const htmlContent = `
      <div style="font-family: 'Inter', 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; margin-bottom: 20px;">
          <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #ffffff; background-color: #0A0838; border-radius: 4px;">Escalated Finding</span>
          <h2 style="margin: 8px 0 0 0; font-size: 20px; font-weight: 700; color: #0A0838;">UX Review Escalation Required</h2>
        </div>

        <div style="padding: 16px; border-left: 4px solid #0A0838; background-color: #f6f2ea; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">Escalated by: <span style="font-weight: normal; color: #4d4d4f;">${input.escalatorName} (${input.escalatorEmail})</span></p>
          <p style="margin: 8px 0 0 0; font-size: 14px; font-weight: 600; color: #111827;">Review: <span style="font-weight: normal; color: #4d4d4f;">${input.reviewName}</span></p>
          <div style="margin-top: 12px; font-style: italic; color: #1f2937; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 13.5px; line-height: 1.5;">
            "${input.reason}"
          </div>
        </div>

        <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">Finding Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #4b5563; width: 140px; vertical-align: top;">Title</td>
            <td style="padding: 6px 0; color: #111827; font-weight: 600;">${input.finding.title}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #4b5563; vertical-align: top;">Severity</td>
            <td style="padding: 6px 0;">
              <span style="display: inline-block; padding: 2px 8px; font-size: 11px; font-weight: 700; border-radius: 4px; background-color: ${severityBg}; color: ${severityColor};">${input.finding.severity}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #4b5563; vertical-align: top;">Review Area</td>
            <td style="padding: 6px 0; color: #111827; text-transform: capitalize;">${input.finding.area.toLowerCase().replace(/_/g, " ")}</td>
          </tr>
          ${typeof input.finding.confidence === "number" ? `
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #4b5563; vertical-align: top;">AI Confidence</td>
            <td style="padding: 6px 0; color: #111827;">${input.finding.confidence}%</td>
          </tr>
          ` : ""}
        </table>

        <div style="font-size: 14px; margin-bottom: 20px; line-height: 1.5;">
          ${imageHtml}

          <p style="margin: 0 0 4px 0; font-weight: 600; color: #4b5563;">Observation:</p>
          <p style="margin: 0 0 16px 0; color: #1f2937;">${input.finding.observation || input.finding.description || "—"}</p>

          ${input.finding.why ? `
          <p style="margin: 0 0 4px 0; font-weight: 600; color: #4b5563;">Why it matters:</p>
          <p style="margin: 0 0 16px 0; color: #1f2937; font-style: italic;">${input.finding.why}</p>
          ` : ""}

          ${input.finding.recommendation ? `
          <p style="margin: 0 0 4px 0; font-weight: 600; color: #4b5563;">Recommendation:</p>
          <p style="margin: 0 0 16px 0; color: #1f2937;">${input.finding.recommendation}</p>
          ` : ""}

          ${renderAcceptanceCriteria()}

          ${input.finding.aiMetadata?.requirementTraceability ? `
          <p style="margin: 16px 0 4px 0; font-weight: 600; color: #4b5563;">Requirement Traceability:</p>
          <p style="margin: 0 0 16px 0; color: #1f2937;">${input.finding.aiMetadata.requirementTraceability}</p>
          ` : ""}

          ${input.finding.aiMetadata?.wcagCriteria ? `
          <p style="margin: 16px 0 4px 0; font-weight: 600; color: #4b5563;">WCAG Criterion:</p>
          <p style="margin: 0 0 16px 0; color: #1f2937;">${input.finding.aiMetadata.wcagCriteria}</p>
          ` : ""}

          ${input.finding.businessImpact ? `
          <p style="margin: 16px 0 4px 0; font-weight: 600; color: #4b5563;">Business Impact:</p>
          <p style="margin: 0 0 16px 0; color: #1f2937;">${input.finding.businessImpact}</p>
          ` : ""}

          ${input.finding.a11yImpact ? `
          <p style="margin: 16px 0 4px 0; font-weight: 600; color: #4b5563;">Accessibility Impact:</p>
          <p style="margin: 0 0 16px 0; color: #1f2937;">${input.finding.a11yImpact}</p>
          ` : ""}
        </div>

        ${renderBasis()}

        <div style="margin-top: 32px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 24px;">
          <a href="${input.workspaceLink}" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #ffffff; background-color: #0A0838; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            View Finding in Workspace
          </a>
        </div>
      </div>
    `;

    await sendEmail({
      to: input.to,
      subject: `[Escalation Required] UX Finding: "${input.finding.title}" in "${input.reviewName}"`,
      text: [
        `UX Finding Escalation Notice`,
        `===========================`,
        `Escalated by: ${input.escalatorName} (${input.escalatorEmail})`,
        `Review: ${input.reviewName}`,
        `Reason: "${input.reason}"`,
        ``,
        `FINDING DETAILS`,
        `Title: ${input.finding.title}`,
        `Severity: ${input.finding.severity}`,
        `Area: ${input.finding.area}`,
        `Observation: ${input.finding.observation || input.finding.description || "—"}`,
        input.finding.why ? `Why it matters: ${input.finding.why}` : "",
        input.finding.recommendation ? `Recommendation: ${input.finding.recommendation}` : "",
        ``,
        `View finding: ${input.workspaceLink}`,
      ].filter(Boolean).join("\n"),
      html: htmlContent,
      attachments,
    });
  },
};
