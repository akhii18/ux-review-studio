import { Request, Response } from "express";
import { ReviewsService } from "../services/reviews.service";
import { z } from "zod";
import { AppError } from "../middleware/errorHandler";

function getUserId(req: Request): string {
  const userId = req.user?.sub;
  if (!userId) throw new AppError(401, "Authentication required");
  return userId;
}

const CreateReviewSchema = z.object({
  name:                z.string().min(1),
  product:             z.string().min(1),
  domain:              z.string().optional(),
  reviewType:          z.string().optional(),
  owner:               z.string().optional(),
  criteria:            z.array(z.string()).optional(),
  depth:               z.string().optional(),
  confidenceThreshold: z.number().int().min(0).max(100).optional(),
});

const SaveAssetSchema = z.object({
  name:        z.string().min(1),
  mimeType:    z.string().min(1),
  base64Data:  z.string().optional(),
  blobUrl:     z.string().optional(),
  contentText: z.string().optional(),
  sizeBytes:   z.number().int().optional(),
});

const SaveDraftSchema = z.object({
  reviewId: z.string().optional(),
  name: z.string(),
  product: z.string(),
  domain: z.string().optional(),
  reviewType: z.string().optional(),
  owner: z.string().optional(),
  criteria: z.array(z.string()).optional(),
  depth: z.string().optional(),
  confidenceThreshold: z.number().int().min(0).max(100).optional(),
  stage: z.string().optional(),
  assets: z.array(SaveAssetSchema).optional(),
});

const ConvertLegacyDocSchema = z.object({
  name: z.string().min(1),
  mimeType: z.string().min(1),
  base64Data: z.string().min(1),
});

export const ReviewsController = {
  async list(req: Request, res: Response) {
    const reviews = await ReviewsService.list(getUserId(req));
    res.json({ success: true, data: reviews });
  },

  async getById(req: Request, res: Response) {
    const review = await ReviewsService.getById(req.params.id as string, getUserId(req));
    res.json({ success: true, data: review });
  },

  async create(req: Request, res: Response) {
    const data = CreateReviewSchema.parse(req.body);
    const review = await ReviewsService.create(getUserId(req), data);
    res.status(201).json({ success: true, data: review });
  },

  async saveDraft(req: Request, res: Response) {
    const payload = SaveDraftSchema.parse(req.body);
    const review = await ReviewsService.saveDraft(getUserId(req), payload);
    res.status(201).json({ success: true, data: review });
  },

  async saveAsset(req: Request, res: Response) {
    const asset = SaveAssetSchema.parse(req.body);
    const result = await ReviewsService.saveAsset(getUserId(req), req.params.id as string, asset);
    res.status(201).json({ success: true, data: result });
  },

  async convertLegacyDoc(req: Request, res: Response) {
    const payload = ConvertLegacyDocSchema.parse(req.body);
    const result = await ReviewsService.convertLegacyDoc(getUserId(req), payload);
    res.status(200).json({ success: true, data: result });
  },

  async start(req: Request, res: Response) {
    const result = await ReviewsService.startReview(req.params.id as string, getUserId(req));
    res.json({ success: true, data: result });
  },

  async getProgress(req: Request, res: Response) {
    const progress = await ReviewsService.getProgress(req.params.id as string, getUserId(req));
    res.json({ success: true, data: progress });
  },

  async delete(req: Request, res: Response) {
    await ReviewsService.delete(req.params.id as string, getUserId(req));
    res.json({ success: true });
  },

  async export(req: Request, res: Response) {
    const report = await ReviewsService.exportReport(req.params.id as string, getUserId(req));
    res.json({ success: true, data: report });
  },

  async getAnalytics(req: Request, res: Response) {
    const analytics = await ReviewsService.getAnalytics(getUserId(req));
    res.json({ success: true, data: analytics });
  },
};
