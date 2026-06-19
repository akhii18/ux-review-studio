import { FindingsRepository } from "../repositories/findings.repository";
import { AppError } from "../middleware/errorHandler";
import type { FindingsQuery, UpdateFinding, TriageFinding } from "@uxm/shared";

export const FindingsService = {
  async getByReview(reviewId: string, query: FindingsQuery) {
    return FindingsRepository.findByReview(reviewId, query);
  },

  async getGroupedByArea(reviewId: string) {
    return FindingsRepository.findGroupedByArea(reviewId);
  },

  async getNextUntriaged(reviewId: string) {
    const finding = await FindingsRepository.findNextUntriaged(reviewId);
    if (!finding) return null;
    return finding;
  },

  async triage(id: string, payload: TriageFinding) {
    const finding = await FindingsRepository.findById(id);
    if (!finding) throw new AppError(404, "Finding not found");

    const statusMap = {
      ACCEPT: "ACCEPTED",
      EDIT: "EDITED",
      DISMISS: "DISMISSED",
      ESCALATE: "ESCALATED",
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

  async update(id: string, data: UpdateFinding) {
    const finding = await FindingsRepository.findById(id);
    if (!finding) throw new AppError(404, "Finding not found");
    return FindingsRepository.update(id, data);
  },

  async escalate(id: string, reason: string) {
    const finding = await FindingsRepository.findById(id);
    if (!finding) throw new AppError(404, "Finding not found");
    if (finding.status === "ESCALATED") throw new AppError(409, "Finding is already escalated");
    return FindingsRepository.escalate(id, reason);
  },

  async getRecurring() {
    return FindingsRepository.findRecurring();
  },
};
