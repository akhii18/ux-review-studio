import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, ExternalLink, History as HistoryIcon, Edit3, Search } from "lucide-react";
import { designSystemRules, type RuleCategory } from "@/lib/mock-data";
import { PriorityBadge } from "@/components/priority-badge";

export const Route = createFileRoute("/design-system")({
  head: () => ({ meta: [{ title: "Design System Rules — UXNavigator" }] }),
  component: DesignSystem,
});

const categories: RuleCategory[] = ["Buttons", "Typography", "Cards", "Forms", "Icons", "Spacing", "Tables", "Modals"];

function DesignSystem() {
  const [q, setQ] = useState("");

  const grouped = useMemo(() => {
    return categories.map((cat) => ({
      cat,
      rules: designSystemRules.filter((r) => r.category === cat && (q === "" || r.name.toLowerCase().includes(q.toLowerCase()))),
    })).filter((g) => g.rules.length > 0);
  }, [q]);

  return (
    <>
      <AppHeader title="Design System Rules" subtitle="Governance rules the AI uses to check design consistency" />
      <div className="flex-1 space-y-5 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rules…" className="h-10 pl-9" aria-label="Search rules" />
          </div>
          <Button variant="outline" className="min-h-10"><HistoryIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />Version history</Button>
          <Button variant="outline" className="min-h-10"><Upload className="mr-1.5 h-4 w-4" aria-hidden="true" />Import rules</Button>
          <Button className="min-h-10"><Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />Add rule</Button>
        </div>

        {grouped.map((g) => (
          <section key={g.cat} aria-labelledby={`cat-${g.cat}`}>
            <div className="mb-2 flex items-center gap-2">
              <h2 id={`cat-${g.cat}`} className="text-sm font-semibold">{g.cat}</h2>
              <Badge variant="outline" className="text-[10px]">{g.rules.length}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {g.rules.map((r) => (
                <Card key={r.id} className="shadow-card">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-tight">{r.name}</p>
                      <PriorityBadge priority={r.priority} compact />
                    </div>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-md border border-[color:var(--success)]/30 bg-[color:var(--success)]/5 p-2">
                        <p className="font-medium text-[color:var(--success)]">Pass</p>
                        <p className="text-foreground/80">{r.pass}</p>
                      </div>
                      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2">
                        <p className="font-medium text-destructive">Fail</p>
                        <p className="text-foreground/80">{r.fail}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
                      <span>Owner · {r.owner}</span>
                      <span>Updated {r.updated}</span>
                    </div>
                    <div className="flex gap-2">
                      {r.doc && <Button asChild size="sm" variant="outline" className="min-h-9"><a href={r.doc}><ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden="true" />Docs</a></Button>}
                      <Button size="sm" variant="ghost" className="min-h-9"><Edit3 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />Edit rule</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
