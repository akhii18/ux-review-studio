"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createReview, saveAsset, startReview, getReviewProgress } from "@/lib/api";
import { AppHeader } from "@/components/ui/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Check, Upload, FileText, Figma, Link as LinkIcon, X, ArrowRight, ArrowLeft,
  Sparkles, Loader2, Save, Info, Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const criteriaGroups = [
  { group: "Usability", items: ["Nielsen's 10 heuristics", "Navigation logic", "Task flow efficiency", "Recognition over recall"] },
  { group: "Accessibility", items: ["WCAG 2.2 AA conformance", "Keyboard navigation", "Screen reader interpretation", "Touch targets ≥ 44px"] },
  { group: "Consistency", items: ["Design system tokens", "Component usage", "Spacing 8pt grid", "Iconography consistency"] },
  { group: "Content UX", items: ["Microcopy clarity", "Error message quality", "Label precision", "Tone & voice"] },
  { group: "Risk", items: ["Compliance (Section 508)", "Domain regulation (HIPAA, BFSI)", "Destructive action safety", "Data privacy disclosures"] },
  { group: "Recommendations", items: ["Business impact estimate", "Effort estimate", "Acceptance criteria", "Linked principle"] },
] as const;

const steps = ["Review Setup", "Add Inputs", "Select Criteria", "Configure AI", "Run Review"];
const stepHelp = [
  "Tell us what you're reviewing — name, product, domain, and type.",
  "Upload screens, paste a Figma URL, or add PRDs and flow assets.",
  "Pick the governed frameworks the AI should apply.",
  "Tune depth, confidence threshold, and what's included in the output.",
  "Confirm inputs and start the review. AI proposes; you approve.",
];

const progressStages = [
  "Reading inputs", "Mapping requirements", "Analyzing screens",
  "Checking accessibility", "Reviewing consistency", "Generating findings", "Preparing report",
];

