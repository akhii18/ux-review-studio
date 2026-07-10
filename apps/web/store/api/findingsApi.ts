import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  FindingWithBasis,
  PaginatedResponse,
  FindingsQuery,
  TriageFinding,
  UpdateFinding,
  EscalateFinding,
} from "@uxm/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface GroupedFindings {
  [area: string]: FindingWithBasis[];
}

interface RecurringTrend {
  title: string;
  area: string;
  principle: string;
  count: number;
}

export const findingsApi = createApi({
  reducerPath: "findingsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/api`,
    prepareHeaders: (headers) => {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["Finding", "RecurringFindings"],
  endpoints: (builder) => ({
    getFindingsByReview: builder.query<
      PaginatedResponse<FindingWithBasis>,
      { reviewId: string; query?: Partial<FindingsQuery> }
    >({
      query: ({ reviewId, query = {} }) => ({
        url: `/reviews/${reviewId}/findings`,
        params: query,
      }),
      transformResponse: (res: { data: PaginatedResponse<FindingWithBasis> }) => res.data,
      providesTags: (_result, _err, { reviewId }) => [{ type: "Finding", id: reviewId }],
    }),

    getFindingsGrouped: builder.query<GroupedFindings, string>({
      query: (reviewId) => `/reviews/${reviewId}/findings/grouped`,
      transformResponse: (res: { data: GroupedFindings }) => res.data,
      providesTags: (_result, _err, reviewId) => [{ type: "Finding", id: reviewId }],
    }),

    getNextUntriaged: builder.query<FindingWithBasis | null, string>({
      query: (reviewId) => `/reviews/${reviewId}/findings/untriaged`,
      transformResponse: (res: { data: FindingWithBasis | null }) => res.data,
      providesTags: (_result, _err, reviewId) => [{ type: "Finding", id: reviewId }],
    }),

    triageFinding: builder.mutation<
      FindingWithBasis,
      { id: string; payload: TriageFinding }
    >({
      query: ({ id, payload }) => ({
        url: `/findings/${id}/triage`,
        method: "PATCH",
        body: payload,
      }),
      transformResponse: (res: { data: FindingWithBasis }) => res.data,
      invalidatesTags: (_result, _err, { id }) => [
        { type: "Finding", id },
        "RecurringFindings",
      ],
    }),

    updateFinding: builder.mutation<FindingWithBasis, { id: string; payload: UpdateFinding }>({
      query: ({ id, payload }) => ({
        url: `/findings/${id}`,
        method: "PATCH",
        body: payload,
      }),
      transformResponse: (res: { data: FindingWithBasis }) => res.data,
      invalidatesTags: (_result, _err, { id }) => [{ type: "Finding", id }],
    }),

    escalateFinding: builder.mutation<
      FindingWithBasis,
      { id: string; payload: EscalateFinding }
    >({
      query: ({ id, payload }) => ({
        url: `/findings/${id}/escalate`,
        method: "POST",
        body: payload,
      }),
      transformResponse: (res: { data: FindingWithBasis }) => res.data,
      invalidatesTags: (_result, _err, { id }) => [{ type: "Finding", id }],
    }),

    getRecurringFindings: builder.query<RecurringTrend[], void>({
      query: () => "/findings/recurring",
      transformResponse: (res: { data: RecurringTrend[] }) => res.data,
      providesTags: ["RecurringFindings"],
    }),
  }),
});

export const {
  useGetFindingsByReviewQuery,
  useGetFindingsGroupedQuery,
  useGetNextUntriagedQuery,
  useTriageFindingMutation,
  useUpdateFindingMutation,
  useEscalateFindingMutation,
  useGetRecurringFindingsQuery,
} = findingsApi;
