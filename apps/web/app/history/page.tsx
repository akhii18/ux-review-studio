"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/ui/AppHeader";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SheetClose } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { Search, MoreVertical, X, ExternalLink, FileBarChart, Trash2, Download, ChevronDown } from "lucide-react";
import { deleteReview, exportReviewReport, getReview, listReviews } from "@/lib/api";
import { downloadReport } from "@/lib/reportExport";
import { toast } from "@/lib/toast";

const STATUS_OPTIONS = ["all", "draft", "in_progress", "completed", "failed", "archived"];

function toTitleCase(value?: string | null) {
  if (!value) return "—";

  const title = value
    .replaceAll("_", " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return title
    .replace(/\bUx\b/g, "UX")
    .replace(/\bUi\b/g, "UI")
    .replace(/\bAi\b/g, "AI")
    .replace(/\bPrd\b/g, "PRD");
}

function formatReviewDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function getReviewActionLabel(status?: string | null) {
  return status === "in_progress" ? "Continue review" : "Open workspace";
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function markdownToHtml(markdown: string) {
  const escaped = escapeHtml(markdown ?? "").replaceAll("\r\n", "\n");
  const lines = escaped.split("\n");
  const html: string[] = [];

  let inCodeBlock = false;
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      html.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      html.push("</ol>");
      inOl = false;
    }
  };

  const inline = (value: string) =>
    value
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      closeLists();
      if (!inCodeBlock) {
        html.push("<pre><code>");
      } else {
        html.push("</code></pre>");
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      html.push(`${line}\n`);
      continue;
    }

    if (!line.trim()) {
      closeLists();
      continue;
    }

    const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      closeLists();
      const level = hMatch[1].length;
      html.push(`<h${level}>${inline(hMatch[2].trim())}</h${level}>`);
      continue;
    }

    const ulMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (ulMatch) {
      if (inOl) {
        html.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        html.push("<ul>");
        inUl = true;
      }
      html.push(`<li>${inline(ulMatch[1].trim())}</li>`);
      continue;
    }

    const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inUl) {
        html.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        html.push("<ol>");
        inOl = true;
      }
      html.push(`<li>${inline(olMatch[1].trim())}</li>`);
      continue;
    }

    closeLists();
    html.push(`<p>${inline(line.trim())}</p>`);
  }

  closeLists();
  if (inCodeBlock) html.push("</code></pre>");

  return html.join("\n");
}

function buildReportHtmlDocument(title: string, markdown: string) {
  const content = markdownToHtml(markdown);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: Inter, Segoe UI, Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; background: #ffffff; color: #111827; }
    h1, h2, h3, h4, h5, h6 { margin: 1.1em 0 0.5em; line-height: 1.25; }
    p { margin: 0.5em 0; }
    ul, ol { margin: 0.5em 0; padding-left: 1.25rem; }
    pre { overflow: auto; padding: 12px; border-radius: 8px; background: rgba(127,127,127,0.12); }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
}

