import { ChecklistsRepository } from "../repositories/checklists.repository";
import { AppError } from "../middleware/errorHandler";
import type { CreateChecklist, UpdateChecklist } from "@uxm/shared";

export const ChecklistsService = {
  async getAll() {
    return ChecklistsRepository.findAll();
  },

  async getById(id: string) {
    const checklist = await ChecklistsRepository.findById(id);
    if (!checklist) throw new AppError(404, "Checklist not found");
    return checklist;
  },

  async create(data: CreateChecklist) {
    return ChecklistsRepository.create(data);
  },

  async update(id: string, data: UpdateChecklist, performedBy: string) {
    const checklist = await ChecklistsRepository.findById(id);
    if (!checklist) throw new AppError(404, "Checklist not found");
    if (checklist.status === "APPROVED") {
      throw new AppError(409, "Approved checklists cannot be edited. Create a new version.");
    }
    return ChecklistsRepository.update(id, data, performedBy);
  },

  async approve(id: string, approvedBy: string) {
    const checklist = await ChecklistsRepository.findById(id);
    if (!checklist) throw new AppError(404, "Checklist not found");
    if (checklist.status === "APPROVED") throw new AppError(409, "Checklist is already approved");
    if (checklist.status === "DEPRECATED") {
      throw new AppError(409, "Deprecated checklists cannot be approved");
    }
    if (checklist.items.length === 0) {
      throw new AppError(422, "Cannot approve a checklist with no items");
    }
    return ChecklistsRepository.approve(id, approvedBy);
  },
};
