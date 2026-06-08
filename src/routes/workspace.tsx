import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Download, MessageSquare, Check, RefreshCw, Sparkles, Image as ImageIcon,
  AlertCircle, ChevronLeft, ChevronRight, X, ArrowUpRight, Edit3,
} from "lucide-react";
import { findings, type Finding, type Priority } from "@/lib/mock-data";
import { PriorityBadge } from "@/components/priority-badge";
import { FindingStatusBadge } from "@/components/finding-status-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace")({
  head: () => ({ meta: [{ title: "Review Workspace — UXNavigator" }] }),
  component: Workspace,
});

const screens = [
  { id: "s1", name: "Onboarding · Step 1", issues: 8, p0: 2 },
  { id: "s2", name: "Sign Up", issues: 5, p0: 1 },
  { id: "s3", name: "Dashboard", issues: 11, p0: 1 },
  { id: "s4", name: "Account Summary", issues: 6, p0: 0 },
  { id: "s5", name: "Profile Settings", issues: 4, p0: 0 },
];

const pinPositions: Record<string, { x: number; y: number }> = {
  "f-1": { x: 52, y: 72 }, "f-2": { x: 30, y: 42 }, "f-3": { x: 70, y: 30 },
  "f-4": { x: 22, y: 58 }, "f-5": { x: 60, y: 50 }, "f-6": { x: 44, y: 22 },
  "f-7": { x: 80, y: 60 },
};

const pinTone: Record<Priority, string> = {
  P0: "bg-destructive",
  P1: "bg-[color:var(--warning)]",
  P2: "bg-[color:var(--info)]",
};

