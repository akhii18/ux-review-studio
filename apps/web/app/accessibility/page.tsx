"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/ui/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { Search, ShieldCheck } from "lucide-react";
import { getAnalytics, listReviews, getFindings } from "@/lib/api";
import { toast } from "sonner";

export default function AccessibilityPage() {
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("all");
  const [analytics, setAnalytics] = useState<any>(null);
  const [a11yFindings, setA11yFindings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      getAnalytics().catch(() => null),
      listReviews().catch(() => [])
    ])
      .then(([analyticsData, reviewsData]) => {
        setAnalytics(analyticsData);
        
        const completedReviews = reviewsData.filter((r: any) => r.status === "completed");
        if (completedReviews.length > 0) {
          return Promise.all(
            completedReviews.map((r: any) => 
              getFindings(r.id)
                .then((res: any) => {
                  const arr = Array.isArray(res) ? res : res.findings || [];
                  return arr.map((f: any) => ({ ...f, productName: r.product }));
                })
                .catch(() => [])
            )
          );
        }
        return [];
      })
      .then((allFindingsGrouped) => {
        const flatFindings = allFindingsGrouped.flat();
        const a11y = flatFindings.filter(
          (f: any) => f.area === "ACCESSIBILITY" || (f.category && f.category.toLowerCase() === "accessibility")
        );
        setA11yFindings(a11y);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load accessibility findings");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const lq = q.toLowerCase();
    return a11yFindings.filter((f) => {
      // severity in DB could be P0, P1, P2
      const sev = f.severity || f.priority || "P2";
      if (priority !== "all" && sev !== priority) return false;
      if (status !== "all" && f.status?.toLowerCase() !== status.toLowerCase()) return false;
      
      if (lq) {
        const matchesText = [
          f.title,
          f.observation,
          f.principle,
          f.screen,
          f.productName
        ].some((s) => s && s.toLowerCase().includes(lq));
        if (!matchesText) return false;
      }
      return true;
    });
  }, [a11yFindings, q, priority, status]);

  const blockers = a11yFindings.filter((f) => (f.severity === "P0" || f.priority === "P0") && f.status !== "dismissed").length;
  const important = a11yFindings.filter((f) => (f.severity === "P1" || f.priority === "P1") && f.status !== "dismissed").length;
  const resolved = a11yFindings.filter((f) => f.status?.toLowerCase() === "resolved" || f.status?.toLowerCase() === "accepted").length;

  return (
    <>
      <AppHeader title="Accessibility" subtitle="WCAG 2.2 AA findings across all reviewed products" />
      <div className="flex-1 space-y-5 p-4 md:p-6">

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "A11y blockers (P0)", value: blockers, tone: "text-destructive" },
            { label: "Important (P1)",      value: important, tone: "text-warning" },
            { label: "Resolved / Accepted",  value: resolved, tone: "text-success" },
          ].map((s) => (
            <Card key={s.label} className="shadow-card">
              <CardContent className="p-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-semibold tabular-nums ${s.tone}`}>
                  {isLoading ? <Skeleton className="h-8 w-12" /> : s.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search findings…" className="h-10 pl-9" />
          </div>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-10 w-36" aria-label="Priority">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="P0">P0 — Blocker</SelectItem>
              <SelectItem value="P1">P1 — Important</SelectItem>
              <SelectItem value="P2">P2 — Polish</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 w-36" aria-label="Status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="proposed">Proposed</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="edited">Edited</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Findings */}
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              {a11yFindings.length === 0 ? "No accessibility findings yet." : "No findings match your filters."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {a11yFindings.length === 0
                ? "Run a review to discover accessibility issues."
                : "Try adjusting your filters."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((f) => (
              <Card key={f.id} className="shadow-card">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">{f.title}</p>
                    <div className="flex shrink-0 gap-1">
                      <SeverityBadge severity={f.severity || f.priority || "P2"} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {f.productName && <Badge variant="outline" className="text-[10px]">{f.productName}</Badge>}
                    {f.principle && <Badge variant="outline" className="text-[10px]">{f.principle}</Badge>}
                    {f.screen && <Badge variant="secondary" className="text-[10px]">{f.screen}</Badge>}
                    <Badge variant="secondary" className="text-[10px] capitalize">{f.status?.toLowerCase()}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-1.5 text-xs text-muted-foreground">
                  <p><span className="font-medium text-foreground">Observation:</span> {f.observation || f.description}</p>
                  <p><span className="font-medium text-foreground">Fix:</span> {f.recommendation}</p>
                  {f.a11yImpact && <p><span className="font-medium text-foreground">A11y impact:</span> {f.a11yImpact}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {a11yFindings.length} accessibility finding{a11yFindings.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </>
  );
}
