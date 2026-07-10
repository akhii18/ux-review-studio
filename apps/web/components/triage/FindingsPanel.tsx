"use client";

import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Filter, SortAsc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { FindingStatusBadge } from "@/components/ui/FindingStatusBadge";
import { FindingCard } from "./FindingCard";
import { NextUntriagedButton } from "./NextUntriagedButton";
import { useGetFindingsByReviewQuery } from "@/store/api/findingsApi";
import { setFilter, setPage } from "@/store/slices/findingsSlice";
import type { RootState } from "@/store/store";
import type { FindingWithBasis, ReviewArea, Severity, FindingStatus } from "@uxm/shared";
import { REVIEW_AREA_LABELS } from "@uxm/shared";

export function FindingsPanel({ reviewId }: { reviewId: string }) {
  const dispatch = useDispatch();
  const filter = useSelector((s: RootState) => s.findings.filter);
  const [openFinding, setOpenFinding] = useState<FindingWithBasis | null>(null);

  const { data, isLoading, isFetching } = useGetFindingsByReviewQuery({
    reviewId,
    query: filter,
  });

  const findings = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span>Filter by area:</span>
        </div>

        <Select
          value={filter.area ?? "ALL"}
          onValueChange={(v) => dispatch(setFilter({ area: v === "ALL" ? undefined : v as ReviewArea }))}
        >
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All areas</SelectItem>
            {Object.entries(REVIEW_AREA_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filter.status ?? "ALL"}
          onValueChange={(v) => dispatch(setFilter({ status: v === "ALL" ? undefined : v as FindingStatus }))}
        >
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {["PROPOSED", "ACCEPTED", "EDITED", "DISMISSED", "ESCALATED", "FALSE_POSITIVE"].map((s) => (
              <SelectItem key={s} value={s}>{s.toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 ml-auto">
          <SortAsc className="h-3.5 w-3.5 text-muted-foreground" />
          <Select
            value={filter.sortBy}
            onValueChange={(v) => dispatch(setFilter({ sortBy: v as typeof filter.sortBy }))}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="severity">Severity</SelectItem>
              <SelectItem value="confidence">Confidence</SelectItem>
              <SelectItem value="createdAt">Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <NextUntriagedButton
          reviewId={reviewId}
          onOpen={(id) => {
            const f = findings.find((f) => f.id === id);
            if (f) setOpenFinding(f);
          }}
        />
      </div>

      {/* Stats */}
      <div className="text-xs text-muted-foreground">
        {isFetching ? "Refreshing…" : `${total} finding${total !== 1 ? "s" : ""}`}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : findings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">No findings match the current filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {findings.map((f) => (
            <button
              key={f.id}
              onClick={() => setOpenFinding(f)}
              className="w-full rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={f.severity} compact />
                <FindingStatusBadge status={f.status} />
                <Badge variant="outline" className="text-[10px]">
                  {REVIEW_AREA_LABELS[f.area as ReviewArea] ?? f.area}
                </Badge>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {f.confidence}% confidence
                </span>
              </div>
              <p className="mt-2 text-sm font-medium leading-snug">{f.title}</p>
              {f.screen && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">{f.screen}</p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={filter.page <= 1}
            onClick={() => dispatch(setPage(filter.page - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            {filter.page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={filter.page >= totalPages}
            onClick={() => dispatch(setPage(filter.page + 1))}
          >
            Next
          </Button>
        </div>
      )}

      {openFinding && (
        <FindingCard
          finding={openFinding}
          open={!!openFinding}
          onClose={() => setOpenFinding(null)}
        />
      )}
    </div>
  );
}
