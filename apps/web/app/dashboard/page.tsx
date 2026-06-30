"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/ui/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReviewHistoryModal } from "@/components/dashboard/ReviewHistoryModal";
import type { ReviewHistoryItem } from "@/components/dashboard/ReviewHistoryModal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import {
  ArrowRight, ArrowUpRight, CheckCircle2, AlertOctagon,
  FileText, Plus, AlertTriangle,
  ExternalLink, History, Trash2,
  MoreVertical,
} from "lucide-react";
import { deleteReview, getAnalytics, listReviews } from "@/lib/api";
import { toast } from "sonner";

function toTitleCase(value: string) {
  const titleCased = value
    .replaceAll("_", " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return titleCased
    .replace(/\bUx\b/g, "UX")
    .replace(/\bUi\b/g, "UI")
    .replace(/\bAi\b/g, "AI")
    .replace(/\bPrd\b/g, "PRD");
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [isReviewHistoryOpen, setIsReviewHistoryOpen] = useState(false);

  const loadAnalytics = useCallback(async (showLoader = false) => {
    if (showLoader) setAnalyticsLoading(true);

    try {
      const data = await getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load analytics");
    } finally {
      if (showLoader) setAnalyticsLoading(false);
    }
  }, []);

  const loadReviews = useCallback(async (showLoader = false) => {
    if (showLoader) setReviewsLoading(true);

    try {
      const data = await listReviews();
      setReviews(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load reviews");
    } finally {
      if (showLoader) setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics(true);
    loadReviews(true);
  }, [loadAnalytics, loadReviews]);

  useEffect(() => {
    if (!isReviewHistoryOpen) return;

    loadReviews();
    const intervalId = setInterval(() => {
      loadReviews();
    }, 15000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isReviewHistoryOpen, loadReviews]);

  const handleDeleteReview = useCallback(async (reviewId: string) => {
    try {
      await deleteReview(reviewId);
      toast.success("Review deleted");
      await Promise.all([loadReviews(), loadAnalytics()]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete review");
    }
  }, [loadAnalytics, loadReviews]);

  const analyticsKpis = analytics?.kpis ?? {};
  const totalReviews = analyticsKpis.totalReviews ?? reviews.length;
  const completedReviews = analyticsKpis.completedReviews ?? reviews.filter((r) => r.status === "completed").length;
  const totalFindings = analyticsKpis.totalFindings ?? 0;
  const avgUxScore = analyticsKpis.avgUxScore ?? 0;
  const p0Count = analyticsKpis.p0Count ?? 0;
  const p1Count = analyticsKpis.p1Count ?? 0;
  const p2Count = analyticsKpis.p2Count ?? 0;
  const total = p0Count + p1Count + p2Count || 1;

  const inProgressReviews = reviews.filter((r) => ["in_progress", "running", "queued"].includes((r.status ?? "").toLowerCase())).length;
  const failedReviews = reviews.filter((r) => (r.status ?? "").toLowerCase() === "failed").length;
  const lowScoreReviews = reviews.filter((r) => typeof r.uxScore === "number" && r.uxScore < 70).length;
  const needsAttentionCount = typeof analytics?.needsAttention === "number"
    ? analytics.needsAttention
    : Number(analytics?.needsAttention?.untriagedP0 ?? 0);
  const acceptanceRate = totalReviews > 0 ? Math.round((completedReviews / totalReviews) * 100) : 0;
  const reportsGenerated = completedReviews;

  const kpis = [
    { label: "Total reviews", value: String(totalReviews), icon: CheckCircle2, tone: "text-success" },
    { label: "Issues identified", value: String(totalFindings), icon: AlertTriangle, tone: "text-warning" },
    { label: "P0 blockers", value: String(p0Count), icon: AlertOctagon, tone: "text-destructive" },
    { label: "Average UX score", value: String(avgUxScore || 0), icon: ArrowUpRight, tone: "text-primary" },
    { label: "Acceptance rate", value: `${acceptanceRate}%`, icon: CheckCircle2, tone: "text-info" },
    { label: "Reports generated", value: String(reportsGenerated), icon: FileText, tone: "text-accent-foreground" },
  ];

  const quickActions = useMemo(() => {
    const items = [
      {
        icon: Plus,
        label: totalReviews === 0 ? "Start first UX review" : "Start new UX review",
        to: "/new-review",
        hint: totalReviews === 0 ? "No reviews available" : `${totalReviews} reviews in workspace`,
      },
      {
        icon: ArrowRight,
        label: "Open workspace",
        to: "/workspace",
        hint: `${inProgressReviews} in progress`,
      },
      {
        icon: AlertOctagon,
        label: "Open triage",
        to: "/workspace",
        hint: `${needsAttentionCount} need attention`,
      },
      {
        icon: FileText,
        label: "View reports",
        to: "/reports",
        hint: `${reportsGenerated} generated`,
      },
      {
        icon: ArrowRight,
        label: "Review history",
        to: "/history",
        hint: `${totalReviews} total reviews`,
      },
      {
        icon: ArrowRight,
        label: "Prompt library",
        to: "/prompts",
        hint: `${totalFindings} findings tracked`,
      },
    ];

    return items;
  }, [inProgressReviews, needsAttentionCount, reportsGenerated, totalFindings, totalReviews]);

  const recurringIssues = useMemo(() => {
    const byArea = analytics?.findingsByArea ?? {};
    return Object.entries(byArea)
      .map(([title, count]) => ({ title: toTitleCase(String(title)), count: Number(count), principle: "—" }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [analytics]);

  const reviewHistoryItems: ReviewHistoryItem[] = useMemo(() => {
    return reviews.map((review) => {
      return {
        id: String(review.id),
        productName: review.product || "Unknown product",
        reviewName: review.name || "Untitled review",
        ownerName: review.owner || "Unassigned",
        status: String(review.status || "unknown"),
        reviewDateTime: review.updatedAt || review.createdAt || new Date().toISOString(),
        summary: `${review.reviewType || "ux"} review for ${review.domain || "general"} domain`,
        uxScore: typeof review.uxScore === "number" ? review.uxScore : null,
        findingCount: review?._count?.findings,
      };
    });
  }, [reviews]);

  const recentReviews = useMemo(() => {
    return [...reviews]
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [reviews]);

  return (
    <>
      <AppHeader title="Dashboard" subtitle="Operational overview of UX governance across your products" />
      <div className="flex-1 space-y-6 p-4 md:p-6">

        {/* Hero */}
        <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary to-info p-6 text-primary-foreground shadow-elegant md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/70">Welcome back</p>
              <h2 className="mt-1 text-2xl font-semibold md:text-3xl">UXNavigator</h2>
              <p className="mt-2 text-sm text-primary-foreground/85 md:text-[15px]">
                AI assists. You decide. Review screens, flows and PRDs with explainable, auditable findings.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" className="min-h-11 w-[220px] justify-center bg-card text-primary hover:bg-card/90">
                <Link href="/new-review"><Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />Start new UX review</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-11 w-[220px] justify-center border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link href="/workspace">Open workspace<ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Needs attention */}
        <Card className="border-destructive/30 bg-destructive/[0.03] shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-destructive" aria-hidden="true" />
              <CardTitle className="text-base">Needs attention</CardTitle>
            </div>
            <Button asChild variant="ghost" size="sm" className="min-h-9">
              <Link href="/workspace">Open triage<ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {analyticsLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
            ) : (
              <>
                <AttentionTile icon={AlertOctagon} label="Untriaged P0 findings" value={needsAttentionCount} tone="text-destructive" to="/workspace" />
                <AttentionTile icon={ArrowRight} label="Reviews in progress" value={inProgressReviews} tone="text-warning" to="/workspace" />
                <AttentionTile icon={AlertTriangle} label="Low-score reviews (<70)" value={lowScoreReviews} tone="text-warning" to="/history" />
                <AttentionTile icon={FileText} label="Failed reviews" value={failedReviews} tone="text-destructive" to="/history" />
              </>
            )}
          </CardContent>
        </Card>

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Key metrics">
          {analyticsLoading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            : kpis.map((k) => (
              <Card key={k.label} className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
                    <k.icon className={`h-4 w-4 ${k.tone}`} aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{k.value}</p>
                </CardContent>
              </Card>
            ))
          }
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Review health */}
          <Card className="shadow-card lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Review health</CardTitle>
              <p className="text-xs text-muted-foreground">Findings by priority across all reviews</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {analyticsLoading ? (
                <div className="space-y-3"><Skeleton className="h-6" /><Skeleton className="h-6" /><Skeleton className="h-6" /></div>
              ) : analytics?.kpis.totalFindings === 0 ? (
                <p className="text-sm text-muted-foreground">No findings yet. Run a review to see health data.</p>
              ) : (
                <>
                  {([
                    { p: "P0" as const, count: p0Count, pct: Math.round((p0Count / total) * 100) },
                    { p: "P1" as const, count: p1Count, pct: Math.round((p1Count / total) * 100) },
                    { p: "P2" as const, count: p2Count, pct: Math.round((p2Count / total) * 100) },
                  ]).map((s) => (
                    <div key={s.p} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <PriorityBadge priority={s.p} />
                        <span className="text-sm font-medium tabular-nums">{s.count}</span>
                      </div>
                      <Progress value={s.pct} className="h-1.5" aria-label={`${s.p} share`} />
                    </div>
                  ))}
                  <div className="rounded-lg border border-border bg-secondary/40 p-3 text-[11px] text-muted-foreground">
                    Severity uses <strong className="text-foreground">P0 / P1 / P2</strong>. AI proposes; humans approve.
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="shadow-card lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick actions</CardTitle>
              <p className="text-xs text-muted-foreground">Actions adapt to current review state</p>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {quickActions.map((a) => (
                <Link
                  key={a.label}
                  href={a.to}
                  className="group flex min-h-[68px] items-start gap-3 rounded-xl border border-border bg-card p-3.5 transition hover:border-primary/30 hover:bg-secondary/60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                    <a.icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{a.label}</p>
                    <p className="text-[11px] text-muted-foreground">{a.hint}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Recent reviews */}
          <Card className="shadow-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Recent reviews</CardTitle>
                <p className="text-xs text-muted-foreground">Latest activity across your workspace</p>
              </div>
              <Button variant="ghost" size="sm" className="min-h-9" onClick={() => setIsReviewHistoryOpen(true)}>
                Review History<ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
              {reviewsLoading ? (
                <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : reviews.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No reviews yet. <Link href="/new-review" className="text-primary underline">Start your first review.</Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Review</TableHead>
                        <TableHead className="hidden md:table-cell">Product</TableHead>
                        <TableHead className="hidden lg:table-cell">Type</TableHead>
                        <TableHead className="text-right">UX</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                        <TableHead className="hidden xl:table-cell">Owner</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentReviews.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <Link href={{ pathname: "/workspace", query: { reviewId: r.id } }} className="font-medium text-foreground hover:text-primary">{r.name}</Link>
                            <p className="text-[11px] text-muted-foreground">{r.createdAt?.slice(0, 10)}</p>
                          </TableCell>
                          <TableCell className="hidden text-sm md:table-cell">{r.product}</TableCell>
                          <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{r.reviewType}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{r.uxScore ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary" className="capitalize">{String(r.status || "unknown").replaceAll("_", " ")}</Badge>
                          </TableCell>
                          <TableCell className="hidden text-xs xl:table-cell">{r.owner || "User"}</TableCell>
                          <TableCell className="hidden text-right sm:table-cell">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" aria-label={`Actions for ${r.name}`} className="h-9 w-9">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-0 w-auto flex items-center gap-1 p-1">
                                <DropdownMenuItem asChild className="h-9 w-9 justify-center">
                                  <Link href={{ pathname: "/workspace", query: { reviewId: r.id } }} aria-label="Open review">
                                    <ExternalLink className="h-4 w-4" />
                                    <span className="sr-only">Open review</span>
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="h-9 w-9 justify-center">
                                  <Link href="/history" aria-label="Open review history">
                                    <History className="h-4 w-4" />
                                    <span className="sr-only">Open review history</span>
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="h-9 w-9 justify-center text-destructive focus:text-destructive"
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    void handleDeleteReview(String(r.id));
                                  }}
                                  aria-label="Delete review"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete review</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recurring issues */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Top recurring UX issues</CardTitle>
              <p className="text-xs text-muted-foreground">Across all reviews</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {analyticsLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
              ) : recurringIssues.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No recurring issues yet.</p>
              ) : recurringIssues.map((t: any, i: number) => (
                <div key={t.title} className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-card text-xs font-semibold text-primary ring-1 ring-border">{i + 1}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">{t.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {t.principle && t.principle !== "—" && <Badge variant="outline" className="font-bold">{t.principle}</Badge>}
                      <span className="font-bold">{t.count} occurrence{t.count !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <ReviewHistoryModal
        open={isReviewHistoryOpen}
        onOpenChange={setIsReviewHistoryOpen}
        items={reviewHistoryItems}
        isLoading={reviewsLoading}
        onDeleteReview={handleDeleteReview}
      />
    </>
  );
}

function AttentionTile({
  icon: Icon, label, value, tone, to,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone: string; to: string }) {
  return (
    <Link href={to} className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition hover:border-destructive/40 hover:shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-md bg-secondary/60 ${tone}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
    </Link>
  );
}
