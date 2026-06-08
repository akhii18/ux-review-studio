import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookMarked, Search } from "lucide-react";
import { principles, type PrincipleCategory } from "@/lib/mock-data";

export const Route = createFileRoute("/principles")({
  head: () => ({ meta: [{ title: "UX Principles — UXNavigator" }] }),
  component: Principles,
});

const allCategories: ("All" | PrincipleCategory)[] = [
  "All", "Nielsen heuristics", "Cognitive & interaction laws", "Gestalt principles",
  "Visual design", "Accessibility", "Content & microcopy",
];

function Principles() {
  const [cat, setCat] = useState<"All" | PrincipleCategory>("All");
  const [q, setQ] = useState("");
  const list = useMemo(
    () => principles.filter(
      (p) => (cat === "All" || p.category === cat) &&
        (q === "" || p.name.toLowerCase().includes(q.toLowerCase()) || p.definition.toLowerCase().includes(q.toLowerCase()))
    ),
    [cat, q],
  );

  return (
    <>
      <AppHeader title="UX Principles" subtitle="Governance knowledge base applied automatically by the AI reviewer" />
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search principles…" className="h-10 pl-9" aria-label="Search principles" />
          </div>
          <p className="text-xs text-muted-foreground">{list.length} active principles</p>
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Principle categories">
          {allCategories.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={cat === c}
              onClick={() => setCat(c)}
              className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition ${cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-secondary"}`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <Card key={p.name} className="shadow-card transition hover:border-primary/30">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><BookMarked className="h-4 w-4" aria-hidden="true" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{p.category}</p>
                  </div>
                  <Badge variant={p.active ? "secondary" : "outline"} className="ml-auto text-[10px]">{p.active ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="text-xs text-foreground/90">{p.definition}</p>
                <Detail label="When to apply" value={p.when} />
                <Detail label="What AI flags" value={p.aiFlags} />
                <div className="rounded-md border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/5 p-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[color:var(--warning)]">Example issue</p>
                  <p className="mt-0.5 text-xs">{p.example}</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap gap-1">
                    {p.relatedAreas.map((a) => <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>)}
                  </div>
                  <span className="text-[11px] text-muted-foreground">Used in {p.usedIn} reviews</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs">{value}</p>
    </div>
  );
}
