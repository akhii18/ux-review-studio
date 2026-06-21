"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/ui/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, Eye } from "lucide-react";
import { listReviews } from "@/lib/api";
import { toast } from "sonner";

export default function ReportsPage() {
  const [reviews, setReviews]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    listReviews()
      .then((r) => setReviews(r.filter((rev: any) => rev.status === "completed")))
      .catch(() => toast.error("Failed to load reports"))
      .finally(() => setLoading(false));
  }, []);

  function downloadReport(report: any) {
    const blob = new Blob([report.contentMd], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.name ?? "report"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function openReport(reviewId: string) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/reviews/${reviewId}`);
      const json = await res.json();
      const report = json.data?.reports?.[0];
      if (!report) { toast.error("No report found for this review"); return; }
      setSelected(report);
      setSheetOpen(true);
    } catch { toast.error("Failed to load report"); }
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
                    <Button size="sm" variant="outline" onClick={async () => {
                      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/reviews/${r.id}`);
                      const json = await res.json();
                      const report = json.data?.reports?.[0];
                      if (report) downloadReport(report);
                    }}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Report viewer sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full max-w-2xl p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
            <SheetTitle className="text-base">{selected?.name ?? "Report"}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 px-6 py-4">
            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-foreground">
              {selected?.contentMd ?? "No content"}
            </pre>
          </ScrollArea>
          {selected && (
            <div className="px-6 py-4 border-t border-border shrink-0">
              <Button variant="outline" onClick={() => downloadReport(selected)}>
                <Download className="mr-2 h-4 w-4" /> Download Markdown
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
