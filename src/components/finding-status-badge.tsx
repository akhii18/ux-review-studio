import { cn } from "@/lib/utils";
import type { FindingStatus } from "@/lib/mock-data";
import { CheckCircle2, Circle, Edit3, XCircle, ArrowUpRight, CheckCheck } from "lucide-react";

const map: Record<FindingStatus, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  proposed: { label: "Proposed", cls: "bg-secondary text-secondary-foreground ring-border", Icon: Circle },
  accepted: { label: "Accepted", cls: "bg-[color:var(--success)]/10 text-[color:var(--success)] ring-[color:var(--success)]/30", Icon: CheckCircle2 },
  edited: { label: "Edited", cls: "bg-[color:var(--info)]/10 text-[color:var(--info)] ring-[color:var(--info)]/30", Icon: Edit3 },
  dismissed: { label: "Dismissed", cls: "bg-muted text-muted-foreground ring-border", Icon: XCircle },
  escalated: { label: "Escalated", cls: "bg-destructive/10 text-destructive ring-destructive/30", Icon: ArrowUpRight },
  resolved: { label: "Resolved", cls: "bg-[color:var(--success)]/15 text-[color:var(--success)] ring-[color:var(--success)]/30", Icon: CheckCheck },
};

export function FindingStatusBadge({ status, className }: { status: FindingStatus; className?: string }) {
  const { label, cls, Icon } = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", cls, className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}
