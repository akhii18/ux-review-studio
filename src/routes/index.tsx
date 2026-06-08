import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PriorityBadge } from "@/components/priority-badge";
import {
  ArrowRight, ArrowUpRight, CheckCircle2, AlertOctagon, Clock,
  FileText, Upload, Figma, GitCompare, Sparkles, Plus, AlertTriangle,
  Accessibility, FileWarning, MoreHorizontal,
} from "lucide-react";
import { reviews, recurringIssues, needsAttention } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — UXNavigator" }] }),
  component: Dashboard,
});

const kpis = [
  { label: "Reviews completed", value: "128", delta: "+12 this month", icon: CheckCircle2, tone: "text-[color:var(--success)]" },
  { label: "Issues identified", value: "2,431", delta: "+184 this week", icon: AlertTriangle, tone: "text-[color:var(--warning)]" },
  { label: "P0 blockers", value: "47", delta: "−6 vs last week", icon: AlertOctagon, tone: "text-destructive" },
  { label: "Average UX score", value: "78", delta: "+3 pts", icon: ArrowUpRight, tone: "text-primary" },
  { label: "Time saved", value: "412 hrs", delta: "AI-assisted", icon: Clock, tone: "text-[color:var(--info)]" },
  { label: "Reports generated", value: "96", delta: "+8 this month", icon: FileText, tone: "text-accent" },
];

const severityBreakdown = [
  { p: "P0" as const, count: 47, pct: 8 },
  { p: "P1" as const, count: 213, pct: 38 },
  { p: "P2" as const, count: 620, pct: 54 },
];

function Dashboard() {
  return (
    <>
      <AppHeader title="Dashboard" subtitle="Operational overview of UX governance across your products" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Welcome / primary CTA */}
        <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary to-[color:var(--info)] p-6 text-primary-foreground shadow-elegant md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/70">Welcome back</p>
              <h2 className="mt-1 text-2xl font-semibold md:text-3xl">Hello, Rakhee</h2>
              <p className="mt-2 text-sm text-primary-foreground/85 md:text-[15px]">
                AI assists. You decide. Review screens, flows and PRDs with explainable, auditable findings.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" className="min-h-11 bg-card text-primary hover:bg-card/90">
                <Link to="/new-review"><Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />Start new UX review</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-11 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                <Link to="/workspace">Open workspace<ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" /></Link>
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
              <Link to="/workspace">Open triage<ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <AttentionTile icon={AlertOctagon} label="Untriaged P0 findings" value={needsAttention.untriagedP0} tone="text-destructive" to="/workspace" />
            <AttentionTile icon={CheckCircle2} label="Reviews awaiting approval" value={needsAttention.awaitingApproval} tone="text-[color:var(--warning)]" to="/history" />
            <AttentionTile icon={Accessibility} label="Accessibility blockers" value={needsAttention.a11yBlockers} tone="text-destructive" to="/accessibility" />
            <AttentionTile icon={FileWarning} label="Failed / pending exports" value={needsAttention.failedExports} tone="text-[color:var(--warning)]" to="/reports" />
          </CardContent>
        </Card>

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Key metrics">
          {kpis.map((k) => (
            <Card key={k.label} className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
                  <k.icon className={`h-4 w-4 ${k.tone}`} aria-hidden="true" />
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{k.value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{k.delta}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Review health */}
          <Card className="shadow-card lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Review health</CardTitle>
              <p className="text-xs text-muted-foreground">Findings by priority, last 30 days</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {severityBreakdown.map((s) => (
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
                  to={a.to}
                  className="group flex min-h-[68px] items-start gap-3 rounded-xl border border-border bg-card p-3.5 transition hover:border-primary/30 hover:bg-secondary/60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                    <a.icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
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
                <Link to="/history">View all<ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Review</TableHead>
                      <TableHead className="hidden md:table-cell">Product</TableHead>
                      <TableHead className="hidden lg:table-cell">Type</TableHead>
                      <TableHead className="text-right">UX</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Findings</TableHead>
                      <TableHead className="text-right">P0</TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead className="hidden xl:table-cell">Owner</TableHead>
                      <TableHead className="hidden xl:table-cell">Updated</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.slice(0, 5).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Link to="/workspace" className="font-medium text-foreground hover:text-primary">{r.name}</Link>
                          <p className="text-[11px] text-muted-foreground">{r.date}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground md:hidden">{r.product} · {r.type}</p>
                        </TableCell>
                        <TableCell className="hidden text-sm md:table-cell">{r.product}</TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{r.type}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{r.uxScore}</TableCell>
                        <TableCell className="hidden text-right text-sm tabular-nums sm:table-cell">{r.issues}</TableCell>
                        <TableCell className="text-right">
                          {r.p0 > 0
                            ? <span className="inline-flex items-center gap-1"><PriorityBadge priority="P0" compact /><span className="text-xs tabular-nums">{r.p0}</span></span>
                            : <span className="text-xs text-muted-foreground">0</span>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell"><Badge variant="secondary" className="capitalize">{r.status.replace("_", " ")}</Badge></TableCell>
                        <TableCell className="hidden text-xs xl:table-cell">{r.owner}</TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">{r.lastUpdated}</TableCell>
                        <TableCell className="hidden text-right sm:table-cell">
                          <Button asChild size="icon" variant="ghost" aria-label={`Open ${r.name}`} className="h-9 w-9">
                            <Link to="/workspace"><MoreHorizontal className="h-4 w-4" /></Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Top recurring issues */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Top recurring UX issues</CardTitle>
              <p className="text-xs text-muted-foreground">Across all reviews, last 90 days</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {recurringIssues.map((t, i) => (
                <div key={t.title} className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-card text-xs font-semibold text-primary ring-1 ring-border">{i + 1}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{t.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <Badge variant="outline" className="font-normal">{t.principle}</Badge>
                      <span>·</span>
                      <span>{t.count} occurrences</span>
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
    <Link to={to} className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition hover:border-destructive/40 hover:shadow-sm">
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
