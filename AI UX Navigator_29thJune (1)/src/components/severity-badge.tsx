import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/mock-data";

const styles: Record<Severity, string> = {
  critical: "bg-destructive/10 text-destructive ring-destructive/20",
  high: "bg-warning/15 text-warning-foreground ring-warning/30 [&]:text-[color:var(--warning)]",
  medium: "bg-info/10 text-info ring-info/20 [&]:text-[color:var(--info)]",
  low: "bg-success/10 ring-success/20 [&]:text-[color:var(--success)]",
};

const labels: Record<Severity, string> = {
  critical: "Critical", high: "High", medium: "Medium", low: "Low",
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        styles[severity],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[severity]}
    </span>
  );
}