function Workspace() {
  const [selectedScreen, setSelectedScreen] = useState(screens[0].id);
  const [open, setOpen] = useState<Finding | null>(null);

  const filtered = useMemo(() => findings, []);
  const triage = useMemo(() => ({
    accepted: findings.filter((f) => f.status === "accepted").length,
    edited: findings.filter((f) => f.status === "edited").length,
    dismissed: findings.filter((f) => f.status === "dismissed").length,
    escalated: findings.filter((f) => f.status === "escalated").length,
  }), []);
  const triagedCount = triage.accepted + triage.edited + triage.dismissed + triage.escalated;
  const exportable = triage.accepted + triage.edited > 0;

  const screen = screens.find((s) => s.id === selectedScreen)!;
  const idx = screens.findIndex((s) => s.id === selectedScreen);

  return (
    <>
      <AppHeader title="Onboarding Flow Audit Q4" subtitle="Digital Banking App · 5 screens · 78 UX score" />

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border bg-card px-4 py-2.5 md:px-6">
        <Metric label="UX Score" value="78" accent />
        <Metric label="Findings" value={String(findings.length)} />
        <Metric label="P0" value={String(findings.filter((f) => f.priority === "P0").length)} tone="text-destructive" />
        <Metric label="Triaged" value={`${triagedCount} / ${findings.length}`} />
        <div className="hidden items-center gap-2 md:flex" aria-label="Triage states">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">States</span>
          <Badge variant="outline" className="gap-1 text-[10px]"><Check className="h-3 w-3 text-[color:var(--success)]" />Accepted {triage.accepted}</Badge>
          <Badge variant="outline" className="gap-1 text-[10px]"><Edit3 className="h-3 w-3 text-[color:var(--info)]" />Edited {triage.edited}</Badge>
          <Badge variant="outline" className="gap-1 text-[10px]"><X className="h-3 w-3" />Dismissed {triage.dismissed}</Badge>
          <Badge variant="outline" className="gap-1 text-[10px]"><ArrowUpRight className="h-3 w-3 text-destructive" />Escalated {triage.escalated}</Badge>
        </div>
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="flex-1 sm:flex-none">
                  <Button variant="outline" size="sm" className="min-h-9 w-full sm:w-auto" disabled={!exportable}>
                    <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Export
                  </Button>
                </span>
              </TooltipTrigger>
              {!exportable && <TooltipContent>Accept at least one finding to enable export.</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
          <Button size="sm" className="min-h-9 flex-1 bg-accent text-accent-foreground hover:bg-accent/90 sm:flex-none">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Run again
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Screen thumbnails */}
        <aside className="hidden w-48 shrink-0 overflow-y-auto border-r border-border bg-card/60 p-2 lg:block" aria-label="Screen list">
          <p className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Screens</p>
          <div className="space-y-1.5">
            {screens.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedScreen(s.id)}
                className={cn(
                  "group flex w-full flex-col gap-1.5 rounded-lg border p-2 text-left transition",
                  selectedScreen === s.id ? "border-accent bg-accent/5 shadow-sm" : "border-transparent hover:border-border hover:bg-secondary/50",
                )}
                aria-current={selectedScreen === s.id}
              >
                <div className={cn("flex aspect-[4/3] items-center justify-center rounded-md border border-border bg-secondary/60", selectedScreen === s.id && "border-accent/30")}>
                  <ImageIcon className="h-4 w-4 text-muted-foreground/40" aria-hidden="true" />
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[11px] font-medium">{s.name}</span>
                  {s.p0 > 0 && <PriorityBadge priority="P0" compact />}
                </div>
                <span className="text-[10px] text-muted-foreground">{s.issues} findings</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Canvas */}
        <section aria-label="Screen canvas" className="flex flex-1 flex-col overflow-hidden bg-secondary/30">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-card px-3 py-2 md:px-4">
            <Button variant="ghost" size="icon" className="h-9 w-9" disabled={idx === 0} onClick={() => setSelectedScreen(screens[idx - 1].id)} aria-label="Previous screen">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="truncate text-sm font-medium">{screen.name}</div>
            <Badge variant="secondary" className="text-[10px]">{idx + 1} / {screens.length}</Badge>
            <Button variant="ghost" size="icon" className="h-9 w-9" disabled={idx === screens.length - 1} onClick={() => setSelectedScreen(screens[idx + 1].id)} aria-label="Next screen">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="mx-1 hidden h-5 md:block" />
            <span className="hidden text-xs text-muted-foreground md:inline">{filtered.length} pins · click a pin to view explainable insights</span>
            <span className="text-xs text-muted-foreground md:hidden">{filtered.length} pins</span>
          </div>

          <div className="flex flex-1 items-center justify-center overflow-auto p-6">
            <div className="relative w-full max-w-3xl">
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="text-center">
                  <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
                  <p className="mt-2 text-xs text-muted-foreground">{screen.name}</p>
                  <p className="text-[11px] text-muted-foreground/70">Screen preview</p>
                </div>

                <TooltipProvider>
                  {filtered.map((f, i) => {
                    const pos = pinPositions[f.id] ?? { x: 20 + ((i * 13) % 70), y: 20 + ((i * 21) % 60) };
                    return (
                      <Tooltip key={f.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setOpen(f)}
                            className={cn(
                              "absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md ring-2 ring-card transition hover:scale-110",
                              pinTone[f.priority],
                            )}
                            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                            aria-label={`Finding ${i + 1} (${f.priority}): ${f.title}`}
                          >
                            {i + 1}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs font-medium">{f.title}</p>
                          <p className="text-[10px] text-muted-foreground">{f.priority} · {f.category}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground">
                {(["P0", "P1", "P2"] as Priority[]).map((p) => (
                  <div key={p} className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", pinTone[p])} aria-hidden="true" />
                    <PriorityBadge priority={p} compact />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {open && (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={open.priority} />
                  <FindingStatusBadge status={open.status} />
                  <Badge variant="outline">{open.category}</Badge>
                </div>
                <SheetTitle className="mt-2 text-left">{open.title}</SheetTitle>
                <SheetDescription className="text-left">{open.screen} · {open.principle}</SheetDescription>
              </SheetHeader>

              <div className="mt-5 space-y-5 text-sm">
                <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border bg-secondary/40">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
                </div>

                <Section title="Observation">{open.observation}</Section>
                <Section title="Why it matters">{open.why}</Section>
                <Section title="Recommendation">{open.recommendation}</Section>
                <Section title="Business impact">{open.businessImpact}</Section>
                {open.a11yImpact && <Section title="Accessibility impact">{open.a11yImpact}</Section>}
                {open.requirement && <Section title="Linked requirement">{open.requirement}</Section>}

                <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-accent">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    AI confidence · {open.confidence}%
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Based on the selected checklist and 12 prior reviews. You decide the final outcome.</p>
                </div>

                <Separator />

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="min-h-9"><Check className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Accept</Button>
                  <Button size="sm" variant="outline" className="min-h-9"><Edit3 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Edit & accept</Button>
                  <Button size="sm" variant="outline" className="min-h-9"><X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Dismiss</Button>
                  <Button size="sm" variant="outline" className="min-h-9"><ArrowUpRight className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Escalate</Button>
                  <Button size="sm" variant="outline" className="min-h-9"><MessageSquare className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Comment</Button>
                  <Button size="sm" variant="outline" className="min-h-9">Create Jira ticket</Button>
                  <Button size="sm" variant="ghost" className="min-h-9"><RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Regenerate</Button>
                  <Button size="sm" variant="ghost" className="min-h-9"><AlertCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />False positive</Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Metric({ label, value, tone, accent }: { label: string; value: string; tone?: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", accent && "text-accent", tone)}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm">{children}</p>
    </div>
  );
}
