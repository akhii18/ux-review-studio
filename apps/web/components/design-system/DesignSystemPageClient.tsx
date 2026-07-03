"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "@/components/ui/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, ExternalLink, History as HistoryIcon, Edit3, Search } from "lucide-react";
import { PriorityBadge } from "@/components/ui/PriorityBadge";

type RuleCategory = "Buttons" | "Typography" | "Cards" | "Forms" | "Icons" | "Spacing" | "Tables" | "Modals";
type Priority = "P0" | "P1" | "P2";
type Severity = "critical" | "high" | "medium" | "low";

type DesignSystemRule = {
  id: string;
  name: string;
  category: RuleCategory;
  description: string;
  priority: Priority;
  severity: Severity;
  status: "active" | "draft" | "deprecated";
  owner: string;
  updated: string;
  doc?: string;
  pass: string;
  fail: string;
};

const designSystemRules: DesignSystemRule[] = [
  { id: "ds-1", name: "Primary button uses indigo-700", category: "Buttons", description: "All primary CTAs must use #1E3A8A with white text.", priority: "P1", severity: "high", status: "active", owner: "Design System Team", updated: "2025-04-12", doc: "/docs/buttons", pass: "Primary button with #1E3A8A bg, white text.", fail: "Primary button in arbitrary blue or with low-contrast text." },
  { id: "ds-2", name: "Body text contrast ≥ 4.5:1", category: "Typography", description: "Body text must meet WCAG AA contrast against background.", priority: "P0", severity: "critical", status: "active", owner: "Accessibility Guild", updated: "2025-04-10", doc: "/docs/typography", pass: "#475569 text on white = 7.5:1.", fail: "#94A3B8 text on white = 2.9:1." },
  { id: "ds-3", name: "Card radius is 12px", category: "Cards", description: "All cards use --radius-lg (12px) for consistency.", priority: "P2", severity: "low", status: "active", owner: "Design System Team", updated: "2025-03-28", pass: "Cards with rounded-xl (12px).", fail: "Cards with mixed 4px, 8px, 16px radii." },
  { id: "ds-4", name: "Inputs use 40px minimum height", category: "Forms", description: "Inputs must be 40px tall for comfortable touch targets.", priority: "P1", severity: "medium", status: "active", owner: "Design System Team", updated: "2025-03-22", pass: "h-10 inputs.", fail: "h-7 inputs on touch devices." },
  { id: "ds-5", name: "Icons sized at 16/20/24", category: "Icons", description: "Use one of the three approved icon sizes only.", priority: "P2", severity: "low", status: "active", owner: "Design System Team", updated: "2025-03-15", pass: "Icons at 16px in dense rows.", fail: "Icon at 13px or 22px." },
  { id: "ds-6", name: "Spacing follows 8pt grid", category: "Spacing", description: "All spacing values must be multiples of 4 (preferably 8).", priority: "P1", severity: "medium", status: "active", owner: "Design System Team", updated: "2025-03-10", pass: "p-4, p-6, p-8.", fail: "p-[13px], p-[21px]." },
  { id: "ds-7", name: "Tables use zebra striping for >10 rows", category: "Tables", description: "Tables with more than 10 rows must alternate row backgrounds.", priority: "P2", severity: "low", status: "active", owner: "Design System Team", updated: "2025-03-04", pass: "Striped rows in long tables.", fail: "Flat 30-row table." },
  { id: "ds-8", name: "Modals max-width 560px", category: "Modals", description: "Modal dialogs must not exceed 560px width.", priority: "P1", severity: "medium", status: "active", owner: "Design System Team", updated: "2025-02-26", pass: "Modal at 560px max.", fail: "Modal at 900px on desktop." },
  { id: "ds-9", name: "Primary CTA per view", category: "Buttons", description: "Only one primary action visible at a time.", priority: "P1", severity: "medium", status: "active", owner: "Design System Team", updated: "2025-02-14", pass: "One primary, multiple secondary.", fail: "Three primary buttons in one card." },
  { id: "ds-10", name: "Form fields have visible labels", category: "Forms", description: "Placeholder is never a substitute for a label.", priority: "P0", severity: "critical", status: "active", owner: "Accessibility Guild", updated: "2025-02-02", pass: "<label> above input.", fail: "Placeholder-only inputs." },
];

const categories: RuleCategory[] = ["Buttons", "Typography", "Cards", "Forms", "Icons", "Spacing", "Tables", "Modals"];

export default function DesignSystemPageClient() {
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
