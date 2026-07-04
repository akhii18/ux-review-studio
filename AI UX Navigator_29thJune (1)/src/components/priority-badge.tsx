import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Priority } from "@/lib/mock-data";

const styles: Record<Priority, string> = {
  P0: "bg-destructive/10 text-destructive ring-destructive/30",
  P1: "bg-[color:var(--warning)]/15 text-[color:var(--warning)] ring-[color:var(--warning)]/30",
  P2: "bg-[color:var(--info)]/10 text-[color:var(--info)] ring-[color:var(--info)]/30",
};

const labels: Record<Priority, string> = {
  P0: "P0 Blocker",
  P1: "P1 Important",
  P2: "P2 Polish",
};

const icons: Record<Priority, React.ComponentType<{ className?: string }>> = {
  P0: AlertOctagon,
  P1: AlertTriangle,
  P2: Info,
};

export function PriorityBadge({
  priority,
  className,
  compact,
}: {
  priority: Priority;
  className?: string;
  compact?: boolean;
}) {
  const Icon = icons[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset tabular-nums",
        styles[priority],
        className,
      )}
      aria-label={labels[priority]}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {compact ? priority : labels[priority]}
    </span>
  );
}
