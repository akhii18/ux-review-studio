"use client";

import Link from "next/link";
import { CheckSquare, Clock, CheckCircle2, Archive, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetChecklistsQuery } from "@/store/api/checklistsApi";
import { useSelector, useDispatch } from "react-redux";
import { setStatusFilter } from "@/store/slices/checklistsSlice";
import type { RootState } from "@/store/store";
import type { Checklist, ChecklistStatus } from "@uxm/shared";
import { cn } from "@/lib/utils";

const STATUS_ICONS: Record<ChecklistStatus, React.ComponentType<{ className?: string }>> = {
  DRAFT: Clock,
  APPROVED: CheckCircle2,
  DEPRECATED: Archive,
};

const STATUS_STYLES: Record<ChecklistStatus, string> = {
  DRAFT: "bg-amber-100 text-amber-700 border-amber-200",
  APPROVED: "bg-green-100 text-green-700 border-green-200",
  DEPRECATED: "bg-gray-100 text-gray-500 border-gray-200",
};

export function ChecklistGrid() {
  const dispatch = useDispatch();
  const statusFilter = useSelector((s: RootState) => s.checklists.statusFilter);

  const { data: checklists = [], isLoading } = useGetChecklistsQuery();

  const filtered =
    statusFilter === "ALL" ? checklists : checklists.filter((c) => c.status === statusFilter);

  return (
    <div className="space-y-4">
      {/* Filters + New button */}
      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "DRAFT", "APPROVED", "DEPRECATED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => dispatch(setStatusFilter(s))}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              statusFilter === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            )}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
        <Button asChild size="sm" className="ml-auto gap-1.5">
          <Link href="/checklists/new">
            <Plus className="h-3.5 w-3.5" />New checklist
          </Link>
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <CheckSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No checklists found</p>
          <p className="mt-1 text-xs text-muted-foreground">Create your first checklist to get started.</p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/checklists/new">Create checklist</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => <ChecklistGridCard key={c.id} checklist={c} />)}
        </div>
      )}
    </div>
  );
}

function ChecklistGridCard({ checklist }: { checklist: Checklist }) {
  const Icon = STATUS_ICONS[checklist.status];
  return (
    <Link href={`/checklists/${checklist.id}`}>
      <Card className="h-full cursor-pointer transition hover:border-primary/40 hover:shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm leading-snug">{checklist.title}</CardTitle>
            <Badge
              variant="outline"
              className={cn("shrink-0 gap-1 text-[10px]", STATUS_STYLES[checklist.status])}
            >
              <Icon className="h-3 w-3" />
              {checklist.status.charAt(0) + checklist.status.slice(1).toLowerCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 text-[11px] text-muted-foreground space-y-1">
          {checklist.description && (
            <p className="line-clamp-2">{checklist.description}</p>
          )}
          <div className="flex gap-4 pt-1">
            <span><strong className="text-foreground">{checklist.items.length}</strong> items</span>
            <span>v{checklist.version}</span>
            {checklist.approvedBy && <span>by {checklist.approvedBy}</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
