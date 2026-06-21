"use client";

import { useState } from "react";
import {
  Check, Edit3, X, ArrowUpRight, MessageSquare, Sparkles,
  BookOpen, Plus, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { FindingStatusBadge } from "@/components/ui/FindingStatusBadge";
import { cn } from "@/lib/utils";
import type { FindingWithBasis, ReviewBasisItem } from "@uxm/shared";
import { REVIEW_BASIS_LIBRARY } from "@uxm/shared";
import { useTriageFindingMutation, useEscalateFindingMutation } from "@/store/api/findingsApi";
import { toast } from "sonner";

interface FindingCardProps {
  finding: FindingWithBasis;
  open: boolean;
  onClose: () => void;
}

export function FindingCard({ finding, open, onClose }: FindingCardProps) {
  const [basisSearch, setBasisSearch] = useState("");
  const [escalateReason, setEscalateReason] = useState("");
  const [showEscalate, setShowEscalate] = useState(false);

  const [triage, { isLoading: triageLoading }] = useTriageFindingMutation();
  const [escalate, { isLoading: escalateLoading }] = useEscalateFindingMutation();

  const handleTriage = async (action: "ACCEPT" | "EDIT" | "DISMISS" | "ESCALATE") => {
    if (action === "ESCALATE") { setShowEscalate(true); return; }
    try {
      await triage({ id: finding.id, payload: { action } }).unwrap();
      toast.success(`Finding ${action.toLowerCase()}d`);
      onClose();
    } catch {
      toast.error("Action failed. Please try again.");
    }
  };

  const handleEscalate = async () => {
    if (!escalateReason.trim()) { toast.error("Please provide an escalation reason"); return; }
    try {
      await escalate({ id: finding.id, payload: { reason: escalateReason } }).unwrap();
      toast.success("Finding escalated");
      setShowEscalate(false);
      onClose();
    } catch {
      toast.error("Escalation failed");
    }
  };

  const basisLibrary = REVIEW_BASIS_LIBRARY.map((s) => ({
    id: `lib-${s.name.toLowerCase().replace(/\s+/g, "-")}`,
    findingId: finding.id,
    type: s.type,
    name: s.name,
    explanation: s.explanation,
  }));

  const filteredLibrary = basisSearch.trim()
    ? basisLibrary.filter(
        (b) =>
          b.name.toLowerCase().includes(basisSearch.toLowerCase()) ||
          b.type.toLowerCase().includes(basisSearch.toLowerCase())
      )
    : basisLibrary;

  const needsBasis =
    (finding.status === "ACCEPTED" || finding.status === "EDITED") &&
    finding.reviewBasis.length === 0;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={finding.severity} />
            <FindingStatusBadge status={finding.status} />
            <Badge variant="outline">{finding.area.replace("_", " ")}</Badge>
            {needsBasis && (
              <Badge variant="outline" className="gap-1 border-yellow-400/60 bg-yellow-50 text-yellow-700">
                <AlertTriangle className="h-3 w-3" />Incomplete
              </Badge>
            )}
          </div>
          <SheetTitle className="mt-2 text-left">{finding.title}</SheetTitle>
          <SheetDescription className="text-left">
            {finding.screen} {finding.principle && `· ${finding.principle}`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5 text-sm">
          <Section title="Description">{finding.description}</Section>
          {finding.observation && <Section title="Observation">{finding.observation}</Section>}
          {finding.why && <Section title="Why it matters">{finding.why}</Section>}

          {/* Review Basis */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Review Basis</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-[11px]">
                    <Plus className="h-3 w-3" />Add basis
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="border-b border-border p-2">
                    <Input
                      placeholder="Search principles…"
                      value={basisSearch}
                      onChange={(e) => setBasisSearch(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <ScrollArea className="h-64">
                    <div className="p-1">
                      {filteredLibrary.map((item) => {
                        const already = finding.reviewBasis.some((b) => b.name === item.name);
                        return (
                          <button
                            key={item.id}
                            disabled={already}
                            className={cn(
                              "w-full rounded px-2 py-1.5 text-left transition",
                              already ? "cursor-default opacity-40" : "hover:bg-secondary/60"
                            )}
                          >
                            <p className="text-[11px] font-medium">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground">{item.type}</p>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            {finding.reviewBasis.length === 0 ? (
              <p className="mt-1 text-xs italic text-muted-foreground">No basis mapped yet.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {finding.reviewBasis.map((b: ReviewBasisItem) => (
                  <div key={b.id} className="flex items-start gap-1.5 rounded-lg border border-border bg-secondary/40 px-2.5 py-2">
                    <BookOpen className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{b.type}</p>
                      <p className="text-xs font-semibold">{b.name}</p>
                      <p className="text-[11px] text-muted-foreground">{b.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Section title="Recommendation">{finding.recommendation}</Section>
          {finding.businessImpact && <Section title="Business impact">{finding.businessImpact}</Section>}
          {finding.a11yImpact && <Section title="Accessibility impact">{finding.a11yImpact}</Section>}

          <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />AI confidence · {finding.confidence}%
            </div>
          </div>

          {showEscalate && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
              <p className="text-xs font-medium text-red-700">Escalation reason</p>
              <Textarea
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                placeholder="Describe why this is being escalated…"
                className="text-sm"
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={handleEscalate} disabled={escalateLoading}>
                  Confirm escalate
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowEscalate(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => handleTriage("ACCEPT")} disabled={triageLoading || finding.status === "ACCEPTED"}>
              <Check className="mr-1.5 h-3.5 w-3.5" />Accept
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleTriage("EDIT")} disabled={triageLoading}>
              <Edit3 className="mr-1.5 h-3.5 w-3.5" />Edit & accept
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleTriage("DISMISS")} disabled={triageLoading || finding.status === "DISMISSED"}>
              <X className="mr-1.5 h-3.5 w-3.5" />Dismiss
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleTriage("ESCALATE")} disabled={triageLoading}>
              <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />Escalate
            </Button>
            <Button size="sm" variant="ghost"><MessageSquare className="mr-1.5 h-3.5 w-3.5" />Comment</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm">{children}</p>
    </div>
  );
}
