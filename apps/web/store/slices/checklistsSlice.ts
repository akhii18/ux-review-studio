import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ChecklistsState {
  viewMode: "grid" | "list";
  statusFilter: "ALL" | "DRAFT" | "APPROVED" | "DEPRECATED";
}

const initialState: ChecklistsState = {
  viewMode: "grid",
  statusFilter: "ALL",
};

export const checklistsSlice = createSlice({
  name: "checklists",
  initialState,
  reducers: {
    setViewMode(state, action: PayloadAction<"grid" | "list">) {
      state.viewMode = action.payload;
    },
    setStatusFilter(state, action: PayloadAction<ChecklistsState["statusFilter"]>) {
      state.statusFilter = action.payload;
    },
  },
});

export const { setViewMode, setStatusFilter } = checklistsSlice.actions;
export default checklistsSlice.reducer;