export default function NewReviewPage() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const [name, setName] = useState("");
  const [product, setProduct] = useState("");
  const [domain, setDomain] = useState("bfsi");
  const [reviewType, setReviewType] = useState("full");
  const [owner, setOwner] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [designSystemUrl, setDesignSystemUrl] = useState("");
  const [criteria, setCriteria] = useState<string[]>([]);
  const [files, setFiles] = useState<Array<{ name: string; type: string; status: string; file?: File }>>([]);
  const [contextText, setContextText] = useState("");
  const [depth, setDepth] = useState("standard");
  const [confidence, setConfidence] = useState([75]);
  const [running, setRunning] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [currentStageLabel, setCurrentStageLabel] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const picked = Array.from(e.dataTransfer.files ?? []);
    const mapped = picked.map((f) => ({
      name: f.name,
      type: f.type.startsWith("image/") ? "Screenshot" : "PRD",
      status: "Ready",
      file: f,
    }));
    setFiles((cur) => [...cur, ...mapped]);
  };

  const toggleCriterion = (c: string) =>
    setCriteria((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    const mapped = picked.map((f) => ({
      name: f.name,
      type: f.type.startsWith("image/") ? "Screenshot" : "PRD",
      status: "Ready",
      file: f,
    }));
    setFiles((cur) => [...cur, ...mapped]);
  };

  const toBase64 = (f: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res((r.result as string).split(",")[1] ?? "");
      r.onerror = rej;
      r.readAsDataURL(f);
    });

  const runReview = async () => {
    setRunning(true);
    setStageIdx(0);
    setCurrentStageLabel("Creating review…");

    try {
      // 1. Create the review record
      const reviewRes = await createReview({
        name,
        product,
        domain,
        reviewType,
        owner,
        criteria,
        depth,
        confidenceThreshold: confidence[0],
      });
      const reviewId = reviewRes.id || reviewRes.reviewId;

      if (!reviewId) {
        throw new Error("Did not receive a valid review ID from the server");
      }

      // 2. Upload assets
      for (const f of files) {
        if (f.file) {
          const base64Data = await toBase64(f.file);
          await saveAsset(reviewId, {
            name: f.name,
            mimeType: f.file.type || "application/octet-stream",
            base64Data,
            sizeBytes: f.file.size,
          });
        }
      }

      // Upload context text and external references if provided
      const notes: string[] = [];
      if (contextText.trim()) notes.push(contextText.trim());
      if (figmaUrl.trim()) notes.push(`Figma URL: ${figmaUrl.trim()}`);
      if (designSystemUrl.trim()) notes.push(`Design System URL: ${designSystemUrl.trim()}`);

      if (notes.length > 0) {
        await saveAsset(reviewId, {
          name: "Context notes",
          mimeType: "text/plain",
          contentText: notes.join("\n\n"),
        });
      }

      // 3. Start the pipeline
      await startReview(reviewId);

      // 4. Poll progress every 2s
      pollRef.current = setInterval(async () => {
        try {
          const progress = await getReviewProgress(reviewId);
          
          // Map stages to indices
          let idx = progressStages.findIndex(s => s.toLowerCase() === progress.stage?.toLowerCase());
          if (idx === -1) idx = Math.min(stageIdx + 1, progressStages.length - 1);
          
          setStageIdx(idx);
          setCurrentStageLabel(progress.stage || "Analyzing...");

          if (progress.status === "completed") {
            if (pollRef.current) clearInterval(pollRef.current);
            toast.success(`Review complete — ${progress.findingCount || 0} findings generated.`);
            setTimeout(() => {
              router.push(`/workspace?reviewId=${reviewId}`);
            }, 600);
          } else if (progress.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            toast.error("Review pipeline failed. Check server logs.");
            setRunning(false);
          }
        } catch (err) {
          // Ignore transient polling errors
        }
      }, 2000);

    } catch (err: any) {
      toast.error(err.message || "Failed to start review");
      setRunning(false);
    }
  };

  const validStep0 = name.trim().length > 0 && product.trim().length > 0;
  const validStep1 = files.length > 0;
  const validStep2 = criteria.length > 0;

  return (
    <>
      <AppHeader title="New Review" subtitle="Set up an AI-assisted UX review in 5 guided steps" />
      <div className="flex-1 p-4 md:p-6">
        {/* Stepper */}
        <ol className="mb-6 flex flex-wrap items-center gap-2" role="list" aria-label="Wizard progress">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => !running && setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  i === step ? "border-primary bg-primary text-primary-foreground"
                  : i < step ? "border-success/40 bg-success/10 text-success"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary",
                )}
              >
                <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                  i === step ? "bg-primary-foreground/20" : i < step ? "bg-success/20" : "bg-secondary")}>
                  {i < step ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
                </span>
                {s}
              </button>
              {i < steps.length - 1 && <span className="text-muted-foreground/40" aria-hidden="true">›</span>}
            </li>
          ))}
        </ol>

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">{steps[step]}</CardTitle>
              <p className="text-sm text-muted-foreground">{stepHelp[step]}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {step === 0 && (
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Review name" required help="Use a descriptive, scannable name.">
                    <Input value={name} onChange={(e) => setName(e.target.value)} aria-required />
                    {name.trim().length === 0 && <p className="mt-1 text-xs text-destructive">Required.</p>}
                  </Field>
                  <Field label="Product / application" required>
                    <Input value={product} onChange={(e) => setProduct(e.target.value)} aria-required />
                  </Field>
                  <Field label="Business domain">
                    <Select value={domain} onValueChange={setDomain}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bfsi">Banking & Financial Services</SelectItem>
                        <SelectItem value="insurance">Insurance</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="enterprise">Enterprise / B2B</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Platform">
                    <Select defaultValue="responsive">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="web">Web</SelectItem>
                        <SelectItem value="mobile">Mobile</SelectItem>
                        <SelectItem value="responsive">Responsive web</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Review type">
                    <Select value={reviewType} onValueChange={setReviewType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full UX Review</SelectItem>
                        <SelectItem value="prd">PRD Alignment Review</SelectItem>
                        <SelectItem value="a11y">Accessibility Review</SelectItem>
                        <SelectItem value="ds">Design System Review</SelectItem>
                        <SelectItem value="content">Content & Microcopy Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Reviewer / owner" className="md:col-span-2">
                    <Input value={owner} onChange={(e) => setOwner(e.target.value)} />
                  </Field>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div
                    className={cn(
                      "rounded-xl border-2 border-dashed p-8 text-center transition cursor-pointer",
                      isDragging
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/40 hover:border-primary/40 hover:bg-secondary/70"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
                    <p className="mt-3 text-sm font-medium">Drag & drop screens, flows or PRDs</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, PDF, DOCX — up to 20 MB each</p>
                    <Button variant="outline" size="sm" className="mt-3 min-h-9" type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileInputRef.current?.click(); }}>Browse files</Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      className="hidden"
                      onChange={handleFilePick}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Figma prototype URL">
                      <div className="relative">
                        <Figma className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                          placeholder="https://figma.com/proto/…"
                          className="pl-9"
                          value={figmaUrl}
                          onChange={(e) => setFigmaUrl(e.target.value)}
                        />
                      </div>
                    </Field>
                    <Field label="Design system reference">
                      <div className="relative">
                        <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                          placeholder="https://zeroheight.com/…"
                          className="pl-9"
                          value={designSystemUrl}
                          onChange={(e) => setDesignSystemUrl(e.target.value)}
                        />
                      </div>
                    </Field>
                  </div>
                  <Field label="Flow screenshots & PRD">
                    <Textarea
                      rows={3}
                      placeholder="Paste flow notes, PRD excerpts, or context the AI should know."
                      value={contextText}
                      onChange={(e) => setContextText(e.target.value)}
                    />
                  </Field>
                  <Field label="User-session recording (optional)" help="Coming soon — placeholder for future scope.">
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
                      <Video className="h-4 w-4" aria-hidden="true" />Drop a recording here once enabled.
                    </div>
                  </Field>
                  {files.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Uploaded assets ({files.length})</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {files.map((f) => (
                          <div key={f.name} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-primary"><FileText className="h-4 w-4" aria-hidden="true" /></div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{f.name}</p>
                              <p className="text-[11px] text-muted-foreground">{f.type} · {f.status}</p>
                            </div>
                            <button type="button" onClick={() => setFiles(files.filter((x) => x.name !== f.name))} className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label={`Remove ${f.name}`}>
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  {criteriaGroups.map((g) => (
                    <div key={g.group}>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{g.group}</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {g.items.map((c) => {
                          const active = criteria.includes(c);
                          return (
                            <button
                              type="button"
                              key={c}
                              onClick={() => toggleCriterion(c)}
                              className={cn(
                                "flex min-h-[44px] items-start gap-3 rounded-lg border p-3 text-left transition",
                                active ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary/60",
                              )}
                              aria-pressed={active}
                            >
                              <Checkbox checked={active} className="mt-0.5" tabIndex={-1} />
                              <span className="text-sm font-medium">{c}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {criteria.length === 0 && <p className="text-xs text-destructive">Select at least one criterion to continue.</p>}
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Checklist version">
                    <Select defaultValue="uxm-2025-5">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uxm-2025-5">UXM-2025.5 (latest)</SelectItem>
                        <SelectItem value="uxm-2025-4">UXM-2025.4</SelectItem>
                        <SelectItem value="wcag-2-2">WCAG 2.2</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Review depth">
                    <RadioGroup value={depth} onValueChange={setDepth} className="grid grid-cols-3 gap-2">
                      {["quick", "standard", "deep"].map((v) => (
                        <Label key={v} className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-border bg-card p-3 capitalize has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                          <RadioGroupItem value={v} />
                          <span className="text-sm">{v}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </Field>
                  <Field label={`Confidence threshold · ${confidence[0]}%`} help="Findings below this AI confidence are flagged for manual review.">
                    <Slider value={confidence} onValueChange={setConfidence} min={50} max={99} step={1} aria-label="Confidence threshold" />
                  </Field>
                  <Field label="Areas included">
                    <Select defaultValue="all">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All selected screens</SelectItem>
                        <SelectItem value="key">Key flows only</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="space-y-2.5 md:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Include in output</p>
                    {[
                      ["Recommendations with acceptance criteria", true],
                      ["Linked principle for each finding", true],
                      ["Requirement traceability", true],
                      ["Accessibility impact (WCAG)", true],
                      ["Business impact estimate", true],
                    ].map(([label, def]) => (
                      <div key={label as string} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
                        <Label className="text-sm">{label}</Label>
                        <Switch defaultChecked={def as boolean} />
                      </div>
                    ))}
                  </div>
                  <div className="md:col-span-2 flex gap-2 rounded-lg border border-info/30 bg-info/5 p-3 text-xs">
                    <Info className="h-4 w-4 shrink-0 text-info" aria-hidden="true" />
                    <p><strong className="text-foreground">AI findings are drafts.</strong> You approve, edit, dismiss, or escalate each one before export.</p>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  {!running ? (
                    <div className="rounded-xl border border-border bg-gradient-to-br from-secondary/60 to-card p-6 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Sparkles className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <h3 className="mt-3 text-base font-semibold">Ready to run AI review</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{files.length} inputs · {criteria.length} criteria · {depth} depth · ~2–4 min estimated</p>
                      <Button size="lg" className="mt-4 min-h-11" onClick={runReview}>
                        <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />Run analysis
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-xl border border-border bg-card p-5" role="status" aria-live="polite">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                        <p className="text-sm font-medium">{currentStageLabel || "AI agent at work…"}</p>
                      </div>
                      <Progress value={((stageIdx + 1) / progressStages.length) * 100} className="h-1.5" />
                      <ul className="mt-2 space-y-1.5">
                        {progressStages.map((s, i) => (
                          <li key={s} className="flex items-center gap-2 text-sm">
                            {i < stageIdx ? <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                            : i === stageIdx ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />
                            : <span className="h-3.5 w-3.5 rounded-full border border-border" />}
                            <span className={i <= stageIdx ? "text-foreground" : "text-muted-foreground"}>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary panel */}
          <aside className="space-y-3">
            <Card className="shadow-card">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Review summary</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-xs">
                <SumRow label="Name" value={name || "—"} />
                <SumRow label="Product" value={product || "—"} />
                <SumRow label="Domain" value={domain} capitalize />
                <SumRow label="Type" value={reviewType} capitalize />
                <SumRow label="Inputs" value={`${files.length}`} />
                <SumRow label="Criteria" value={`${criteria.length}`} />
                <SumRow label="Depth" value={depth} capitalize />
                <SumRow label="Confidence" value={`≥ ${confidence[0]}%`} />
              </CardContent>
            </Card>
            {criteria.length > 0 && (
              <Card className="shadow-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Selected criteria</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-1.5">
                  {criteria.map((c) => (
                    <Badge key={c} variant="secondary" className="gap-1 pl-2 pr-1 text-[10px]">
                      {c}
                      <button type="button" onClick={() => toggleCriterion(c)} className="ml-1 rounded-full p-0.5 hover:bg-foreground/10" aria-label={`Remove ${c}`}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            )}
          </aside>
        </div>

        {/* Navigation */}
        {!running && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" className="min-h-10" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="min-h-10" onClick={() => toast.success("Draft saved")}>
                <Save className="mr-1.5 h-4 w-4" aria-hidden="true" />Save draft
              </Button>
              {step < steps.length - 1 ? (
                <Button
                  className="min-h-10"
                  disabled={(step === 0 && !validStep0) || (step === 1 && !validStep1) || (step === 2 && !validStep2)}
                  onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                >
                  Continue<ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button className="min-h-10" onClick={runReview}><Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />Run review</Button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Field({ label, children, className, required, help }: { label: string; children: React.ReactNode; className?: string; required?: boolean; help?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}{required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
      </Label>
      {children}
      {help && <p className="text-[11px] text-muted-foreground">{help}</p>}
    </div>
  );
}

function SumRow({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium text-right ${capitalize ? "capitalize" : ""}`}>{value}</span>
    </div>
  );
}
