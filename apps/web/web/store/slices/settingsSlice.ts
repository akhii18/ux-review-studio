import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface SettingsState {
  isDirty: boolean;
  lastSavedAt: string | null;
}

const initialState: SettingsState = {
  isDirty: false,
  lastSavedAt: null,
};

export const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    markDirty(state) {
      state.isDirty = true;
    },
    markSaved(state, action: PayloadAction<string>) {
      state.isDirty = false;
      state.lastSavedAt = action.payload;
    },
  },
});

export const { markDirty, markSaved } = settingsSlice.actions;
export default settingsSlice.reducer;
