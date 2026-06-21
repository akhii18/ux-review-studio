import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { FindingStatus, ReviewArea, Severity } from "@uxm/shared";

interface FindingsFilter {
  area?: ReviewArea;
  status?: FindingStatus;
  severity?: Severity;
  page: number;
  pageSize: number;
  sortBy: "severity" | "confidence" | "createdAt";
  sortOrder: "asc" | "desc";
}

interface FindingsState {
  filter: FindingsFilter;
  openFindingId: string | null;
}

const initialState: FindingsState = {
  filter: {
    page: 1,
    pageSize: 20,
    sortBy: "severity",
    sortOrder: "asc",
  },
  openFindingId: null,
};

export const findingsSlice = createSlice({
  name: "findings",
  initialState,
  reducers: {
    setFilter(state, action: PayloadAction<Partial<FindingsFilter>>) {
      state.filter = { ...state.filter, ...action.payload, page: 1 };
    },
    setPage(state, action: PayloadAction<number>) {
      state.filter.page = action.payload;
    },
    setOpenFinding(state, action: PayloadAction<string | null>) {
      state.openFindingId = action.payload;
    },
    resetFilter(state) {
      state.filter = initialState.filter;
    },
  },
});

export const { setFilter, setPage, setOpenFinding, resetFilter } = findingsSlice.actions;
export default findingsSlice.reducer;
