import { cn } from "@/lib/utils";
import type { FindingStatus } from "@uxm/shared";

const tones: Record<FindingStatus, string> = {
  PROPOSED: "bg-muted text-muted-foreground border-border",
  ACCEPTED: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  EDITED: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  DISMISSED: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
  ESCALATED: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
};

export function FindingStatusBadge({ status }: { status: FindingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize leading-none",
        tones[status]
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}
