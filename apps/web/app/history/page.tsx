"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/ui/AppHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { Search, FileBarChart, ExternalLink } from "lucide-react";
import { listReviews } from "@/lib/api";
import { toast } from "sonner";

const STATUS_OPTIONS = ["all", "draft", "in_progress", "completed", "failed", "archived"];

export default function HistoryPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [domain, setDomain] = useState("all");
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    listReviews()
      .then((data) => {
        setReviews(data);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load review history");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const domains = useMemo(() => {
    const set = new Set(reviews.map((r) => r.domain).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [reviews]);

  const filtered = useMemo(() => {
    const lq = q.toLowerCase();
    return reviews.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (domain !== "all" && r.domain !== domain) return false;
      if (lq && ![r.name, r.product, r.owner, r.domain].some((s) => s?.toLowerCase().includes(lq))) return false;
      return true;
    });
  }, [reviews, q, status, domain]);

  return (
    <>
      <AppHeader title="Review History" subtitle="Search, filter, and compare reviews across products and domains" />
      <div className="flex-1 space-y-4 p-4 md:p-6">

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by product, review, owner, domain…"
              className="h-10 pl-9"
              aria-label="Search reviews"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 w-40" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={domain} onValueChange={setDomain}>
            <SelectTrigger className="h-10 w-40" aria-label="Filter by domain">
              <SelectValue placeholder="Domain" />
            </SelectTrigger>
            <SelectContent>
              {domains.map((d) => (
                <SelectItem key={d} value={d}>{d === "all" ? "All domains" : d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Review</TableHead>
                <TableHead className="hidden md:table-cell">Product</TableHead>
                <TableHead className="hidden lg:table-cell">Domain</TableHead>
                <TableHead className="hidden lg:table-cell">Type</TableHead>
                <TableHead className="text-right">UX Score</TableHead>
                <TableHead className="hidden sm:table-cell">Priority breakdown</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden xl:table-cell">Owner</TableHead>
                <TableHead className="hidden xl:table-cell">Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="p-8 text-center text-sm text-muted-foreground">
                    {reviews.length === 0
                      ? "No reviews yet. Start your first review."
                      : "No reviews match your filters."}
                  </TableCell>
                </TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={{ pathname: "/workspace", query: { reviewId: r.id } }}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {r.name}
                    </Link>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{r.createdAt?.slice(0, 10)}</p>
                  </TableCell>
                  <TableCell className="hidden text-sm md:table-cell">{r.product}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{r.domain || "—"}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{r.reviewType}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {r.uxScore ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex gap-1">
                      <PriorityBadge priority="P0" compact /><span className="text-xs tabular-nums text-muted-foreground">—</span>
                      <PriorityBadge priority="P1" compact /><span className="text-xs tabular-nums text-muted-foreground">—</span>
                      <PriorityBadge priority="P2" compact /><span className="text-xs tabular-nums text-muted-foreground">—</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{r.status?.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell className="hidden text-xs xl:table-cell">{r.owner || "User"}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">{r.updatedAt?.slice(0, 10)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild size="icon" variant="ghost" aria-label="Open workspace" className="h-9 w-9">
                        <Link href={{ pathname: "/workspace", query: { reviewId: r.id } }}><ExternalLink className="h-4 w-4" /></Link>
                      </Button>
                      <Button asChild size="icon" variant="ghost" aria-label="Generate report" className="h-9 w-9">
                        <Link href="/reports"><FileBarChart className="h-4 w-4" /></Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {!isLoading && filtered.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {reviews.length} review{reviews.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </>
  );
}
