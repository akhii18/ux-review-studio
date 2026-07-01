import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type NotificationType =
  | "draft_saved"
  | "review_started"
  | "review_resumed"
  | "review_completed"
  | "review_failed"
  | "report_exported";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  href?: string;
  reviewId?: string;
  dedupeKey?: string;
}

interface NotificationsState {
  items: AppNotification[];
}

export type AddNotificationPayload = {
  type: NotificationType;
  title: string;
  message: string;
  href?: string;
  reviewId?: string;
  dedupeKey?: string;
  read?: boolean;
  createdAt?: string;
};

const LEGACY_STORAGE_KEY = "uxm:notif-items";
const MAX_NOTIFICATIONS = 20;

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem("current_user");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.id === "string" ? parsed.id : null;
  } catch {
    return null;
  }
}

export function getNotificationsStorageKey() {
  const userId = getCurrentUserId();
  return userId ? `uxm:notif-items:${userId}` : LEGACY_STORAGE_KEY;
}

function readStoredNotifications(storageKey: string): AppNotification[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item.id === "string" && typeof item.type === "string")
      .filter((item) => item.type !== "review_resumed")
      .map((item) => ({
        id: item.id,
        type: item.type,
        title: typeof item.title === "string" ? item.title : "Notification",
        message: typeof item.message === "string" ? item.message : "",
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
        read: Boolean(item.read),
        href: typeof item.href === "string" ? item.href : undefined,
        reviewId: typeof item.reviewId === "string" ? item.reviewId : undefined,
        dedupeKey: typeof item.dedupeKey === "string" ? item.dedupeKey : undefined,
      }))
      .slice(0, MAX_NOTIFICATIONS);
  } catch {
    return [];
  }
}

const initialState: NotificationsState = {
  items: [],
};

export const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setNotifications(state, action: PayloadAction<AppNotification[]>) {
      state.items = action.payload.slice(0, MAX_NOTIFICATIONS);
    },
    addNotification(state, action: PayloadAction<AddNotificationPayload>) {
      const payload = action.payload;
      const nextItem: AppNotification = {
        id: createId(),
        type: payload.type,
        title: payload.title,
        message: payload.message,
        href: payload.href,
        reviewId: payload.reviewId,
        dedupeKey: payload.dedupeKey,
        createdAt: payload.createdAt ?? new Date().toISOString(),
        read: payload.read ?? false,
      };

      if (payload.dedupeKey) {
        const existingIndex = state.items.findIndex((item) => item.dedupeKey === payload.dedupeKey);
        if (existingIndex >= 0) {
          state.items.splice(existingIndex, 1);
        }
      }

      state.items.unshift(nextItem);
      state.items = state.items.slice(0, MAX_NOTIFICATIONS);
    },
    markNotificationRead(state, action: PayloadAction<string>) {
      const item = state.items.find((notification) => notification.id === action.payload);
      if (item) item.read = true;
    },
    markAllNotificationsRead(state) {
      state.items.forEach((item) => {
        item.read = true;
      });
    },
    removeNotification(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    clearNotifications(state) {
      state.items = [];
    },
  },
});

export const {
  setNotifications,
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
  removeNotification,
  clearNotifications,
} = notificationsSlice.actions;

export const notificationsStorageKey = getNotificationsStorageKey;
export default notificationsSlice.reducer;