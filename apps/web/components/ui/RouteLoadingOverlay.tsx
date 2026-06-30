import { Loader2 } from "lucide-react";

export function RouteLoadingOverlay({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-5 shadow-card">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">Please wait…</p>
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}