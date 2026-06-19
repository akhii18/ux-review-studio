import { cn } from "@/lib/utils";
import type { Severity } from "@uxm/shared";

const tones: Record<Severity, string> = {
  P0: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  P1: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  P2: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
};

const labels: Record<Severity, string> = {
  P0: "P0 · Blocker",
  P1: "P1 · Important",
  P2: "P2 · Polish",
};

export function SeverityBadge({
  severity,
  compact = false,
}: {
  severity: Severity;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none",
        tones[severity]
      )}
    >
      {compact ? severity : labels[severity]}
    </span>
  );
}
