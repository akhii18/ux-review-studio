import { PrinciplesRepository } from "../repositories/principles.repository";
import { AppError } from "../middleware/errorHandler";
import type { CreatePrinciple, UpdatePrinciple } from "@uxm/shared";

export const PrinciplesService = {
  async getAll(category?: string, enabled?: boolean) {
    return PrinciplesRepository.findAll(category, enabled);
  },

  async create(data: CreatePrinciple) {
    return PrinciplesRepository.create(data);
  },

  async update(id: string, data: UpdatePrinciple) {
    const principle = await PrinciplesRepository.findById(id);
    if (!principle) throw new AppError(404, "Principle not found");
    return PrinciplesRepository.update(id, data);
  },
};