export default function HistoryPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [domain, setDomain] = useState("all");
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [loadingReportReviewId, setLoadingReportReviewId] = useState<string | null>(null);
  const [reportPreview, setReportPreview] = useState<{ title: string; html: string; report: any } | null>(null);
  const [pendingDeleteReview, setPendingDeleteReview] = useState<{ id: string; name: string } | null>(null);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [q, status, domain]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  async function handleDelete(reviewId: string, reviewName: string) {
    if (deletingReviewId) return;

    setDeletingReviewId(reviewId);
    try {
      await deleteReview(reviewId);
      setReviews((prev) => prev.filter((review) => review.id !== reviewId));
      toast.success("Review deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete review");
    } finally {
      setDeletingReviewId(null);
      setPendingDeleteReview(null);
    }
  }

  async function handleOpenReport(reviewId: string, reviewName: string) {
    if (loadingReportReviewId) return;

    setLoadingReportReviewId(reviewId);
    try {
      const report = await exportReviewReport(reviewId);

      setReportPreview({
        title: report.name || `${reviewName} report`,
        html: buildReportHtmlDocument(report.name || reviewName || "UX Report", report.contentMd),
        report,
      });
      setReportSheetOpen(true);
    } catch (err) {
      console.error(err);
      toast.error((err as any)?.message ?? "Failed to load report");
    } finally {
      setLoadingReportReviewId(null);
    }
  }

  return (
    <>
      <AppHeader title="Review History" subtitle="Search, filter, and compare reviews across products and domains" />
      <div className="flex-1 min-h-0 space-y-0 p-4 md:p-6">

        {/* Filters */}
        <div className="sticky top-16 z-20 -mx-4 border-b border-border bg-background px-4 py-3 md:-mx-6 md:px-6">
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

        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="max-h-[calc(97vh-170px)] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Review history</caption>
              <thead className="sticky top-0 z-10 bg-foreground">
                <tr className="border-0">
                  <th scope="col" className="h-12 px-4 text-left align-middle text-[12px] font-semibold uppercase tracking-wide text-background">Review</th>
                  <th scope="col" className="hidden h-12 px-4 text-left align-middle text-[12px] font-semibold uppercase tracking-wide text-background md:table-cell">Product</th>
                  <th scope="col" className="hidden h-12 px-4 text-left align-middle text-[12px] font-semibold uppercase tracking-wide text-background lg:table-cell">Domain</th>
                  <th scope="col" className="hidden h-12 px-4 text-left align-middle text-[12px] font-semibold uppercase tracking-wide text-background lg:table-cell">Type</th>
                  <th scope="col" className="h-12 px-4 text-right align-middle text-[12px] font-semibold uppercase tracking-wide text-background">UX Score</th>
                  <th scope="col" className="hidden h-12 px-4 text-left align-middle text-[12px] font-semibold uppercase tracking-wide text-background sm:table-cell">Priority breakdown</th>
                  <th scope="col" className="h-12 px-4 text-left align-middle text-[12px] font-semibold uppercase tracking-wide text-background">Status</th>
                  <th scope="col" className="hidden h-12 px-4 text-left align-middle text-[12px] font-semibold uppercase tracking-wide text-background xl:table-cell">Owner</th>
                  <th scope="col" className="hidden h-12 px-4 text-left align-middle text-[12px] font-semibold uppercase tracking-wide text-background xl:table-cell">Created</th>
                  <th scope="col" className="h-12 px-2 text-right align-middle text-[12px] font-semibold uppercase tracking-wide text-background">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:nth-child(even)]:bg-muted/40 [&_tr:last-child]:border-0">
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3 align-middle"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr className="border-b border-border/60">
                  <td colSpan={10} className="p-8 text-center text-sm text-muted-foreground">
                    {reviews.length === 0
                      ? "No reviews yet. Start your first review."
                      : "No reviews match your filters."}
                  </td>
                </tr>
              ) : paginated.map((r) => (
                <tr key={r.id} className="border-b border-border/60 transition-colors hover:bg-secondary/80">
                  <td className="px-4 py-3 align-middle">
                    <Link
                      href={r.status === "draft" ? { pathname: "/new-review", query: { reviewId: r.id } } : r.status === "in_progress" ? { pathname: "/new-review", query: { reviewId: r.id } } : { pathname: "/workspace", query: { reviewId: r.id } }}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {r.name}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{formatReviewDate(r.createdAt)}</p>
                  </td>
                  <td className="hidden px-4 py-3 align-middle text-sm md:table-cell">{r.product}</td>
                  <td className="hidden px-4 py-3 align-middle text-xs text-muted-foreground lg:table-cell">{toTitleCase(r.domain) || "—"}</td>
                  <td className="hidden px-4 py-3 align-middle text-xs text-muted-foreground lg:table-cell">{toTitleCase(r.reviewType)}</td>
                  <td className="px-4 py-3 align-middle text-right font-medium tabular-nums">
                    {r.uxScore ?? <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="hidden px-4 py-3 align-middle sm:table-cell">
                    <div className="flex gap-2">
                      {(["P0", "P1", "P2"] as const).map((priority) => (
                        <div key={priority} className="flex min-w-[34px] flex-col items-center gap-1">
                          <PriorityBadge priority={priority} compact />
                          <span className={`text-xs font-bold tabular-nums ${priority === "P0" ? "text-destructive" : "text-foreground"}`}>
                            {r.priorityBreakdown?.[priority] ?? 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <Badge variant="secondary" className="whitespace-nowrap">{toTitleCase(r.status)}</Badge>
                  </td>
                  <td className="hidden px-4 py-3 align-middle text-xs xl:table-cell">{r.owner || "User"}</td>
                  <td className="hidden px-4 py-3 align-middle text-xs text-muted-foreground xl:table-cell">{formatReviewDate(r.updatedAt)}</td>
                  <td className="px-1 py-3 align-middle text-right">
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Actions for ${r.name || "review"}`}
                            className="h-9 w-9"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-52 p-1">
                          {(() => {
                            const isCompleted = r.status === "completed";
                            const canOpenReport = isCompleted && Boolean(r.canExportReport);
                            const reportDisabledReason = !isCompleted
                              ? "Report is available only after review completion."
                              : "Triage and review basis completion is required before report export.";

                            return (
                              <>
                          <DropdownMenuItem asChild className="h-10 w-full justify-start gap-2 px-3">
                            <Link href={r.status === "draft" ? { pathname: "/new-review", query: { reviewId: r.id } } : r.status === "in_progress" ? { pathname: "/new-review", query: { reviewId: r.id } } : { pathname: "/workspace", query: { reviewId: r.id } }} aria-label={r.status === "draft" ? "Resume draft" : getReviewActionLabel(r.status)}>
                              <ExternalLink className="h-4 w-4" />
                              <span>{r.status === "draft" ? "Resume draft" : getReviewActionLabel(r.status)}</span>
                            </Link>
                          </DropdownMenuItem>

                          {canOpenReport ? (
                            <DropdownMenuItem
                              className="h-10 w-full justify-start gap-2 px-3"
                              disabled={loadingReportReviewId === r.id}
                              onSelect={(event) => {
                                event.preventDefault();
                                if (loadingReportReviewId === r.id) return;
                                void handleOpenReport(r.id, r.name || "Untitled review");
                              }}
                              aria-label="Open report"
                            >
                              <FileBarChart className="h-4 w-4" />
                              <span>Open report</span>
                            </DropdownMenuItem>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className="flex h-10 w-full cursor-not-allowed items-center gap-2 rounded-sm px-3 text-sm opacity-60"
                                    aria-label="Open report unavailable"
                                  >
                                      <FileBarChart className="h-4 w-4" />
                                      <span>Open report</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="left">{reportDisabledReason}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          <DropdownMenuItem
                            className="h-10 w-full justify-start gap-2 px-3 text-destructive"
                            disabled={deletingReviewId === r.id}
                            onSelect={(event) => {
                              event.preventDefault();
                              if (deletingReviewId === r.id) return;
                              setPendingDeleteReview({ id: r.id, name: r.name || "Untitled review" });
                            }}
                            aria-label="Delete review"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete review</span>
                          </DropdownMenuItem>
                              </>
                            );
                          })()}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>

        {!isLoading && filtered.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} filtered review{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rows</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-20" aria-label="Rows per page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Pagination className="mx-0 w-auto justify-start sm:justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        if (canGoPrevious) setCurrentPage((page) => page - 1);
                      }}
                      aria-disabled={!canGoPrevious}
                      className={!canGoPrevious ? "pointer-events-none opacity-50" : undefined}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-2 text-sm text-muted-foreground" aria-live="polite">
                      Page {currentPage} of {totalPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        if (canGoNext) setCurrentPage((page) => page + 1);
                      }}
                      aria-disabled={!canGoNext}
                      className={!canGoNext ? "pointer-events-none opacity-50" : undefined}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={Boolean(pendingDeleteReview)} onOpenChange={(open) => !open && setPendingDeleteReview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete review?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete review "{pendingDeleteReview?.name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="!bg-destructive !text-destructive-foreground hover:!bg-destructive/90"
              onClick={() => {
                if (!pendingDeleteReview) return;
                void handleDelete(pendingDeleteReview.id, pendingDeleteReview.name);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={reportSheetOpen} onOpenChange={setReportSheetOpen}>
        <SheetContent side="right" className="w-[92vw] max-w-none sm:w-[58vw] sm:max-w-[58vw] p-0 [&>button]:hidden">
          <SheetHeader className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="text-base">{reportPreview?.title ?? "Report"}</SheetTitle>
              <SheetClose asChild>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Close report preview">
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
          </SheetHeader>
          <div className="h-[calc(100vh-73px)]">
            {reportPreview ? (
              <iframe
                title={reportPreview.title}
                className="h-full w-full border-0"
                srcDoc={reportPreview.html}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No report content.
              </div>
            )}
          </div>
          {reportPreview?.report && (
            <div className="border-t border-border px-6 py-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onSelect={() => downloadReport(reportPreview.report, "pdf")}>Download as PDF</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => downloadReport(reportPreview.report, "word")}>Download as Word</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => downloadReport(reportPreview.report, "html")}>Download as HTML</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
