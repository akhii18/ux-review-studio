"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppDispatch } from "@/store/hooks";
import { addNotification } from "@/store/slices/notificationsSlice";
import {
  Download, Check, RefreshCw, Sparkles, Image as ImageIcon,
  AlertCircle, ChevronLeft, ChevronRight, X, ArrowUpRight, Edit3, Plus,
  BookOpen, AlertTriangle, MessageSquare, MonitorPlay,
} from "lucide-react";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { FindingStatusBadge } from "@/components/ui/FindingStatusBadge";
import { cn } from "@/lib/utils";
import { exportReviewReport, getReview, updateFinding, triageFinding } from "@/lib/api";
import { REVIEW_BASIS_LIBRARY } from "@uxm/shared";
import { toast } from "sonner";
import Link from "next/link";

type TriageStatus = "PROPOSED" | "ACCEPTED" | "EDITED" | "DISMISSED" | "ESCALATED";

interface ReviewBasisItem {
  id?: string;
  type: string;
  name: string;
  explanation: string;
}

interface Finding {
  id: string;
  reviewId: string;
  title: string;
  severity: "P0" | "P1" | "P2";
  area: string;
  screen?: string;
  principle?: string;
  requirement?: string;
  observation?: string;
  description?: string;
  why?: string;
  recommendation?: string;
  businessImpact?: string;
  a11yImpact?: string;
  status: TriageStatus;
  confidence: number;
  notes?: string;
  reviewBasis: ReviewBasisItem[];
}

interface WorkspaceScreen {
  id: string;
  name: string;
  imageUrl?: string;
  issues: number;
  p0: number;
}

