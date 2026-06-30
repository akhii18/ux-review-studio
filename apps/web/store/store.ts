import { configureStore } from "@reduxjs/toolkit";
import { findingsApi } from "./api/findingsApi";
import { checklistsApi } from "./api/checklistsApi";
import { principlesApi } from "./api/principlesApi";
import { settingsApi } from "./api/settingsApi";
import reviewReducer from "./slices/reviewSlice";
import findingsReducer from "./slices/findingsSlice";
import checklistsReducer from "./slices/checklistsSlice";
import settingsReducer from "./slices/settingsSlice";
import notificationsReducer, { notificationsStorageKey } from "./slices/notificationsSlice";

function persistNotifications(items: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(notificationsStorageKey, JSON.stringify(items));
  } catch {
    // Ignore storage failures.
  }
}

const notificationsPersistenceMiddleware = (storeApi: any) => (next: any) => (action: any) => {
  const result = next(action);
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
