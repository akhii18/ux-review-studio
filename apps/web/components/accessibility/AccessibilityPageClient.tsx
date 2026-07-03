"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "@/components/ui/AppHeader";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import { PriorityBadge } from "@/components/ui/PriorityBadge";

type Priority = "P0" | "P1" | "P2";
type Severity = "critical" | "high" | "medium" | "low";
type A11yLevel = "A" | "AA" | "AAA";
type A11yTestType = "Automated" | "Manual" | "AI-assisted";

type A11yCheck = {
  id: string;
  title: string;
  wcag: string;
  level: A11yLevel;
  priority: Priority;
  severity: Severity;
  category: string;
  description: string;
  example: string;
  fix: string;
  enabled: boolean;
  testType: A11yTestType;
  relatedPrinciples: string[];
};

const a11yChecks: A11yCheck[] = [
  { id: "a11y-1", title: "Color contrast ≥ 4.5:1 for body text", wcag: "1.4.3", level: "AA", priority: "P0", severity: "critical", category: "Color contrast", description: "Body text contrast against background.", example: "#94A3B8 text on white = 2.9:1 (fail)", fix: "Use #475569 or darker.", enabled: true, testType: "Automated", relatedPrinciples: ["WCAG 1.4.3 — Contrast (AA)"] },
  { id: "a11y-2", title: "All interactive elements reachable by keyboard", wcag: "2.1.1", level: "A", priority: "P0", severity: "critical", category: "Keyboard navigation", description: "Every action must be operable via keyboard.", example: "Custom dropdown only opens on click.", fix: "Add Enter/Space handlers and focus management.", enabled: true, testType: "Manual", relatedPrinciples: ["WCAG 2.1.1 — Keyboard"] },
  { id: "a11y-3", title: "Visible focus indicator", wcag: "2.4.7", level: "AA", priority: "P1", severity: "high", category: "Focus state", description: "Focus state must be clearly visible.", example: "Default outline removed without replacement.", fix: "Provide a 2px focus ring with 3:1 contrast.", enabled: true, testType: "Automated", relatedPrinciples: ["WCAG 2.4.7 — Focus Visible"] },
  { id: "a11y-4", title: "Form fields have associated labels", wcag: "3.3.2", level: "A", priority: "P0", severity: "critical", category: "Form labels", description: "Every input has a programmatic label.", example: "Placeholder used as label only.", fix: "Add <label htmlFor> or aria-label.", enabled: true, testType: "AI-assisted", relatedPrinciples: ["Nielsen — Recognition over recall"] },
  { id: "a11y-5", title: "Touch targets ≥ 44×44px", wcag: "2.5.5", level: "AAA", priority: "P1", severity: "medium", category: "Touch targets", description: "Tap targets on touch devices.", example: "Icon button is 24×24px.", fix: "Increase to 44×44 or add padding.", enabled: true, testType: "Automated", relatedPrinciples: ["Fitts's Law"] },
  { id: "a11y-6", title: "Images have meaningful alt text", wcag: "1.1.1", level: "A", priority: "P1", severity: "high", category: "Alternative text", description: "Non-decorative images need alt.", example: "Hero image with empty alt.", fix: "Describe the image's content/function.", enabled: true, testType: "AI-assisted", relatedPrinciples: [] },
  { id: "a11y-7", title: "Headings follow a logical hierarchy", wcag: "1.3.1", level: "A", priority: "P1", severity: "medium", category: "Heading structure", description: "No skipped heading levels.", example: "h1 followed by h4.", fix: "Use sequential heading levels.", enabled: true, testType: "Automated", relatedPrinciples: [] },
  { id: "a11y-8", title: "Errors identified in text, not just color", wcag: "1.4.1", level: "A", priority: "P1", severity: "high", category: "Error identification", description: "Don't rely on color alone.", example: "Red border with no icon or text.", fix: "Add icon and explicit message.", enabled: true, testType: "AI-assisted", relatedPrinciples: [] },
  { id: "a11y-9", title: "Captions / transcripts for media", wcag: "1.2.2", level: "A", priority: "P1", severity: "high", category: "Media", description: "Pre-recorded media has captions.", example: "Video tutorial without captions.", fix: "Add closed captions and transcript.", enabled: true, testType: "Manual", relatedPrinciples: [] },
  { id: "a11y-10", title: "ARIA only where needed", wcag: "4.1.2", level: "A", priority: "P2", severity: "medium", category: "ARIA", description: "No redundant or incorrect ARIA on semantic elements.", example: "role='button' on a native <button>.", fix: "Use semantic HTML first; remove redundant ARIA.", enabled: true, testType: "AI-assisted", relatedPrinciples: [] },
  { id: "a11y-11", title: "Screen reader interpretation is meaningful", wcag: "4.1.2", level: "A", priority: "P0", severity: "critical", category: "Screen reader", description: "Interactive elements have accessible names.", example: "Icon-only button with no aria-label.", fix: "Add aria-label or visible text.", enabled: true, testType: "Manual", relatedPrinciples: [] },
];

