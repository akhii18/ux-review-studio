"use client";

import { AppHeader } from "@/components/ui/AppHeader";
import { ApprovalWorkflow } from "@/components/checklist/ApprovalWorkflow";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CheckSquare, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useGetChecklistQuery } from "@/store/api/checklistsApi";
import type { ReviewArea } from "@uxm/shared";
import { REVIEW_AREA_LABELS } from "@uxm/shared";
import { cn } from "@/lib/utils";

export default function ChecklistDetailPage({ params }: { params: { id: string } }) {
  const { data: checklist, isLoading } = useGetChecklistQuery(params.id);

  if (isLoading) {
    return (
      <>
        <AppHeader title="Loading…" />
        <div className="flex-1 space-y-3 p-4 md:p-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      </>
    );
  }

  if (!checklist) {
    return (
      <>
        <AppHeader title="Checklist not found" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">This checklist does not exist.</p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/checklists">Back to checklists</Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader
        title={checklist.title}
        subtitle={`Version ${checklist.version} · ${checklist.items.length} items`}
      />
      <div className="flex-1 space-y-6 p-4 md:p-6 max-w-3xl">
        {/* Back */}
        <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5">
          <Link href="/checklists"><ArrowLeft className="h-3.5 w-3.5" />All checklists</Link>
        </Button>

        {/* Description */}
        {checklist.description && (
          <p className="text-sm text-muted-foreground">{checklist.description}</p>
        )}

        {/* Items */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Items ({checklist.items.length})</h2>
          {checklist.items.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No items. Edit the checklist to add items.</p>
          ) : (
            <ul className="space-y-2">
              {checklist.items.map((item, i) => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {item.area && (
                        <Badge variant="outline" className="text-[10px]">
                          {REVIEW_AREA_LABELS[item.area as ReviewArea] ?? item.area}
                        </Badge>
                      )}
                      {item.required && (
                        <span className="text-[10px] text-destructive font-medium">Required</span>
                      )}
                    </div>
                  </div>
                  <CheckSquare
                    className={cn(
                      "h-4 w-4 shrink-0 mt-0.5",
                      item.required ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Approval workflow */}
        <ApprovalWorkflow checklist={checklist} />
      </div>
    </>
  );
}
