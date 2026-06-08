import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
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
import { a11yChecks, type A11yLevel, type A11yTestType } from "@/lib/mock-data";
import { PriorityBadge } from "@/components/priority-badge";

export const Route = createFileRoute("/accessibility")({
  head: () => ({ meta: [{ title: "Accessibility Checks — UXNavigator" }] }),
  component: A11yPage,
});

const levels: ("All" | A11yLevel)[] = ["All", "A", "AA", "AAA"];
const testTypes: ("All" | A11yTestType)[] = ["All", "Automated", "Manual", "AI-assisted"];

function A11yPage() {
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
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
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

        <Table>
          <TableCaption className="sr-only">
            Accessibility checks list — {list.length} results.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[260px]">Check</TableHead>
              <TableHead className="min-w-[220px]">Description</TableHead>
              <TableHead className="min-w-[300px]">Example &amp; recommended fix</TableHead>
              <TableHead className="min-w-[120px]">Type</TableHead>
              <TableHead className="min-w-[140px] text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((c) => (
              <TableRow key={c.id} className="align-top">
                <th
                  scope="row"
                  className="px-4 py-4 text-left align-top font-medium text-foreground"
                >
                  <p className="text-sm">{c.title}</p>
                  <p className="mt-0.5 text-[11px] font-normal text-muted-foreground">
                    WCAG {c.wcag} · Level {c.level} · {c.category}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <PriorityBadge priority={c.priority} compact />
                  </div>
                </th>
                <TableCell className="py-4 text-xs text-muted-foreground">
                  {c.description}
                </TableCell>
                <TableCell className="py-4">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Example failure
                  </p>
                  <p className="text-xs">{c.example}</p>
                  <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Recommended fix
                  </p>
                  <p className="text-xs text-[color:var(--success)]">→ {c.fix}</p>
                  {c.relatedPrinciples.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.relatedPrinciples.map((p) => (
                        <Badge key={p} variant="outline" className="text-[10px]">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
                <TableCell className="py-4">
                  <Badge variant="outline" className="text-[10px]">
                    {c.testType}
                  </Badge>
                </TableCell>
                <TableCell className="py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Badge
                      variant={c.enabled ? "secondary" : "outline"}
                      className="text-[10px]"
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
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex gap-1" role="tablist" aria-label={label}>
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
