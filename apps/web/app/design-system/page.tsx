"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/ui/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { Search, Layers } from "lucide-react";
import { getAnalytics, listReviews, getFindings } from "@/lib/api";
import { toast } from "sonner";

export default function DesignSystemPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [findings, setFindings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    listReviews()
      .then((reviewsData) => {
        const completedReviews = reviewsData.filter((r: any) => r.status === "completed");
        if (completedReviews.length > 0) {
          return Promise.all(
            completedReviews.map((r: any) =>
              getFindings(r.id)
                .then((res: any) => {
                  const arr = Array.isArray(res) ? res : res.findings || [];
                  return arr.map((f: any) => ({
                    ...f,
                    product: r.product,
                    reviewName: r.name
                  }));
                })
                .catch(() => [])
            )
          );
        }
        return [];
      })
      .then((allFindingsGrouped) => {
        const flatFindings = allFindingsGrouped.flat();
        const designFindings = flatFindings.filter(
          (f: any) =>
            f.area === "CONSISTENCY" ||
            f.category === "Design System" ||
            f.category === "Visual Design" ||
            f.category === "Consistency"
        );
        // Normalize categories for UI filters
        const normalized = designFindings.map((f: any) => {
          let category = f.category || "Design System";
          if (f.area === "CONSISTENCY" && !f.category) {
            category = "Consistency";
          }
          return { ...f, category };
        });
        setFindings(normalized);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load design system findings");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(findings.map((f) => f.category));
    return ["All", ...Array.from(cats).sort()];
  }, [findings]);

  const filtered = useMemo(() => {
    const lq = q.toLowerCase();
    return findings.filter((f) => {
      if (cat !== "All" && f.category !== cat) return false;
      if (lq) {
        const matchesText = [
          f.title,
          f.observation,
          f.product,
          f.principle,
          f.description
        ].some((s) => s && s.toLowerCase().includes(lq));
        if (!matchesText) return false;
      }
      return true;
    });
  }, [findings, q, cat]);

  return (
    <>
      <AppHeader title="Design System" subtitle="Design consistency and visual system findings across reviews" />
      <div className="flex-1 space-y-5 p-4 md:p-6">

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search design findings…" className="h-10 pl-9" />
          </div>
        </div>

        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  cat === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Layers className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              {findings.length === 0 ? "No design system findings yet." : "No findings match your filters."}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {findings.length === 0
                ? "Design System and Visual Design findings from reviews will appear here."
                : "Try adjusting your filters."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{filtered.length} finding{filtered.length !== 1 ? "s" : ""}</p>
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
                      <Badge variant="outline" className="text-[10px]">{f.category}</Badge>
                      {f.screen && <Badge variant="secondary" className="text-[10px]">{f.screen}</Badge>}
                      <Badge variant="secondary" className="text-[10px]">{f.product}</Badge>
                      <Badge variant="secondary" className="text-[10px] capitalize">{f.status?.toLowerCase()}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1 text-xs text-muted-foreground">
                    <p><span className="font-medium text-foreground">Observation:</span> {f.observation || f.description}</p>
                    <p><span className="font-medium text-foreground">Recommendation:</span> {f.recommendation}</p>
                    {f.principle && <p><span className="font-medium text-foreground">Principle:</span> {f.principle}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
