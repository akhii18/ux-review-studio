import { FindingsRepository } from "../repositories/findings.repository";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../config/prisma";
import type { FindingsQuery, UpdateFinding, TriageFinding } from "@uxm/shared";
import { EmailService } from "./email.service";
import { getSignedStorageReadUrl } from "./supabaseStorage";
import { config } from "../config";

const PREDEFINED_ESCALATION_RECIPIENTS = [
  { label: "Rakhee Srivastava - UX Lead", email: "rakhee.srivastava@techmahindra.com" },
  { label: "Durga Vara Mahanthi - Senior UX Reviewer", email: "durgavara.mahanthi@techmahindra.com" },
  { label: "Shivesh Kaushik - Dev Team", email: "sx001194733@techmahindra.com" },
  { label: "Anshuman Biswal - Dev Team", email: "anshuman.biswal@techmahindra.com" },
  { label: "Mohit Mishra - Dev Team", email: "mohit.mishra7@techmahindra.com" },
  { label: "Kamatam Dhanush - Dev Team", email: "kamatam.dhanush@techmahindra.com" },
];

export const FindingsService = {
  async getByReview(reviewId: string, userId: string, query: FindingsQuery) {
    return FindingsRepository.findByReview(reviewId, userId, query);
  },

  async getGroupedByArea(reviewId: string, userId: string) {
    return FindingsRepository.findGroupedByArea(reviewId, userId);
  },

  async getNextUntriaged(reviewId: string, userId: string) {
    const finding = await FindingsRepository.findNextUntriaged(reviewId, userId);
    if (!finding) return null;
    return finding;
  },

  async triage(id: string, userId: string, payload: TriageFinding) {
    const finding = await FindingsRepository.findById(id, userId);
    if (!finding) throw new AppError(404, "Finding not found");

    const statusMap = {
      ACCEPT: "ACCEPTED",
      EDIT: "EDITED",
      DISMISS: "DISMISSED",
      ESCALATE: "ESCALATED",
      FALSE_POSITIVE: "FALSE_POSITIVE",
    } as const;

    const updateData: UpdateFinding = {
      status: statusMap[payload.action],
      ...(payload.title && { title: payload.title }),
      ...(payload.description !== undefined && { description: payload.description }),
      ...(payload.recommendation !== undefined && { recommendation: payload.recommendation }),
      ...(payload.severity && { severity: payload.severity }),
      ...(payload.notes !== undefined && { notes: payload.notes }),
      ...(payload.reviewBasis !== undefined && { reviewBasis: payload.reviewBasis }),
    };

    return FindingsRepository.update(id, updateData);

  },

  async update(id: string, userId: string, data: UpdateFinding) {
    const finding = await FindingsRepository.findById(id, userId);
    if (!finding) throw new AppError(404, "Finding not found");
    return FindingsRepository.update(id, data);
  },

  async escalate(
    id: string,
    userId: string,
    emails: string[],
    reason: string,
    recipients?: Array<{ label: string; email?: string }>,
  ) {
    const finding = await FindingsRepository.findById(id, userId);
    if (!finding) throw new AppError(404, "Finding not found");
    if (finding.status === "ESCALATED") throw new AppError(409, "Finding is already escalated");

    const knownRecipientsByEmail = new Map(PREDEFINED_ESCALATION_RECIPIENTS.map((recipient) => [recipient.email, recipient]));
    const recipientLabels = emails.map((email) => {
      const knownRecipient = knownRecipientsByEmail.get(email.toLowerCase());
      const submittedRecipient = recipients?.find((recipient) => recipient.email?.toLowerCase() === email.toLowerCase());
      return knownRecipient ?? { label: submittedRecipient?.label || email, email };
    });
    const existingAiMetadata = typeof finding.aiMetadata === "object" && finding.aiMetadata !== null && !Array.isArray(finding.aiMetadata)
      ? finding.aiMetadata as Record<string, unknown>
      : {};

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    if (!user) throw new AppError(404, "User not found");

    const review = await prisma.review.findUnique({
      where: { id: finding.reviewId },
      select: { name: true },
    });
    if (!review) throw new AppError(404, "Review not found");

    let screenshotUrl: string | undefined;
    let screenshotBase64: string | undefined;
    let screenshotMimeType: string | undefined;

    if (finding.screen) {
      const assets = await prisma.asset.findMany({
        where: { reviewId: finding.reviewId },
      });
      const stripExtension = (name: string) => name.replace(/\.[^.]+$/, "");
      const cleanFindingScreen = stripExtension(finding.screen).toLowerCase().replace(/\s+/g, " ").trim();
      
      const matchedAsset = assets.find((asset) => {
        const cleanAssetName = stripExtension(asset.name).toLowerCase().replace(/\s+/g, " ").trim();
        return cleanFindingScreen === cleanAssetName || cleanFindingScreen.includes(cleanAssetName) || cleanAssetName.includes(cleanFindingScreen);
      });

      if (matchedAsset) {
        screenshotMimeType = matchedAsset.mimeType;
        if (matchedAsset.blobUrl && matchedAsset.blobUrl.startsWith("data:")) {
          const matches = matchedAsset.blobUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
          if (matches) {
            screenshotMimeType = matches[1];
            screenshotBase64 = matches[2];
          }
        } else if (matchedAsset.blobUrl) {
          const isSupabaseRef = !matchedAsset.blobUrl.startsWith("http://") && !matchedAsset.blobUrl.startsWith("https://");
          screenshotUrl = isSupabaseRef ? await getSignedStorageReadUrl(matchedAsset.blobUrl) : matchedAsset.blobUrl;
        }
      }
    }

    const workspaceLink = `${config.webAppUrl}/workspace?reviewId=${finding.reviewId}&findingId=${finding.id}`;

    await EmailService.sendEscalationEmail({
      to: emails,
      escalatorName: user.name,
      escalatorEmail: user.email,
      finding: {
        title: finding.title,
        severity: finding.severity,
        area: finding.area,
        description: finding.description,
        observation: finding.observation ?? undefined,
        why: finding.why ?? undefined,
        recommendation: finding.recommendation ?? undefined,
        reviewBasis: (finding as any).reviewBasis ?? undefined,
        businessImpact: (finding as any).businessImpact ?? undefined,
        a11yImpact: (finding as any).a11yImpact ?? undefined,
        confidence: (finding as any).confidence ?? undefined,
        aiMetadata: (finding as any).aiMetadata ?? undefined,
      },
      reviewName: review.name,
      reason,
      workspaceLink,
      screenshotUrl,
      screenshotBase64,
      screenshotMimeType,
    });

    const updatedFinding = await FindingsRepository.escalate(id, reason, {
      ...existingAiMetadata,
      escalationRecipients: recipientLabels,
    });

    return updatedFinding;
  },

  async getRecurring(userId: string) {
    return FindingsRepository.findRecurring(userId);
  },

  async addComment(findingId: string, userId: string, text: string, authorName: string = "User") {
    const finding = await FindingsRepository.findById(findingId, userId);
    if (!finding) throw new AppError(404, "Finding not found");
    const comment = await FindingsRepository.createComment(findingId, text, authorName);
    return comment;
  },

  async regenerate(findingId: string, userId: string, userComments?: string[]) {
    const finding = await FindingsRepository.findById(findingId, userId);
    if (!finding) throw new AppError(404, "Finding not found");

    const review = await prisma.review.findUnique({
      where: { id: finding.reviewId },
      include: { assets: true },
    });
    if (!review) throw new AppError(404, "Review not found");

    try {
      const { regenerateSingleFinding, toModelScreenshotDataUrl } = await import("./ai/agentic.js");

      // Get all image assets sorted by creation time
      const imageAssets = review.assets
        .filter((a: any) => a.mimeType.startsWith("image/"))
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      // Find the relevant screenshot for this specific finding
      let relevantScreenshot: string | null = null;

      if (imageAssets.length > 0) {
        // Strategy 1: Match by bboxRefs screenIndex
        let targetAsset: any = null;
        const bboxRefs = Array.isArray(finding.bboxRefs) ? finding.bboxRefs : [];
        if (bboxRefs.length > 0 && typeof (bboxRefs[0] as any)?.screenIndex === "number") {
          const screenIdx = (bboxRefs[0] as any).screenIndex;
          if (screenIdx >= 0 && screenIdx < imageAssets.length) {
            targetAsset = imageAssets[screenIdx];
          }
        }

        // Strategy 2: Match by finding.screen name against asset name
        if (!targetAsset && finding.screen) {
          const findingScreen = finding.screen.toLowerCase().replace(/\.[^.]+$/, "").trim();
          targetAsset = imageAssets.find((a: any) => {
            const assetName = a.name.toLowerCase().replace(/\.[^.]+$/, "").trim();
            return assetName === findingScreen || assetName.includes(findingScreen) || findingScreen.includes(assetName);
          });
        }

        // Fallback: use the first screenshot
        if (!targetAsset) {
          targetAsset = imageAssets[0];
        }

        if (targetAsset) {
          try {
            relevantScreenshot = await toModelScreenshotDataUrl(targetAsset);
          } catch (err) {
            console.warn("Failed to load screenshot for finding regeneration, proceeding without image", err);
          }
        }
      }

      // Build review context (lightweight — no need for full context since the LLM focuses on the finding)
      const reviewContext = [
        `Product: ${review.product}`,
        `Domain: ${review.domain || "N/A"}`,
        `Review: ${review.name}`,
      ].join("\n");

      const refined = await regenerateSingleFinding({
        screenshot: relevantScreenshot,
        originalFinding: {
          title: finding.title,
          description: finding.description ?? null,
          observation: finding.observation ?? null,
          severity: finding.severity,
          area: finding.area,
          screen: finding.screen ?? null,
          principle: finding.principle ?? null,
          why: finding.why ?? null,
          recommendation: finding.recommendation ?? null,
          businessImpact: finding.businessImpact ?? null,
          a11yImpact: finding.a11yImpact ?? null,
          confidence: finding.confidence,
        },
        userComments: userComments ?? [],
        reviewContext,
        reviewDepth: review.depth ?? "standard",
      });

      // Map refined result back to finding DB fields
      const updateData = {
        title: refined.issue.slice(0, 200),
        description: refined.issue,
        recommendation: refined.fix,
        severity: refined.severity,
        observation: refined.issue,
        why: refined.why,
        businessImpact: refined.businessImpact ?? finding.businessImpact ?? undefined,
        a11yImpact: refined.a11yImpact ?? finding.a11yImpact ?? undefined,
        confidence: Math.min(100, Math.max(0, Math.round(refined.confidence * 100))),
        status: "PROPOSED" as const,
      };

      return FindingsRepository.update(findingId, updateData);
    } catch (error) {
      console.error("Regeneration failed for finding", findingId, error);
      throw new AppError(500, "AI regeneration failed. Please try again.");
    }
  },
};
