import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { UpdateSettings } from "@uxm/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const settingsApi = createApi({
  reducerPath: "settingsApi",
  baseQuery: fetchBaseQuery({ baseUrl: `${API_URL}/api` }),
  tagTypes: ["Settings"],
  endpoints: (builder) => ({
    getSettings: builder.query<Record<string, unknown>, void>({
      query: () => "/settings",
      transformResponse: (res: { data: Record<string, unknown> }) => res.data,
      providesTags: ["Settings"],
    }),

    updateSettings: builder.mutation<Record<string, unknown>, UpdateSettings>({
      query: (payload) => ({
        url: "/settings",
        method: "PATCH",
        body: payload,
      }),
      transformResponse: (res: { data: Record<string, unknown> }) => res.data,
      invalidatesTags: ["Settings"],
    }),
  }),
});

export const { useGetSettingsQuery, useUpdateSettingsMutation } = settingsApi;
