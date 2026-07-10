"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, Eye, ChevronDown } from "lucide-react";
import { exportReviewReport, listReviews } from "@/lib/api";
import { downloadReport } from "@/lib/reportExport";
import { toast } from "@/lib/toast";
import { marked } from "marked";
import DOMPurify from "dompurify";

function ReportsPageContent() {
  const searchParams = useSearchParams();
  const reviewId = searchParams.get("reviewId");
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const selectedReportHtml = useMemo(() => {
    if (!selected?.contentMd) return "<p>No content</p>";
    const parsedHtml = marked.parse(selected.contentMd, { gfm: true, breaks: true });
    return DOMPurify.sanitize(typeof parsedHtml === "string" ? parsedHtml : String(parsedHtml));
  }, [selected]);

  useEffect(() => {
    listReviews()
      .then((r) => setReviews(r.filter((rev: any) => rev.status === "completed")))
      .catch(() => toast.error("Failed to load reports"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!reviewId) return;
    openReport(reviewId);
  }, [reviewId]);

  function handleDownload(report: any, format: "pdf" | "word" | "html") {
    try {
      downloadReport(report, format);
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to download report");
    }
  }

  async function openReport(reviewId: string) {
    try {
      const report = await exportReviewReport(reviewId);
      setSelected(report);
      setSheetOpen(true);
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to load report");
    }
  }

  return (
    <>
      <AppHeader title="Reports" subtitle="AI-generated UX review reports" />
      <div className="flex-1 space-y-4 p-4 md:p-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
          </div>
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No reports yet</p>
              <p className="text-sm text-muted-foreground">Complete a review to generate its report.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <Card key={r.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <Badge variant="outline" className="text-[11px]">AI Draft</Badge>
                  </div>
                  <CardTitle className="mt-2 text-sm leading-snug">{r.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3 pt-0">
                  <p className="text-xs text-muted-foreground">{r.product}{r.domain ? ` · ${r.domain}` : ""}</p>
                  {r.uxScore != null && (
                    <p className="text-xs">UX Score: <span className="font-semibold">{r.uxScore}</span></p>
                  )}
                  <div className="mt-auto flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openReport(r.id)}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Download className="mr-1 h-3.5 w-3.5" />
                          Download
                          <ChevronDown className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={async () => {
                          try {
                            const report = await exportReviewReport(r.id);
                            handleDownload(report, "pdf");
                          } catch (error: any) {
                            toast.error(error?.message ?? "Failed to export report");
                          }
                        }}>
                          Download as PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={async () => {
                          try {
                            const report = await exportReviewReport(r.id);
                            handleDownload(report, "word");
                          } catch (error: any) {
                            toast.error(error?.message ?? "Failed to export report");
                          }
                        }}>
                          Download as Word
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={async () => {
                          try {
                            const report = await exportReviewReport(r.id);
                            handleDownload(report, "html");
                          } catch (error: any) {
                            toast.error(error?.message ?? "Failed to export report");
                          }
                        }}>
                          Download as HTML
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[92vw] max-w-none sm:w-[58vw] sm:max-w-[58vw] p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
            <SheetTitle className="text-base">{selected?.name ?? "Report"}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6 py-4">
            <article className="report-html" dangerouslySetInnerHTML={{ __html: selectedReportHtml }} />
          </ScrollArea>
          {selected && (
            <div className="px-6 py-4 border-t border-border shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onSelect={() => handleDownload(selected, "pdf")}>
                    Download as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleDownload(selected, "word")}>
                    Download as Word
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleDownload(selected, "html")}>
                    Download as HTML
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <style jsx global>{`
        .report-html {
          color: hsl(var(--foreground));
          font-size: 14px;
          line-height: 1.7;
        }

        .report-html > *:first-child {
          margin-top: 0;
        }

        .report-html h1,
        .report-html h2,
        .report-html h3,
        .report-html h4 {
          color: hsl(var(--foreground));
          font-weight: 600;
          line-height: 1.3;
          margin-top: 1.35em;
          margin-bottom: 0.55em;
        }

        .report-html h1 { font-size: 1.5rem; }
        .report-html h2 { font-size: 1.25rem; }
        .report-html h3 { font-size: 1.1rem; }
        .report-html h4 { font-size: 1rem; }

        .report-html p {
          margin: 0.7em 0;
          color: hsl(var(--foreground));
        }

        .report-html ul,
        .report-html ol {
          margin: 0.75em 0;
          padding-left: 1.2rem;
        }

        .report-html li {
          margin: 0.3em 0;
        }

        .report-html blockquote {
          margin: 0.9em 0;
          border-left: 3px solid hsl(var(--border));
          padding-left: 0.85rem;
          color: hsl(var(--muted-foreground));
        }

        .report-html hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 1.25em 0;
        }

        .report-html a {
          color: hsl(var(--primary));
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .report-html code {
          background: hsl(var(--secondary));
          border: 1px solid hsl(var(--border));
          border-radius: 6px;
          padding: 0.1rem 0.35rem;
          font-size: 12px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        }

        .report-html pre {
          background: hsl(var(--secondary));
          border: 1px solid hsl(var(--border));
          border-radius: 10px;
          padding: 0.85rem;
          margin: 0.9em 0;
          overflow: auto;
        }

        .report-html pre code {
          border: 0;
          background: transparent;
          padding: 0;
          font-size: 12px;
        }

        .report-html table {
          width: 100%;
          border-collapse: collapse;
          margin: 0.95em 0;
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          overflow: hidden;
        }

        .report-html th,
        .report-html td {
          border: 1px solid hsl(var(--border));
          padding: 0.5rem 0.6rem;
          text-align: left;
          vertical-align: top;
        }

        .report-html th {
          background: hsl(var(--secondary));
          font-weight: 600;
        }

        .report-html img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 0.7em 0;
        }
      `}</style>
    </>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground text-sm">Loading…</p></div>}>
      <ReportsPageContent />
    </Suspense>
  );
}
