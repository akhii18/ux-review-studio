import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type NotificationType =
  | "draft_saved"
  | "review_started"
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

const STORAGE_KEY = "uxm:notif-items";
const MAX_NOTIFICATIONS = 20;
const VALID_NOTIFICATION_TYPES = new Set<NotificationType>([
  "draft_saved",
  "review_started",
  "review_completed",
  "review_failed",
  "report_exported",
]);

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeNotificationHref(type: NotificationType, href?: string, reviewId?: string): string | undefined {
  if (type === "review_started" && reviewId) return `/new-review?reviewId=${reviewId}`;
  if ((type === "review_completed" || type === "report_exported") && reviewId) return `/workspace?reviewId=${reviewId}`;
  if ((type === "draft_saved" || type === "review_failed") && reviewId) return `/new-review?reviewId=${reviewId}`;
  return href;
}

export function loadStoredNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item.id === "string" && VALID_NOTIFICATION_TYPES.has(item.type))
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
      .map((item) => ({
        ...item,
        href: normalizeNotificationHref(item.type, typeof item.href === "string" ? item.href : undefined, item.reviewId),
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
    hydrateNotifications(state, action: PayloadAction<AppNotification[]>) {
      state.items = action.payload.slice(0, MAX_NOTIFICATIONS);
    },
    addNotification(state, action: PayloadAction<AddNotificationPayload>) {
      const payload = action.payload;
      const nextItem: AppNotification = {
        id: createId(),
        type: payload.type,
        title: payload.title,
        message: payload.message,
        href: normalizeNotificationHref(payload.type, payload.href, payload.reviewId),
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
  hydrateNotifications,
  addNotification,
  markNotificationRead,
  markAllNotificationsRead,
  removeNotification,
  clearNotifications,
} = notificationsSlice.actions;

export const notificationsStorageKey = STORAGE_KEY;
export default notificationsSlice.reducer;