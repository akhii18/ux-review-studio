import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Copy, ExternalLink, GitCompare, Archive, FileBarChart } from "lucide-react";
import { reviews, type ReviewStatus } from "@/lib/mock-data";
import { PriorityBadge } from "@/components/priority-badge";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "Review History — UXNavigator" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | ReviewStatus>("all");
  const [compare, setCompare] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => reviews.filter(
    (r) => (status === "all" || r.status === status)
      && (q === "" || r.name.toLowerCase().includes(q.toLowerCase()) || r.product.toLowerCase().includes(q.toLowerCase()) || r.owner.toLowerCase().includes(q.toLowerCase())),
  ), [q, status]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <>
      <AppHeader title="Review History" subtitle="Search, filter, and compare reviews across products and domains" />
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by product, review, owner, domain…" className="h-10 pl-9" aria-label="Search reviews" />
          </div>
          <Button variant={compare ? "default" : "outline"} className="min-h-10" onClick={() => setCompare(!compare)}>
            <GitCompare className="mr-1.5 h-4 w-4" aria-hidden="true" />{compare ? `Compare (${selected.length})` : "Compare"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={status} onValueChange={(v) => setStatus(v as "all" | ReviewStatus)}>
            <TabsList className="gap-1">
              <TabsTrigger value="all" className="min-h-9 px-3">All</TabsTrigger>
              <TabsTrigger value="draft" className="min-h-9 px-3">Draft</TabsTrigger>
              <TabsTrigger value="in_progress" className="min-h-9 px-3">In Progress</TabsTrigger>
              <TabsTrigger value="completed" className="min-h-9 px-3">Completed</TabsTrigger>
              <TabsTrigger value="archived" className="min-h-9 px-3">Archived</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select><SelectTrigger className="h-10" style={{ width: 150 }} aria-label="Domain"><SelectValue placeholder="Domain" /></SelectTrigger><SelectContent><SelectItem value="all">All domains</SelectItem><SelectItem value="bfsi">BFSI</SelectItem><SelectItem value="health">Healthcare</SelectItem><SelectItem value="retail">Retail</SelectItem></SelectContent></Select>
          <Select><SelectTrigger className="h-10" style={{ width: 150 }} aria-label="Type"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All types</SelectItem><SelectItem value="full">Full UX Review</SelectItem><SelectItem value="prd">PRD Alignment</SelectItem><SelectItem value="a11y">Accessibility</SelectItem></SelectContent></Select>
          <Select><SelectTrigger className="h-10" style={{ width: 170 }} aria-label="Sort"><SelectValue placeholder="Sort: Latest" /></SelectTrigger><SelectContent><SelectItem value="latest">Sort: Latest</SelectItem><SelectItem value="score">Sort: UX Score</SelectItem><SelectItem value="p0">Sort: P0 count</SelectItem><SelectItem value="issues">Sort: Issue count</SelectItem></SelectContent></Select>
        </div>

        <Card className="shadow-card">
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {compare && <TableHead className="w-8" />}
                  <TableHead>Review</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">UX Score</TableHead>
                  <TableHead className="text-right">Issues</TableHead>
                  <TableHead className="text-right">P0</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    {compare && (
                      <TableCell>
                        <Checkbox checked={selected.includes(r.id)} onCheckedChange={() => toggle(r.id)} aria-label={`Select ${r.name}`} />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      <Link to="/workspace" className="hover:text-primary">{r.name}</Link>
                      <p className="text-[11px] text-muted-foreground">{r.date} · {r.lastUpdated}</p>
                    </TableCell>
                    <TableCell className="text-sm">{r.product}</TableCell>
                    <TableCell className="text-sm">{r.domain}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.type}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{r.uxScore}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{r.issues}</TableCell>
                    <TableCell className="text-right">
                      {r.p0 > 0
                        ? <span className="inline-flex items-center gap-1"><PriorityBadge priority="P0" compact /><span className="text-xs tabular-nums">{r.p0}</span></span>
                        : <span className="text-xs text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-xs">{r.owner}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{r.status.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild size="icon" variant="ghost" aria-label={`Open ${r.name}`} className="h-9 w-9"><Link to="/workspace"><ExternalLink className="h-4 w-4" /></Link></Button>
                        <Button size="icon" variant="ghost" aria-label="Duplicate" className="h-9 w-9"><Copy className="h-4 w-4" /></Button>
                        <Button asChild size="icon" variant="ghost" aria-label="Generate report" className="h-9 w-9"><Link to="/reports"><FileBarChart className="h-4 w-4" /></Link></Button>
                        <Button size="icon" variant="ghost" aria-label="Archive" className="h-9 w-9"><Archive className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">No reviews match your filters.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
