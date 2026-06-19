import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { Checklist, CreateChecklist, UpdateChecklist, ApproveChecklist } from "@uxm/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const checklistsApi = createApi({
  reducerPath: "checklistsApi",
  baseQuery: fetchBaseQuery({ baseUrl: `${API_URL}/api` }),
  tagTypes: ["Checklist"],
  endpoints: (builder) => ({
    getChecklists: builder.query<Checklist[], void>({
      query: () => "/checklists",
      transformResponse: (res: { data: Checklist[] }) => res.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Checklist" as const, id })),
              { type: "Checklist", id: "LIST" },
            ]
          : [{ type: "Checklist", id: "LIST" }],
    }),

    getChecklist: builder.query<Checklist, string>({
      query: (id) => `/checklists/${id}`,
      transformResponse: (res: { data: Checklist }) => res.data,
      providesTags: (_result, _err, id) => [{ type: "Checklist", id }],
    }),

    createChecklist: builder.mutation<Checklist, CreateChecklist>({
      query: (payload) => ({
        url: "/checklists",
        method: "POST",
        body: payload,
      }),
      transformResponse: (res: { data: Checklist }) => res.data,
      invalidatesTags: [{ type: "Checklist", id: "LIST" }],
    }),

    updateChecklist: builder.mutation<Checklist, { id: string; payload: UpdateChecklist }>({
      query: ({ id, payload }) => ({
        url: `/checklists/${id}`,
        method: "PATCH",
        body: payload,
      }),
      transformResponse: (res: { data: Checklist }) => res.data,
      invalidatesTags: (_result, _err, { id }) => [
        { type: "Checklist", id },
        { type: "Checklist", id: "LIST" },
      ],
    }),

    approveChecklist: builder.mutation<Checklist, { id: string; payload: ApproveChecklist }>({
      query: ({ id, payload }) => ({
        url: `/checklists/${id}/approve`,
        method: "POST",
        body: payload,
      }),
      transformResponse: (res: { data: Checklist }) => res.data,
      invalidatesTags: (_result, _err, { id }) => [
        { type: "Checklist", id },
        { type: "Checklist", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetChecklistsQuery,
  useGetChecklistQuery,
  useCreateChecklistMutation,
  useUpdateChecklistMutation,
  useApproveChecklistMutation,
} = checklistsApi;
