"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/ui/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import {
  ArrowRight, ArrowUpRight, CheckCircle2, AlertOctagon, Clock,
  FileText, Upload, Figma, GitCompare, Sparkles, Plus, AlertTriangle,
  Accessibility, FileWarning, MoreHorizontal,
} from "lucide-react";
import { getAnalytics, listReviews } from "@/lib/api";
import { toast } from "sonner";

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    getAnalytics()
      .then((data) => {
        setAnalytics(data);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load analytics");
      })
      .finally(() => setAnalyticsLoading(false));

    listReviews()
      .then((data) => {
        setReviews(data);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load reviews");
      })
      .finally(() => setReviewsLoading(false));
  }, []);

  const na = analytics?.needsAttention;
  const kpis = analytics ? [
    { label: "Reviews completed", value: String(analytics.kpis.totalReviews || analytics.kpis.completedReviews || 0), icon: CheckCircle2, tone: "text-success" },
    { label: "Issues identified", value: String(analytics.kpis.totalFindings || 0), icon: AlertTriangle, tone: "text-warning" },
    { label: "P0 blockers", value: String(analytics.kpis.p0Count || 0), icon: AlertOctagon, tone: "text-destructive" },
    { label: "Average UX score", value: String(analytics.kpis.avgUxScore || "—"), icon: ArrowUpRight, tone: "text-primary" },
    { label: "Acceptance rate", value: `${analytics.kpis.acceptanceRate || 0}%`, icon: CheckCircle2, tone: "text-info" },
    { label: "Reports generated", value: "—", icon: FileText, tone: "text-accent-foreground" },
  ] : [];

  const p0Count = analytics?.kpis.p0Count ?? 0;
  const p1Count = analytics?.kpis.totalFindings
    ? Math.round(analytics.kpis.totalFindings * 0.38)
    : 0;
  const p2Count = analytics?.kpis.totalFindings
    ? analytics.kpis.totalFindings - p0Count - p1Count
    : 0;
  const total = p0Count + p1Count + p2Count || 1;

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
              <Button asChild size="lg" className="min-h-11 bg-card text-primary hover:bg-card/90">
                <Link href="/new-review"><Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />Start new UX review</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-11 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
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
                <AttentionTile icon={AlertOctagon} label="Untriaged P0 findings" value={na?.untriagedP0 ?? 0} tone="text-destructive" to="/workspace" />
                <AttentionTile icon={CheckCircle2} label="Proposed findings" value={na?.awaitingApproval ?? 0} tone="text-warning" to="/workspace" />
                <AttentionTile icon={Accessibility} label="Accessibility blockers" value={na?.a11yBlockers ?? 0} tone="text-destructive" to="/accessibility" />
                <AttentionTile icon={FileWarning} label="Failed reviews" value={na?.failedReviews ?? 0} tone="text-warning" to="/history" />
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
              <p className="text-xs text-muted-foreground">Start common tasks in one click</p>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {[
                { icon: Upload, label: "Upload screens", to: "/new-review" },
                { icon: Figma, label: "Review Figma prototype", to: "/new-review" },
                { icon: FileText, label: "Compare with PRD", to: "/workspace" },
                { icon: FileText, label: "Generate report", to: "/reports" },
                { icon: Sparkles, label: "Open prompt library", to: "/prompts" },
                { icon: GitCompare, label: "Compare reviews", to: "/history" },
              ].map((a) => (
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
                    <p className="text-[11px] text-muted-foreground">Get started</p>
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
              <Button asChild variant="ghost" size="sm" className="min-h-9">
                <Link href="/history">View all<ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
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
                      {reviews.slice(0, 5).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <Link href={{ pathname: "/workspace", query: { reviewId: r.id } }} className="font-medium text-foreground hover:text-primary">{r.name}</Link>
                            <p className="text-[11px] text-muted-foreground">{r.createdAt?.slice(0, 10)}</p>
                          </TableCell>
                          <TableCell className="hidden text-sm md:table-cell">{r.product}</TableCell>
                          <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{r.reviewType}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{r.uxScore ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary" className="capitalize">{r.status.replace("_", " ")}</Badge>
                          </TableCell>
                          <TableCell className="hidden text-xs xl:table-cell">{r.owner || "User"}</TableCell>
                          <TableCell className="hidden text-right sm:table-cell">
                            <Button asChild size="icon" variant="ghost" aria-label={`Open ${r.name}`} className="h-9 w-9">
                              <Link href={{ pathname: "/workspace", query: { reviewId: r.id } }}><MoreHorizontal className="h-4 w-4" /></Link>
                            </Button>
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
              ) : !analytics?.recurringIssues?.length ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No recurring issues yet.</p>
              ) : analytics.recurringIssues.map((t: any, i: number) => (
                <div key={t.title} className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-card text-xs font-semibold text-primary ring-1 ring-border">{i + 1}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{t.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {t.principle && t.principle !== "—" && <Badge variant="outline" className="font-normal">{t.principle}</Badge>}
                      <span>{t.count} occurrence{t.count !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
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
