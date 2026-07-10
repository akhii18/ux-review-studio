"use client";

import { useState } from "react";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useApproveChecklistMutation } from "@/store/api/checklistsApi";
import type { Checklist } from "@uxm/shared";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function ApprovalWorkflow({ checklist }: { checklist: Checklist }) {
  const [approverName, setApproverName] = useState("");
  const [approve, { isLoading }] = useApproveChecklistMutation();

  const handleApprove = async () => {
    if (!approverName.trim()) { toast.error("Please enter approver name"); return; }
    try {
      await approve({ id: checklist.id, payload: { approvedBy: approverName } }).unwrap();
      toast.success("Checklist approved");
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "data" in err
        ? (err.data as { error?: string }).error
        : "Approval failed";
      toast.error(msg ?? "Approval failed");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        {checklist.status === "APPROVED" ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : checklist.status === "DRAFT" ? (
          <Clock className="h-4 w-4 text-amber-500" />
        ) : (
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">Approval status</span>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px]",
            checklist.status === "APPROVED" && "border-green-200 bg-green-50 text-green-700",
            checklist.status === "DRAFT" && "border-amber-200 bg-amber-50 text-amber-700"
          )}
        >
          {checklist.status}
        </Badge>
      </div>

      {checklist.status === "APPROVED" ? (
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Approved by <strong className="text-foreground">{checklist.approvedBy}</strong></p>
          {checklist.approvedAt && (
            <p>{new Date(checklist.approvedAt).toLocaleDateString()}</p>
          )}
          <p className="text-xs italic mt-2">
            This checklist is locked. Create a new version to make changes.
          </p>
        </div>
      ) : checklist.status === "DEPRECATED" ? (
        <p className="text-sm text-muted-foreground">This checklist is deprecated and cannot be approved.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Once approved, this checklist will be locked. It will require {checklist.items.length} item{checklist.items.length !== 1 ? "s" : ""} to be completed.
          </p>
          {checklist.items.length === 0 && (
            <p className="text-xs text-destructive">Add at least one item before approving.</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="approver">Your name</Label>
            <Input
              id="approver"
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              className="h-9 text-sm"
            />
          </div>
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={isLoading || checklist.items.length === 0}
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            {isLoading ? "Approving…" : "Approve checklist"}
          </Button>
        </div>
      )}
    </div>
  );
}
