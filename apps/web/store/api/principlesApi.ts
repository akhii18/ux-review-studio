import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { UxPrinciple, CreatePrinciple, UpdatePrinciple } from "@uxm/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const principlesApi = createApi({
  reducerPath: "principlesApi",
  baseQuery: fetchBaseQuery({ baseUrl: `${API_URL}/api` }),
  tagTypes: ["Principle"],
  endpoints: (builder) => ({
    getPrinciples: builder.query<UxPrinciple[], { category?: string; enabled?: boolean }>({
      query: (params) => ({ url: "/principles", params }),
      transformResponse: (res: { data: UxPrinciple[] }) => res.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Principle" as const, id })),
              { type: "Principle", id: "LIST" },
            ]
          : [{ type: "Principle", id: "LIST" }],
    }),

    createPrinciple: builder.mutation<UxPrinciple, CreatePrinciple>({
      query: (payload) => ({
        url: "/principles",
        method: "POST",
        body: payload,
      }),
      transformResponse: (res: { data: UxPrinciple }) => res.data,
      invalidatesTags: [{ type: "Principle", id: "LIST" }],
    }),

    updatePrinciple: builder.mutation<UxPrinciple, { id: string; payload: UpdatePrinciple }>({
      query: ({ id, payload }) => ({
        url: `/principles/${id}`,
        method: "PATCH",
        body: payload,
      }),
      transformResponse: (res: { data: UxPrinciple }) => res.data,
      invalidatesTags: (_result, _err, { id }) => [
        { type: "Principle", id },
        { type: "Principle", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetPrinciplesQuery,
  useCreatePrincipleMutation,
  useUpdatePrincipleMutation,
} = principlesApi;
