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
import { Search, MoreVertical, X, ExternalLink, FileBarChart, Trash2, Download, ChevronDown, Pencil, Upload, ImageIcon } from "lucide-react";
import { deleteReview, exportReviewReport, getReview, listReviews, saveReviewDraft, startReview } from "@/lib/api";
import { buildReportPreviewHtml, downloadReport } from "@/lib/reportExport";
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

function formatReviewType(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "—";
  if (normalized === "partial") return "Custom";
  return toTitleCase(normalized);
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
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<any | null>(null);
  const [editAssets, setEditAssets] = useState<Array<{ id?: string; name: string; mimeType: string; base64Data?: string; blobUrl?: string; storageRef?: string | null; contentText?: string; sizeBytes?: number; previewUrl?: string }>>([]);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  const loadReviews = async () => {
    setIsLoading(true);
    try {
      const data = await listReviews();
      setReviews(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load review history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReviews();
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
      const previewHtml = await buildReportPreviewHtml(report);

      setReportPreview({
        title: report.name || `${reviewName} report`,
        html: previewHtml,
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

  async function handleOpenEditSheet(reviewId: string) {
    setEditSheetOpen(true);
    setEditingReview(null);
    setEditAssets([]);
    try {
      const review = await getReview(reviewId);
      setEditingReview(review);
      setEditAssets(
        (review?.assets ?? []).map((asset: any) => ({
          id: asset.id,
          name: asset.name,
          mimeType: asset.mimeType,
          blobUrl: asset.blobUrl ?? undefined,
          storageRef: asset.storageRef ?? asset.blobUrl ?? undefined,
          contentText: asset.contentText ?? undefined,
          sizeBytes: asset.sizeBytes ?? undefined,
          previewUrl: asset.blobUrl ?? undefined,
        }))
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to load review details for editing");
      setEditSheetOpen(false);
    }
  }

  async function handleAddScreenshots(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setIsUploadingFiles(true);
    try {
      const uploadedAssets = await Promise.all(
        files.map(
          (file) =>
            new Promise<{ name: string; mimeType: string; base64Data: string; sizeBytes?: number; previewUrl: string }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result;
                if (typeof result !== "string") {
                  reject(new Error("Unable to read file"));
                  return;
                }
                const base64Data = result.includes(",") ? result.split(",")[1] : result;
                resolve({
                  name: file.name,
                  mimeType: file.type || "image/png",
                  base64Data,
                  sizeBytes: file.size,
                  previewUrl: result,
                });
              };
              reader.onerror = () => reject(new Error("Unable to read file"));
              reader.readAsDataURL(file);
            })
        )
      );

      setEditAssets((prev) => [
        ...prev,
        ...uploadedAssets.map((asset) => ({
          name: asset.name,
          mimeType: asset.mimeType,
          base64Data: asset.base64Data,
          sizeBytes: asset.sizeBytes,
          previewUrl: asset.previewUrl,
        })),
      ]);
      toast.success(`${uploadedAssets.length} screenshot${uploadedAssets.length === 1 ? "" : "s"} added`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to add screenshots");
    } finally {
      setIsUploadingFiles(false);
      event.target.value = "";
    }
  }

  async function handleSaveAndRerun() {
    if (!editingReview) return;

    setIsSavingReview(true);
    try {
      const payload = {
        reviewId: editingReview.id,
        name: editingReview.name || "Untitled review",
        product: editingReview.product || "Unknown product",
        domain: editingReview.domain || undefined,
        reviewType: editingReview.reviewType || undefined,
        owner: editingReview.owner || undefined,
        criteria: Array.isArray(editingReview.criteria) ? editingReview.criteria.filter((value: unknown): value is string => typeof value === "string") : [],
        findingMetadataOptions: Array.isArray(editingReview.findingMetadataOptions)
          ? editingReview.findingMetadataOptions.filter((value: unknown): value is string => typeof value === "string")
          : [],
        analysisScope: editingReview.analysisScope || "all",
        depth: editingReview.depth || "standard",
        confidenceThreshold: typeof editingReview.confidenceThreshold === "number" ? editingReview.confidenceThreshold : 75,
        stage: "draft:setup",
        assets: editAssets
          .map((asset) => ({
            name: asset.name,
            mimeType: asset.mimeType,
            ...(asset.base64Data ? { base64Data: asset.base64Data } : {}),
            ...(asset.base64Data ? {} : { blobUrl: asset.storageRef ?? asset.blobUrl ?? undefined }),
            ...(asset.contentText ? { contentText: asset.contentText } : {}),
            ...(typeof asset.sizeBytes === "number" ? { sizeBytes: asset.sizeBytes } : {}),
          }))
          .filter((asset) => Boolean(asset.name) && Boolean(asset.mimeType)),
      };

      await saveReviewDraft(payload);
      await startReview(editingReview.id);
      toast.success("Review updated and rerun started");
      setEditSheetOpen(false);
      setEditingReview(null);
      setEditAssets([]);
      await loadReviews();
    } catch (err) {
      console.error(err);
      toast.error((err as any)?.message ?? "Failed to update and rerun review");
    } finally {
      setIsSavingReview(false);
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
                  <td className="hidden px-4 py-3 align-middle text-xs text-muted-foreground lg:table-cell">{formatReviewType(r.reviewType)}</td>
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
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit screenshots for ${r.name || "review"}`}
                        className="h-9 w-9"
                        onClick={() => void handleOpenEditSheet(r.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
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

      <Sheet open={editSheetOpen} onOpenChange={(open) => {
        setEditSheetOpen(open);
        if (!open) {
          setEditingReview(null);
          setEditAssets([]);
        }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader className="border-b border-border pb-4">
            <SheetTitle>Edit screenshots & rerun</SheetTitle>
          </SheetHeader>
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{editingReview?.name || "Review"}</p>
                  <p className="text-xs text-muted-foreground">Add or remove screenshots, then rerun the review.</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-secondary">
                  <Upload className="h-3.5 w-3.5" />
                  Add screenshot
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={handleAddScreenshots} />
                </label>
              </div>

              <div className="mt-4 space-y-2">
                {editAssets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background/70 px-4 py-6 text-center text-sm text-muted-foreground">
                    <ImageIcon className="mb-2 h-5 w-5" />
                    No screenshots yet. Add one to rerun the review.
                  </div>
                ) : (
                  editAssets.map((asset, index) => (
                    <div key={`${asset.name}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
                      <div className="flex min-w-0 items-center gap-3">
                        {(asset.previewUrl || asset.blobUrl || asset.storageRef) && asset.mimeType.startsWith("image/") ? (
                          <img
                            src={asset.previewUrl || asset.blobUrl || asset.storageRef || undefined}
                            alt={asset.name}
                            className="h-12 w-12 rounded-md border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-secondary/40 text-muted-foreground">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{asset.name}</p>
                          <p className="text-[11px] text-muted-foreground">{asset.mimeType}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setEditAssets((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                        aria-label={`Remove ${asset.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Button onClick={() => void handleSaveAndRerun()} disabled={isSavingReview || isUploadingFiles} className="w-full">
              {isSavingReview ? "Updating review…" : "Save and rerun review"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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