const levels: ("All" | A11yLevel)[] = ["All", "A", "AA", "AAA"];
const testTypes: ("All" | A11yTestType)[] = ["All", "Automated", "Manual", "AI-assisted"];

export default function AccessibilityPageClient() {
  const [q, setQ] = useState("");
  const [lvl, setLvl] = useState<"All" | A11yLevel>("All");
  const [tt, setTt] = useState<"All" | A11yTestType>("All");

  const list = useMemo(
    () =>
      a11yChecks.filter(
        (c) =>
          (lvl === "All" || c.level === lvl) &&
          (tt === "All" || c.testType === tt) &&
          (q === "" || c.title.toLowerCase().includes(q.toLowerCase())),
      ),
    [q, lvl, tt],
  );

  return (
    <>
      <AppHeader
        title="Accessibility Checks"
        subtitle="WCAG 2.2 checklist applied across every accessibility review"
      />
      <div className="flex-1 space-y-4 overflow-hidden p-4 md:p-6">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search checks…"
              className="h-10 pl-9"
              aria-label="Search accessibility checks"
            />
          </div>
          <FilterPills
            label="WCAG level"
            value={lvl}
            setValue={(v) => setLvl(v as "All" | A11yLevel)}
            options={levels}
          />
          <FilterPills
            label="Test type"
            value={tt}
            setValue={(v) => setTt(v as "All" | A11yTestType)}
            options={testTypes}
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <Table className="w-full table-fixed">
          <TableCaption className="sr-only">
            Accessibility checks list — {list.length} results.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[24%]">Check</TableHead>
              <TableHead className="w-[20%]">Description</TableHead>
              <TableHead className="w-[32%]">Example &amp; recommended fix</TableHead>
              <TableHead className="w-[11%]">Type</TableHead>
              <TableHead className="w-[13%] text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((c) => (
              <TableRow key={c.id} className="align-top">
                <th
                  scope="row"
                  className="break-words px-3 py-4 text-left align-top font-medium text-foreground md:px-4"
                >
                  <p className="text-sm leading-snug">{c.title}</p>
                  <p className="mt-0.5 text-[11px] font-normal text-muted-foreground">
                    WCAG {c.wcag} · Level {c.level} · {c.category}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <PriorityBadge priority={c.priority} compact />
                  </div>
                </th>
                <TableCell className="break-words px-3 py-4 text-xs text-muted-foreground md:px-4">
                  {c.description}
                </TableCell>
                <TableCell className="break-words px-3 py-4 md:px-4">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Example failure
                  </p>
                  <p className="text-xs">{c.example}</p>
                  <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Recommended fix
                  </p>
                  <p className="break-words text-xs text-[color:var(--success)]">→ {c.fix}</p>
                  {c.relatedPrinciples.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.relatedPrinciples.map((p) => (
                        <Badge key={p} variant="outline" className="max-w-full whitespace-normal break-words text-[10px] leading-tight">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="break-words px-3 py-4 md:px-4">
                  <Badge variant="outline" className="whitespace-normal text-[10px] leading-tight">
                    {c.testType}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 py-4 md:px-4">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge
                      variant={c.enabled ? "secondary" : "outline"}
                      className="whitespace-normal text-[10px] leading-tight"
                    >
                      {c.enabled ? "Enabled" : "Off"}
                    </Badge>
                    <Switch defaultChecked={c.enabled} aria-label={`Toggle ${c.title}`} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>

        {list.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No accessibility checks match your filters.
          </p>
        )}
      </div>
    </>
  );
}

function FilterPills({
  label,
  value,
  setValue,
  options,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex min-w-0 flex-wrap gap-1" role="tablist" aria-label={label}>
        {options.map((o) => (
          <button
            key={o}
            onClick={() => setValue(o)}
            role="tab"
            aria-selected={value === o}
            className={`min-h-9 rounded-md border px-2.5 py-1 text-[11px] font-medium ${
              value === o
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-secondary"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}