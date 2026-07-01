import { configureStore } from "@reduxjs/toolkit";
import { findingsApi } from "./api/findingsApi";
import { checklistsApi } from "./api/checklistsApi";
import { principlesApi } from "./api/principlesApi";
import { settingsApi } from "./api/settingsApi";
import reviewReducer from "./slices/reviewSlice";
import findingsReducer from "./slices/findingsSlice";
import checklistsReducer from "./slices/checklistsSlice";
import settingsReducer from "./slices/settingsSlice";
import notificationsReducer, {
  addNotification,
  clearNotifications,
  getNotificationsStorageKey,
  markAllNotificationsRead,
  markNotificationRead,
} from "./slices/notificationsSlice";
import {
  clearNotifications as clearNotificationsRemote,
  createNotification as createNotificationRemote,
  markAllNotificationsRead as markAllNotificationsReadRemote,
  markNotificationRead as markNotificationReadRemote,
} from "../lib/api";

function persistNotifications(items: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getNotificationsStorageKey(), JSON.stringify(items));
  } catch {
    // Ignore storage failures.
  }
}

function syncNotificationToServer(action: any) {
  if (typeof window === "undefined") return;

  if (addNotification.match(action)) {
    void createNotificationRemote(action.payload).catch(() => undefined);
    return;
  }

  if (markNotificationRead.match(action)) {
    void markNotificationReadRemote(action.payload).catch(() => undefined);
    return;
  }

  if (markAllNotificationsRead.match(action)) {
    void markAllNotificationsReadRemote().catch(() => undefined);
    return;
  }

  if (clearNotifications.match(action)) {
    void clearNotificationsRemote().catch(() => undefined);
  }
}

const notificationsPersistenceMiddleware = (storeApi: any) => (next: any) => (action: any) => {
  const result = next(action);
  syncNotificationToServer(action);
  const notifications = storeApi.getState().notifications;
  persistNotifications(notifications.items);
  return result;
};

export const store = configureStore({
  reducer: {
    review: reviewReducer,
    findings: findingsReducer,
    checklists: checklistsReducer,
    settings: settingsReducer,
    notifications: notificationsReducer,
    [findingsApi.reducerPath]: findingsApi.reducer,
    [checklistsApi.reducerPath]: checklistsApi.reducer,
    [principlesApi.reducerPath]: principlesApi.reducer,
    [settingsApi.reducerPath]: settingsApi.reducer,
  },
  middleware: (getDefault) =>
    getDefault().concat(
      notificationsPersistenceMiddleware,
      findingsApi.middleware,
      checklistsApi.middleware,
      principlesApi.middleware,
      settingsApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
