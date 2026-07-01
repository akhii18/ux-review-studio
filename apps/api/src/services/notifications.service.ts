import { NotificationsRepository } from "../repositories/notifications.repository";

function normalize(item: Awaited<ReturnType<typeof NotificationsRepository.list>>[number]) {
  return {
    ...item,
    read: Boolean(item.readAt),
  };
}

export const NotificationsService = {
  async list(userId: string) {
    const items = await NotificationsRepository.list(userId);
    return items.map(normalize);
  },

  async create(userId: string, data: Parameters<typeof NotificationsRepository.create>[1]) {
    const item = await NotificationsRepository.create(userId, data);
    return normalize(item);
  },

  async markRead(userId: string, id: string) {
    const item = await NotificationsRepository.markRead(userId, id);
    return item ? normalize(item) : null;
  },

  async markAllRead(userId: string) {
    await NotificationsRepository.markAllRead(userId);
    return { success: true };
  },

  async clear(userId: string) {
    await NotificationsRepository.clear(userId);
    return { success: true };
  },
};