const pinTone: Record<"P0" | "P1" | "P2", string> = {
  P0: "bg-destructive",
  P1: "bg-warning",
  P2: "bg-info",
};

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function normalizeScreenLabel(value: string): string {
  return stripExtension(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function findingMatchesScreen(findingScreen?: string, screenName?: string): boolean {
  if (!findingScreen || !screenName) return false;
  const fs = normalizeScreenLabel(findingScreen);
  const sn = normalizeScreenLabel(screenName);
  if (!fs || fs === "unknown") return false;
  if (fs === "multiple") return true;
  return fs === sn || fs.includes(sn) || sn.includes(fs);
}

function WorkspaceContent() {
  const params = useSearchParams();
  const reviewId = params.get("reviewId");
  const dispatch = useAppDispatch();

  const [reviewData, setReviewData] = useState<any>(null);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [selectedScreen, setSelectedScreen] = useState<string | null>(null);
  const [open, setOpen] = useState<Finding | null>(null);

  const fetchReview = useCallback(() => {
    if (!reviewId) return;
    setReviewLoading(true);
    getReview(reviewId)
      .then((data) => {
        setReviewData(data);
      })
      .catch((err) => {
        toast.error("Failed to load review data");
        console.error(err);
      })
      .finally(() => setReviewLoading(false));
  }, [reviewId]);

  useEffect(() => {
    if (reviewId) {
      fetchReview();
    }
  }, [reviewId, fetchReview]);

  const allFindings: Finding[] = useMemo(() => {
    if (reviewData?.findings) {
      return reviewData.findings.map((f: any) => ({
        ...f,
        // Map backend uppercase severities to frontend P0/P1/P2
        severity: f.severity || "P2",
        status: f.status || "PROPOSED",
        reviewBasis: f.reviewBasis || [],
      }));
    }
    return [];
  }, [reviewData]);

  const screens: WorkspaceScreen[] = useMemo(() => {
    if (!reviewData) return [];
    const assetsList = reviewData.assets ?? [];
    const imageAssets = assetsList.filter((a: any) => a.mimeType?.startsWith("image/"));

    if (imageAssets.length > 0) {
      return imageAssets.map((asset: any) => {
        const screenFindings = allFindings.filter((f) => findingMatchesScreen(f.screen, asset.name));
        return {
          id: asset.id,
          name: stripExtension(asset.name),
          imageUrl: asset.blobUrl
            ? asset.blobUrl
            : asset.base64Data
            ? `data:${asset.mimeType};base64,${asset.base64Data}`
            : undefined,
          issues: screenFindings.length,
          p0: screenFindings.filter((f) => f.severity === "P0").length,
        };
      });
    }

    const screenNames = [
      ...new Set(
        allFindings
          .map((f) => f.screen)
          .filter((s): s is string => !!s && s !== "Unknown" && s !== "Multiple"),
      ),
    ];

    if (screenNames.length === 0) {
      return [{
        id: "overview",
        name: "Review overview",
        issues: allFindings.length,
        p0: allFindings.filter((f) => f.severity === "P0").length,
      }];
    }

    return screenNames.map((name, i) => {
      const screenFindings = allFindings.filter((f) => findingMatchesScreen(f.screen, name));
      return {
        id: `screen-${i}`,
        name,
        issues: screenFindings.length,
        p0: screenFindings.filter((f) => f.severity === "P0").length,
      };
    });
  }, [reviewData, allFindings]);

  useEffect(() => {
    if (screens.length === 0) {
      setSelectedScreen(null);
      return;
    }
    if (!selectedScreen || !screens.some((s) => s.id === selectedScreen)) {
      setSelectedScreen(screens[0].id);
    }
  }, [screens, selectedScreen]);

  const screen = screens.find((s) => s.id === selectedScreen) ?? screens[0] ?? null;
  const idx = screen ? screens.findIndex((s) => s.id === screen.id) : -1;

  const screenFindings = useMemo(() => {
    if (!screen) return allFindings;
    return allFindings.filter((f) => findingMatchesScreen(f.screen, screen.name));
  }, [allFindings, screen]);

  const triage = useMemo(() => {
    return {
      accepted: allFindings.filter((f) => f.status === "ACCEPTED").length,
      edited: allFindings.filter((f) => f.status === "EDITED").length,
      dismissed: allFindings.filter((f) => f.status === "DISMISSED").length,
      escalated: allFindings.filter((f) => f.status === "ESCALATED").length,
      proposed: allFindings.filter((f) => f.status === "PROPOSED").length,
    };
  }, [allFindings]);

  const triagedCount = triage.accepted + triage.edited + triage.dismissed + triage.escalated;
  const allAcceptedHaveBasis = useMemo(() => {
    return allFindings
      .filter((f) => f.status === "ACCEPTED" || f.status === "EDITED")
      .every((f) => f.reviewBasis && f.reviewBasis.length > 0);
  }, [allFindings]);

  const exportable = triage.proposed === 0 && allAcceptedHaveBasis && (triage.accepted + triage.edited > 0);

  const handleExport = useCallback(async () => {
    if (!reviewId) return;
    try {
      const report = await exportReviewReport(reviewId);
      dispatch(addNotification({
        type: "report_exported",
        title: "Report exported",
        message: `${reviewData?.name ?? "Your review"} report was exported successfully.`,
        href: `/workspace?reviewId=${reviewId}`,
        reviewId,
        dedupeKey: `report-exported:${reviewId}`,
      }));
      const blob = new Blob([report.contentMd], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${report.name ?? "ux-review-report"}.md`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Report exported");
    } catch (error: any) {
      toast.error(error?.message ?? "Triage or review the findings for report export");
    }
  }, [dispatch, reviewData?.name, reviewId]);

  const handleFindingAction = useCallback(
    (findingId: string, actionStatus: TriageStatus) => {
      updateFinding(findingId, { status: actionStatus })
        .then(() => {
          toast.success(`Finding status set to ${actionStatus.toLowerCase()}`);
          fetchReview();
          // Update details sheet finding if open
          setOpen((prev) => prev && prev.id === findingId ? { ...prev, status: actionStatus } : prev);
        })
        .catch((err) => {
          toast.error("Failed to update finding");
          console.error(err);
        });
    },
    [fetchReview]
  );

  const handleBasisChange = useCallback(
    (findingId: string, basis: ReviewBasisItem[]) => {
      updateFinding(findingId, { reviewBasis: basis })
        .then(() => {
          toast.success("Review basis updated");
          fetchReview();
          // Update details sheet finding if open
          setOpen((prev) => prev && prev.id === findingId ? { ...prev, reviewBasis: basis } : prev);
        })
        .catch((err) => {
          toast.error("Failed to save basis");
          console.error(err);
        });
    },
    [fetchReview]
  );

  if (!reviewId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <CardFallback />
      </div>
    );
  }

  if (reviewLoading && !reviewData) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading workspace…
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Review not found.
      </div>
    );
  }

  const reviewTitle = reviewData.name ?? "Review Workspace";
  const reviewSubtitle = `${reviewData.product} · ${screens.length} screen${screens.length === 1 ? "" : "s"} · ${allFindings.length} findings · UX score ${reviewData.uxScore ?? "—"}`;

  return (
    <>
      <AppHeader title={reviewTitle} subtitle={reviewSubtitle} />

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border bg-card px-4 py-2.5 md:px-6">
        <Metric label="UX Score" value={String(reviewData.uxScore ?? "—")} accent />
        <Metric label="Findings" value={String(allFindings.length)} />
        <Metric label="P0" value={String(allFindings.filter((f) => f.severity === "P0").length)} tone="text-destructive" />
        <Metric label="Triaged" value={`${triagedCount} / ${allFindings.length}`} />
        <div className="hidden items-center gap-2 md:flex" aria-label="Triage states">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">States</span>
          <Badge variant="outline" className="gap-1 text-[10px]"><Check className="h-3 w-3 text-green-600" />Accepted {triage.accepted}</Badge>
          <Badge variant="outline" className="gap-1 text-[10px]"><Edit3 className="h-3 w-3 text-blue-600" />Edited {triage.edited}</Badge>
          <Badge variant="outline" className="gap-1 text-[10px]"><X className="h-3 w-3" />Dismissed {triage.dismissed}</Badge>
          <Badge variant="outline" className="gap-1 text-[10px]"><ArrowUpRight className="h-3 w-3 text-destructive" />Escalated {triage.escalated}</Badge>
        </div>
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="flex-1 sm:flex-none">
                  <Button variant="outline" size="sm" className="min-h-9 w-full sm:w-auto" disabled={!exportable} onClick={handleExport}>
                    <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Export
                  </Button>
                </span>
              </TooltipTrigger>
              {!exportable && (
                <TooltipContent side="bottom" className="max-w-xs">
                  {!allAcceptedHaveBasis
                    ? "Ensure all accepted/edited findings have at least one Review Basis item."
                    : triage.proposed > 0
                    ? `Triage the remaining ${triage.proposed} findings to enable export.`
                    : "Accept at least one finding to enable export."}
                </TooltipContent>
              )}
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
          {screens.length === 0 ? (
            <p className="px-2 py-4 text-[11px] text-muted-foreground">No screens uploaded.</p>
          ) : (
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
                  <div className={cn("flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border border-border bg-secondary/60", selectedScreen === s.id && "border-accent/30")}>
                    {s.imageUrl ? (
                      <img src={s.imageUrl} alt="" className="h-full w-full object-cover object-top" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-muted-foreground/40" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-[11px] font-medium">{s.name}</span>
                    {s.p0 > 0 && <PriorityBadge priority="P0" compact />}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{s.issues} finding{s.issues === 1 ? "" : "s"}</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Canvas */}
        <section aria-label="Screen canvas" className="flex flex-1 flex-col overflow-hidden bg-secondary/30">
          {screen ? (
            <>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-card px-3 py-2 md:px-4">
                <Button variant="ghost" size="icon" className="h-9 w-9" disabled={idx <= 0} onClick={() => setSelectedScreen(screens[idx - 1].id)} aria-label="Previous screen">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="truncate text-sm font-medium">{screen.name}</div>
                <Badge variant="secondary" className="text-[10px]">{idx + 1} / {screens.length}</Badge>
                <Button variant="ghost" size="icon" className="h-9 w-9" disabled={idx >= screens.length - 1} onClick={() => setSelectedScreen(screens[idx + 1].id)} aria-label="Next screen">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="mx-1 hidden h-5 md:block" />
                <span className="hidden text-xs text-muted-foreground md:inline">{screenFindings.filter(f => f.status !== "DISMISSED").length} pins · click a pin to view explainable insights</span>
                <span className="text-xs text-muted-foreground md:hidden">{screenFindings.filter(f => f.status !== "DISMISSED").length} pins</span>
              </div>

              <div className="flex flex-1 items-center justify-center overflow-auto p-6">
                <div className="relative w-full max-w-3xl">
                  <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    {screen.imageUrl ? (
                      <img
                        src={screen.imageUrl}
                        alt={screen.name}
                        className="absolute inset-0 h-full w-full object-contain bg-secondary/20"
                      />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
                        <p className="mt-2 text-xs text-muted-foreground">{screen.name}</p>
                        <p className="text-[11px] text-muted-foreground/70">
                          Screen preview
                        </p>
                      </div>
                    )}

                    <TooltipProvider>
                      {screenFindings.filter((f) => f.status !== "DISMISSED").map((f, i) => {
                        const pos = { x: 20 + ((i * 13) % 70), y: 20 + ((i * 21) % 60) };
                        return (
                          <Tooltip key={f.id}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setOpen(f)}
                                className={cn(
                                  "absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md ring-2 ring-card transition hover:scale-110",
                                  pinTone[f.severity],
                                )}
                                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                                aria-label={`Finding ${i + 1} (${f.severity}): ${f.title}`}
                              >
                                {i + 1}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-xs font-medium">{f.title}</p>
                              <p className="text-[10px] text-muted-foreground">{f.severity} · {f.area}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </TooltipProvider>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground">
                    {(["P0", "P1", "P2"] as const).map((p) => (
                      <div key={p} className="flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 rounded-full", pinTone[p])} aria-hidden="true" />
                        <PriorityBadge priority={p} compact />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
              {allFindings.length > 0
                ? "Findings are available but no screens were uploaded."
                : "No findings yet."}
            </div>
          )}
        </section>
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {open && (
            <FindingDetail
              finding={open}
              screenImageUrl={screen?.imageUrl}
              onAction={(status) => handleFindingAction(open.id, status)}
              onBasisChange={(basis) => handleBasisChange(open.id, basis)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

// ──────────────────────────────────────────────
// Finding detail panel
// ──────────────────────────────────────────────

interface FindingDetailProps {
  finding: Finding;
  screenImageUrl?: string;
  onAction: (status: TriageStatus) => void;
  onBasisChange: (basis: ReviewBasisItem[]) => void;
}

function FindingDetail({ finding, screenImageUrl, onAction, onBasisChange }: FindingDetailProps) {
  const [basisSearch, setBasisSearch] = useState("");

  const filteredLibrary = useMemo(() => {
    const search = basisSearch.trim().toLowerCase();
    if (!search) return REVIEW_BASIS_LIBRARY;
    return REVIEW_BASIS_LIBRARY.filter((b) =>
      b.name.toLowerCase().includes(search) ||
      b.type.toLowerCase().includes(search)
    );
  }, [basisSearch]);

  const addBasisItem = (item: any) => {
    if (finding.reviewBasis.some((b) => b.name === item.name)) return;
    const newBasisItem: ReviewBasisItem = {
      type: item.type,
      name: item.name,
      explanation: item.explanation,
    };
    onBasisChange([...finding.reviewBasis, newBasisItem]);
  };

  const removeBasisItem = (name: string) => {
    onBasisChange(finding.reviewBasis.filter((b) => b.name !== name));
  };

  const needsBasis =
    (finding.status === "ACCEPTED" || finding.status === "EDITED") &&
    finding.reviewBasis.length === 0;

  return (
    <>
      <SheetHeader>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={finding.severity} />
          <FindingStatusBadge status={finding.status as any} />
          <Badge variant="outline">{finding.area}</Badge>
          {needsBasis && (
            <Badge variant="outline" className="gap-1 border-yellow-400/60 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
              <AlertTriangle className="h-3 w-3" />Incomplete — add basis
            </Badge>
          )}
        </div>
        <SheetTitle className="mt-2 text-left">{finding.title}</SheetTitle>
        <SheetDescription className="text-left">{finding.screen} · {finding.principle}</SheetDescription>
      </SheetHeader>

      <div className="mt-5 space-y-5 text-sm">
        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-secondary/40">
          {screenImageUrl ? (
            <img src={screenImageUrl} alt={finding.screen} className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
          )}
        </div>

        <Section title="Observation">{finding.observation || finding.description}</Section>
        <Section title="Why it matters">{finding.why}</Section>

        {/* ── Review Basis ─────────────────────────── */}
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Review Basis</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-[11px]">
                  <Plus className="h-3 w-3" />Add basis
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="border-b border-border p-2">
                  <Input
                    placeholder="Search principles…"
                    value={basisSearch}
                    onChange={(e) => setBasisSearch(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <ScrollArea className="h-64">
                  <div className="p-1">
                    {filteredLibrary.map((item) => {
                      const already = finding.reviewBasis.some((b) => b.name === item.name);
                      return (
                        <button
                          key={item.name}
                          onClick={() => addBasisItem(item)}
                          disabled={already}
                          className={cn(
                            "w-full rounded px-2 py-1.5 text-left transition",
                            already
                              ? "cursor-default opacity-40"
                              : "hover:bg-secondary/60"
                          )}
                        >
                          <p className="text-[11px] font-medium">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground">{item.type}</p>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>

          {finding.reviewBasis.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground italic">No basis mapped yet. Add at least one before approving.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {finding.reviewBasis.map((b) => (
                <div
                  key={b.name}
                  className="group flex items-start gap-1.5 rounded-lg border border-border bg-secondary/40 px-2.5 py-2 w-full"
                >
                  <BookOpen className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{b.type}</p>
                    <p className="text-xs font-semibold">{b.name}</p>
                    <p className="text-[11px] text-muted-foreground">{b.explanation}</p>
                  </div>
                  <button
                    onClick={() => removeBasisItem(b.name)}
                    className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                    aria-label={`Remove ${b.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* ─────────────────────────────────────────── */}

        <Section title="Recommendation">{finding.recommendation}</Section>
        <Section title="Business impact">{finding.businessImpact}</Section>
        {finding.a11yImpact && <Section title="Accessibility impact">{finding.a11yImpact}</Section>}
        {finding.requirement && <Section title="Linked requirement">{finding.requirement}</Section>}

        <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-accent">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI confidence · {finding.confidence}%
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            You decide the final outcome.
          </p>
        </div>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm" className="min-h-9"
            onClick={() => onAction("ACCEPTED")}
            disabled={finding.status === "ACCEPTED"}
          >
            <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Accept
          </Button>
          <Button
            size="sm" variant="outline" className="min-h-9"
            onClick={() => onAction("EDITED")}
            disabled={finding.status === "EDITED"}
          >
            <Edit3 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Edit & accept
          </Button>
          <Button
            size="sm" variant="outline" className="min-h-9"
            onClick={() => onAction("DISMISSED")}
            disabled={finding.status === "DISMISSED"}
          >
            <X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Dismiss
          </Button>
          <Button
            size="sm" variant="outline" className="min-h-9"
            onClick={() => onAction("ESCALATED")}
            disabled={finding.status === "ESCALATED"}
          >
            <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Escalate
          </Button>
          <Button size="sm" variant="outline" className="min-h-9"><MessageSquare className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Comment</Button>
          <Button size="sm" variant="outline" className="min-h-9">Create Jira ticket</Button>
          <Button size="sm" variant="ghost" className="min-h-9"><RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Regenerate</Button>
          <Button size="sm" variant="ghost" className="min-h-9"><AlertCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />False positive</Button>
        </div>
      </div>
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

function CardFallback() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-sm w-full text-center border border-border rounded-xl p-8 space-y-4 bg-card">
        <MonitorPlay className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="font-semibold">No review selected</h2>
        <p className="text-sm text-muted-foreground">Open a review from History or start a new one.</p>
        <div className="flex gap-2 justify-center">
          <Button asChild><Link href="/new-review">New Review</Link></Button>
          <Button asChild variant="outline"><Link href="/history">History</Link></Button>
        </div>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <>
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground text-sm">Loading…</p></div>}>
        <WorkspaceContent />
      </Suspense>
    </>
  );
}
