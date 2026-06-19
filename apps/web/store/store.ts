import { configureStore } from "@reduxjs/toolkit";
import { findingsApi } from "./api/findingsApi";
import { checklistsApi } from "./api/checklistsApi";
import { principlesApi } from "./api/principlesApi";
import { settingsApi } from "./api/settingsApi";
import reviewReducer from "./slices/reviewSlice";
import findingsReducer from "./slices/findingsSlice";
import checklistsReducer from "./slices/checklistsSlice";
import settingsReducer from "./slices/settingsSlice";

export const store = configureStore({
  reducer: {
    review: reviewReducer,
    findings: findingsReducer,
    checklists: checklistsReducer,
    settings: settingsReducer,
    [findingsApi.reducerPath]: findingsApi.reducer,
    [checklistsApi.reducerPath]: checklistsApi.reducer,
    [principlesApi.reducerPath]: principlesApi.reducer,
    [settingsApi.reducerPath]: settingsApi.reducer,
  },
  middleware: (getDefault) =>
    getDefault().concat(
      findingsApi.middleware,
      checklistsApi.middleware,
      principlesApi.middleware,
      settingsApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
