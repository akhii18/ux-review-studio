import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ReviewState {
  activeReviewId: string | null;
  selectedScreen: string | null;
  triageMode: boolean;
}

const initialState: ReviewState = {
  activeReviewId: null,
  selectedScreen: null,
  triageMode: false,
};

export const reviewSlice = createSlice({
  name: "review",
  initialState,
  reducers: {
    setActiveReview(state, action: PayloadAction<string | null>) {
      state.activeReviewId = action.payload;
      state.selectedScreen = null;
    },
    setSelectedScreen(state, action: PayloadAction<string | null>) {
      state.selectedScreen = action.payload;
    },
    setTriageMode(state, action: PayloadAction<boolean>) {
      state.triageMode = action.payload;
    },
  },
});

export const { setActiveReview, setSelectedScreen, setTriageMode } = reviewSlice.actions;
export default reviewSlice.reducer;
