import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Star, Eye, Copy, Edit3, Sparkles, ShieldCheck } from "lucide-react";
import { prompts } from "@/lib/mock-data";

export const Route = createFileRoute("/prompts")({
  head: () => ({ meta: [{ title: "Prompt Library — UXNavigator" }] }),
  component: PromptLibrary,
});

const categories = [
  "All", "Full UX Review", "PRD Alignment", "Accessibility Review",
  "Design System Review", "Content Review", "Domain-specific",
];

function PromptLibrary() {
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");

  const list = useMemo(
    () => prompts.filter(
      (p) => (cat === "All" || p.category === cat)
        && (q === "" || p.name.toLowerCase().includes(q.toLowerCase()) || p.tags.some((t) => t.includes(q.toLowerCase()))),
    ),
    [cat, q],
  );

  return (
    <>
      <AppHeader title="Prompt Library" subtitle="Reusable, governed prompts for consistent AI reviews" />
      <div className="flex-1 space-y-5 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search prompts…" className="h-10 pl-9" aria-label="Search prompts" />
          </div>
          <Button className="min-h-10"><Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />New prompt</Button>
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist">
          {categories.map((c) => (
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
            <Card key={p.id} className="shadow-card transition hover:border-primary/30">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>
                    <Badge variant="outline" className="text-[10px]">{p.version}</Badge>
                    {p.approved && (
                      <Badge className="gap-1 bg-[color:var(--success)]/15 text-[color:var(--success)] hover:bg-[color:var(--success)]/20 ring-1 ring-[color:var(--success)]/30 text-[10px]">
                        <ShieldCheck className="h-3 w-3" aria-hidden="true" />Approved
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-[color:var(--warning)] text-[color:var(--warning)]" aria-hidden="true" />
                    {p.rating}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px]">#{t}</Badge>)}
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-secondary/40 p-2.5 text-[11px]">
                  <Meta label="Owner" value={p.owner} />
                  <Meta label="Approved by" value={p.approvedBy} />
                  <Meta label="Checklist" value={p.checklistVersion} />
                  <Meta label="Risk" value={p.riskLevel} capitalize />
                  <Meta label="Used" value={`${p.usedCount}×`} />
                  <Meta label="Last used" value={p.lastUsed} />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" className="min-h-9 flex-1"><Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden="true" />Use prompt</Button>
                  <Button size="icon" variant="outline" aria-label="Preview" className="h-9 w-9"><Eye className="h-4 w-4" /></Button>
                  <Button size="icon" variant="outline" aria-label="Edit" className="h-9 w-9"><Edit3 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="outline" aria-label="Duplicate" className="h-9 w-9"><Copy className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

function Meta({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-[11px] font-medium ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}
