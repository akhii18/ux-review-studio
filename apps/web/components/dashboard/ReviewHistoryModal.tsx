"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Loader2, X, ChevronDown, MoreVertical, ExternalLink, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type ReviewFilter = "All" | string;

export type ReviewHistoryItem = {
  id: string;
  productName: string;
  reviewName: string;
  ownerName: string;
  status: string;
  reviewDateTime: string;
  summary: string;
  uxScore?: number | null;
  findingCount?: number;
};

const PAGE_SIZE = 5;

function toTitleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusBadgeClass(status: string) {
  const normalized = status.toLowerCase();

  if (["completed", "approved", "accepted"].includes(normalized)) {
    return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400";
  }
  if (["failed", "rejected", "dismissed"].includes(normalized)) {
    return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400";
  }

  return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400";
}

function getReviewActionLabel(status?: string | null) {
  return status === "in_progress" ? "Continue review" : "Open review";
}

export function ReviewHistoryModal({
  open,
  onOpenChange,
  items,
  isLoading,
  onDeleteReview,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ReviewHistoryItem[];
  isLoading: boolean;
  onDeleteReview?: (reviewId: string) => Promise<void> | void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewFilter>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [pendingDeleteReview, setPendingDeleteReview] = useState<{ id: string; name: string } | null>(null);
  const [openItems, setOpenItems] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setStatusFilter("All");
      setCurrentPage(1);
      setDeletingReviewId(null);
      setPendingDeleteReview(null);
      setOpenItems([]);
    }
  }, [open]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aTime = new Date(a.reviewDateTime).getTime();
      const bTime = new Date(b.reviewDateTime).getTime();
      return bTime - aTime;
    });
  }, [items]);

  const statusFilters = useMemo(() => {
    const fromData = Array.from(new Set(sortedItems.map((item) => toTitleCase(item.status || "Unknown"))));
    return ["All", ...fromData] as ReviewFilter[];
  }, [sortedItems]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return sortedItems.filter((item) => {
      const statusLabel = toTitleCase(item.status || "Unknown");

      if (statusFilter !== "All" && statusLabel !== statusFilter) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        item.id,
        item.productName,
        item.reviewName,
        item.ownerName,
        item.status,
        item.summary,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [sortedItems, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handleDeleteReview = async (reviewId: string, reviewName: string) => {
    if (!onDeleteReview || deletingReviewId) return;

    setDeletingReviewId(reviewId);
    try {
      await onDeleteReview(reviewId);
    } finally {
      setDeletingReviewId(null);
      setPendingDeleteReview(null);
    }
  };

  const toggleOpenItem = (itemId: string) => {
    setOpenItems((current) =>
      current.includes(itemId)
        ? current.filter((value) => value !== itemId)
        : [...current, itemId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[78vh] w-[95vw] max-w-5xl overflow-hidden p-0 [&>button]:hidden"
        aria-labelledby="review-history-modal-title"
        aria-describedby="review-history-modal-description"
      >
        <DialogHeader className="sticky top-0 z-10 gap-4 border-b border-border bg-background/95 px-4 py-4 pr-12 backdrop-blur sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle id="review-history-modal-title">Review History</DialogTitle>
              <DialogDescription id="review-history-modal-description" className="mt-1">
                Search and filter recent review records from your dashboard workspace.
              </DialogDescription>
            </div>

            <DialogClose asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Close review history modal">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by review ID, review name, product, owner, status, or summary"
                className="h-10 pl-9"
                aria-label="Search review history"
              />
            </div>

            <div
              className="flex flex-wrap items-center gap-2"
              role="group"
              aria-label="Filter review history by status"
            >
              {statusFilters.map((filter) => (
                <Button
                  key={filter}
                  type="button"
                  size="sm"
                  variant={statusFilter === filter ? "default" : "outline"}
                  className="h-8 rounded-full px-3"
                  onClick={() => setStatusFilter(filter)}
                  aria-pressed={statusFilter === filter}
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center" role="status" aria-live="polite" aria-label="Loading review history">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : paginatedItems.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground" aria-live="polite">
              No review history found.
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <Accordion type="multiple" value={openItems} onValueChange={(value) => setOpenItems(value as string[])} className="space-y-3" aria-label="Review history records">
                {paginatedItems.map((item) => (
                  <AccordionItem
                    key={item.id}
                    value={item.id}
                    className={`rounded-lg border border-border bg-card shadow-card transition-colors hover:border-primary/30 hover:bg-secondary/40 hover:shadow-md ${openItems.includes(item.id) ? "border-primary/30 bg-secondary/40" : ""}`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleOpenItem(item.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          toggleOpenItem(item.id);
                        }
                      }}
                      aria-expanded={openItems.includes(item.id)}
                      className="flex w-full items-center gap-2 px-4 py-3 transition-colors hover:bg-secondary/20 focus-visible:bg-secondary/20"
                    >
                      <div className="min-w-0 flex-1 pr-2 text-sm font-semibold">
                        <span className="line-clamp-1">{item.reviewName}</span>
                      </div>

                      <div className="ml-auto flex shrink-0 items-center gap-1">
                        <Badge className={getStatusBadgeClass(item.status)}>{toTitleCase(item.status || "Unknown")}</Badge>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${openItems.includes(item.id) ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={(event) => event.stopPropagation()}
                              aria-label={`Actions for ${item.reviewName}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-52 p-1">
                            <DropdownMenuItem asChild className="h-10 w-full justify-start gap-2 px-3">
                              <Link
                                  href={item.status === "in_progress" ? { pathname: "/new-review", query: { reviewId: item.id } } : { pathname: "/workspace", query: { reviewId: item.id } }}
                                onClick={(event) => event.stopPropagation()}
                                aria-label={getReviewActionLabel(item.status)}
                              >
                                <ExternalLink className="h-4 w-4" />
                                <span>{getReviewActionLabel(item.status)}</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="h-10 w-full justify-start gap-2 px-3">
                              <Link
                                href={{ pathname: "/workspace", query: { reviewId: item.id } }}
                                onClick={(event) => event.stopPropagation()}
                                aria-label="Open workspace"
                              >
                                <ExternalLink className="h-4 w-4" />
                                <span>Open workspace</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="h-10 w-full justify-start gap-2 px-3 text-destructive"
                              disabled={deletingReviewId === item.id}
                              onSelect={(event) => {
                                event.preventDefault();
                                setPendingDeleteReview({ id: item.id, name: item.reviewName });
                              }}
                              aria-label="Delete review"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Delete review</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <AccordionContent className="px-4">
                      <div className="grid gap-1 text-sm text-muted-foreground">
                        <p><span className="font-medium text-foreground">Product:</span> {item.productName}</p>
                        <p><span className="font-medium text-foreground">Owner:</span> {item.ownerName}</p>
                        <p>
                          <span className="font-medium text-foreground">Status:</span> {toTitleCase(item.status || "Unknown")}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Review Date:</span>{" "}
                          {new Date(item.reviewDateTime).toLocaleString()}
                        </p>
                        {typeof item.uxScore === "number" && (
                          <p><span className="font-medium text-foreground">UX Score:</span> {item.uxScore}</p>
                        )}
                        {typeof item.findingCount === "number" && (
                          <p><span className="font-medium text-foreground">Findings:</span> {item.findingCount}</p>
                        )}
                        <p className="text-foreground/90">{item.summary}</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          {!isLoading && filteredItems.length > 0 && (
            <div className="border-t border-border px-4 py-3 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredItems.length)} of {filteredItems.length}
                </p>
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

        <AlertDialog open={Boolean(pendingDeleteReview)} onOpenChange={(openState) => !openState && setPendingDeleteReview(null)}>
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
                  void handleDeleteReview(pendingDeleteReview.id, pendingDeleteReview.name);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
