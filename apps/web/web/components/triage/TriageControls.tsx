"use client";

import { Check, Edit3, X, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FindingStatus } from "@uxm/shared";

interface TriageControlsProps {
  status: FindingStatus;
  isLoading?: boolean;
  onAccept: () => void;
  onEdit: () => void;
  onDismiss: () => void;
  onEscalate: () => void;
  compact?: boolean;
}

export function TriageControls({
  status,
  isLoading,
  onAccept,
  onEdit,
  onDismiss,
  onEscalate,
  compact = false,
}: TriageControlsProps) {
  const size = compact ? "sm" : "sm";

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button
        size={size}
        onClick={onAccept}
        disabled={isLoading || status === "ACCEPTED"}
        className="gap-1.5"
      >
        <Check className="h-3.5 w-3.5" />
        {!compact && "Accept"}
      </Button>
      <Button size={size} variant="outline" onClick={onEdit} disabled={isLoading} className="gap-1.5">
        <Edit3 className="h-3.5 w-3.5" />
        {!compact && "Edit"}
      </Button>
      <Button
        size={size}
        variant="outline"
        onClick={onDismiss}
        disabled={isLoading || status === "DISMISSED"}
        className="gap-1.5"
      >
        <X className="h-3.5 w-3.5" />
        {!compact && "Dismiss"}
      </Button>
      <Button size={size} variant="outline" onClick={onEscalate} disabled={isLoading} className="gap-1.5">
        <ArrowUpRight className="h-3.5 w-3.5" />
        {!compact && "Escalate"}
      </Button>
    </div>
  );
}
