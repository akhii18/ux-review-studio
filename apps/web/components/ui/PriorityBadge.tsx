import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  P0: "bg-red-50 text-red-700 ring-red-300 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900",
  P1: "bg-warning/15 text-warning ring-warning/30",
  P2: "bg-info/10 text-info ring-info/30",
};

const labels = {
  P0: "P0 Blocker",
  P1: "P1 Important",
  P2: "P2 Polish",
};

const icons = {
  P0: AlertOctagon,
  P1: AlertTriangle,
  P2: Info,
};

const iconStyles = {
  P0: "text-red-700 dark:text-red-300",
  P1: "text-warning",
  P2: "text-info",
};

export function PriorityBadge({
  priority,
  className,
  compact,
}: {
  priority: "P0" | "P1" | "P2" | string;
  className?: string;
  compact?: boolean;
}) {
  const p = (priority === "p0" || priority === "P0") ? "P0" : (priority === "p1" || priority === "P1") ? "P1" : "P2";
  const Icon = icons[p];
  
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold ring-1 ring-inset tabular-nums",
        styles[p],
        className
      )}
      aria-label={labels[p]}
    >
      <Icon className={cn("h-3 w-3", iconStyles[p])} aria-hidden="true" />
      {compact ? p : labels[p]}
    </span>
  );
}
