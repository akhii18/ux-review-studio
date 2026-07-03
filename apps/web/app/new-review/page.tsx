"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { processPdf } from "@/lib/pdfToPageFiles";
import { processDocx } from "@/lib/docxToMarkdown";
import { useRouter } from "next/navigation";
import { createReview, saveAsset, startReview, getReviewProgress, convertLegacyDocAsset } from "@/lib/api";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Check, Upload, FileText, Figma, Link as LinkIcon, X, ArrowRight,
  Sparkles, Loader2, Save, Info, Video, ChevronLeft, ChevronRight, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Subcategory groups matching the mentor's checklist image ─────────────────
const SUBCATEGORY_GROUPS = [
  {
    category: "Usability",
    agent: "usability",
    items: [
      { id: "nielsensHeuristics",   label: "Nielsen's 10 heuristics" },
      { id: "navigationLogic",      label: "Navigation logic" },
      { id: "taskFlowEfficiency",   label: "Task flow efficiency" },
      { id: "recognitionOverRecall",label: "Recognition over recall" },
    ],
  },
  {
    category: "Accessibility",
    agent: "accessibility",
    items: [
      { id: "wcagConformance",            label: "WCAG 2.2 AA conformance" },
      { id: "keyboardNavigation",         label: "Keyboard navigation" },
      { id: "screenReaderInterpretation", label: "Screen reader interpretation" },
      { id: "touchTargets",               label: "Touch targets \u2265 44px" },
    ],
  },
  {
    category: "Consistency",
    agent: "cognitiveInteraction",
    items: [
      { id: "designSystemTokens",    label: "Design system tokens" },
      { id: "componentUsage",        label: "Component usage" },
      { id: "spacingGrid",           label: "Spacing 8pt grid" },
      { id: "iconographyConsistency",label: "Iconography consistency" },
    ],
  },
  {
    category: "Content UX",
    agent: "contentMicrocopy",
    items: [
      { id: "microcopyClarity",    label: "Microcopy clarity" },
      { id: "errorMessageQuality", label: "Error message quality" },
      { id: "labelPrecision",      label: "Label precision" },
      { id: "toneAndVoice",        label: "Tone & voice" },
    ],
  },
  {
    category: "Risk",
    agent: "gestalt",
    items: [
      { id: "section508Compliance",    label: "Compliance (Section 508)" },
      { id: "domainRegulation",        label: "Domain regulation (HIPAA, BFSI)" },
      { id: "destructiveActionSafety", label: "Destructive action safety" },
      { id: "dataPrivacyDisclosures",  label: "Data privacy disclosures" },
    ],
  },
  {
    category: "Recommendations",
    agent: "visualDesign",
    items: [
      { id: "businessImpactEstimate", label: "Business impact estimate" },
      { id: "effortEstimate",         label: "Effort estimate" },
      { id: "acceptanceCriteria",     label: "Acceptance criteria" },
      { id: "linkedPrinciple",        label: "Linked principle" },
    ],
  },
] as const;

type SubcategoryId = typeof SUBCATEGORY_GROUPS[number]["items"][number]["id"];

/** Derive the unique backend agent names from any set of selected subcategory IDs */
function getAgentsFromSubcategories(subcategoryIds: string[]): string[] {
  const agents = new Set<string>();
  for (const group of SUBCATEGORY_GROUPS) {
    if (group.items.some((item) => subcategoryIds.includes(item.id))) {
      agents.add(group.agent);
    }
  }
  return Array.from(agents);
}

const REVIEW_TYPE_REQUIRED_CRITERIA: Record<string, string[]> = {
  full: [
    "nielsensHeuristics", "navigationLogic", "taskFlowEfficiency", "recognitionOverRecall",
    "wcagConformance", "keyboardNavigation", "screenReaderInterpretation", "touchTargets",
    "designSystemTokens", "componentUsage", "spacingGrid", "iconographyConsistency",
    "microcopyClarity", "errorMessageQuality", "labelPrecision", "toneAndVoice",
    "section508Compliance", "domainRegulation", "destructiveActionSafety", "dataPrivacyDisclosures",
    "businessImpactEstimate", "effortEstimate", "acceptanceCriteria", "linkedPrinciple",
  ],
  prd: ["nielsensHeuristics", "navigationLogic", "taskFlowEfficiency", "designSystemTokens", "componentUsage"],
  a11y: ["wcagConformance", "keyboardNavigation", "screenReaderInterpretation", "touchTargets", "section508Compliance"],
  ds: ["designSystemTokens", "componentUsage", "spacingGrid", "iconographyConsistency"],
  content: ["microcopyClarity", "errorMessageQuality", "labelPrecision", "toneAndVoice"],
};

const steps = ["Review Setup", "Add Inputs", "Select Criteria", "Configure AI", "Run Review"];
const stepHelp = [
  "Tell us what you're reviewing — name, product, domain, and type.",
  "Upload screens, paste a Figma URL, or add PRDs and flow assets.",
  "Pick the governed frameworks the AI should apply.",
  "Tune depth, confidence threshold, and what's included in the output.",
  "",
];

const progressStages = [
  "Reading inputs", "Mapping requirements", "Analyzing screens",
  "Checking accessibility", "Reviewing consistency", "Generating findings", "Preparing report",
];

const backendStageToUiIndex: Record<string, number> = {
  reading_inputs: 0,
  analyzing_screens: 2,
  checking_accessibility: 3,
  reviewing_content: 4,
  checking_consistency: 4,
  mapping_review_basis: 5,
  prioritizing_findings: 5,
  generating_report: 6,
  completed: 6,
  failed: 6,
};

function formatBackendStage(stage?: string | null): string {
  if (!stage) return "Analyzing…";

  const labels: Record<string, string> = {
    reading_inputs: "Reading inputs",
    analyzing_screens: "Analyzing screens",
    checking_accessibility: "Checking accessibility",
    reviewing_content: "Reviewing content",
    checking_consistency: "Reviewing consistency",
    mapping_review_basis: "Mapping requirements",
    prioritizing_findings: "Generating findings",
    generating_report: "Preparing report",
    completed: "Completed",
    failed: "Failed",
  };

  return labels[stage] ?? stage.replace(/_/g, " ");
}

function toAlphaNumeric(value: string): string {
  return value.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s{2,}/g, " ");
}

export default function NewReviewPage() {
  type UploadAsset = {
    id: string;
    name: string;
    type: string;
    status: string;
    file?: File;
    previewUrl?: string;
    visibleInUi?: boolean;
    sourceDocumentId?: string;
  };

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
  const [files, setFiles] = useState<UploadAsset[]>([]);
  const [contextText, setContextText] = useState("");
  const [depth, setDepth] = useState("standard");
  const [confidence, setConfidence] = useState([75]);
  const [running, setRunning] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [currentStageLabel, setCurrentStageLabel] = useState("");
  const stageIdxRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<UploadAsset[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isDocProcessing, setIsDocProcessing] = useState(false);
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [activeScreenshotIndex, setActiveScreenshotIndex] = useState(0);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [activePdfIndex, setActivePdfIndex] = useState(0);

  const visibleFiles = useMemo(
    () => files.filter((file) => file.visibleInUi !== false),
    [files]
  );

  const screenshotFiles = useMemo(
    () => visibleFiles.filter((file) => file.type === "Screenshot" && Boolean(file.previewUrl)),
    [visibleFiles]
  );

  const pdfFiles = useMemo(
    () => visibleFiles.filter((file) => file.type === "PDF" && Boolean(file.previewUrl)),
    [visibleFiles]
  );

  useEffect(() => {
    const requiredForType = REVIEW_TYPE_REQUIRED_CRITERIA[reviewType] ?? [];
    if (requiredForType.length === 0) return;

    setCriteria((current) => {
      const merged = Array.from(new Set([...requiredForType, ...current]));
      return merged;
    });
  }, [reviewType]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    return () => {
      filesRef.current.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!isScreenshotModalOpen) return;
    if (screenshotFiles.length === 0) {
      setIsScreenshotModalOpen(false);
      return;
    }
    if (activeScreenshotIndex > screenshotFiles.length - 1) {
      setActiveScreenshotIndex(screenshotFiles.length - 1);
    }
  }, [activeScreenshotIndex, isScreenshotModalOpen, screenshotFiles]);

  useEffect(() => {
    if (!isPdfModalOpen) return;
    if (pdfFiles.length === 0) {
      setIsPdfModalOpen(false);
      return;
    }
    if (activePdfIndex > pdfFiles.length - 1) {
      setActivePdfIndex(pdfFiles.length - 1);
    }
  }, [activePdfIndex, isPdfModalOpen, pdfFiles]);

  /**
   * Converts a raw File array into file-list entries.
   * PDFs are expanded page-by-page into PNG entries using pdfjs-dist so
   * every downstream consumer (upload loop, workspace viewer, AI pipeline)
   * treats them identically to uploaded screenshots.
   */
  const addFiles = async (picked: File[]) => {
    const entries: UploadAsset[] = [];
    const hasPdf = picked.some(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    const hasWord = picked.some(
      (f) =>
        f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        f.type === "application/msword" ||
        f.name.toLowerCase().endsWith(".docx") ||
        f.name.toLowerCase().endsWith(".doc")
    );
    const needsDocProcessing = hasPdf || hasWord;
    const markdownChunks: string[] = [];

    if (needsDocProcessing) {
      setIsDocProcessing(true);
      const label = hasPdf && hasWord ? "PDF & Word document" : hasPdf ? "PDF" : "Word document";
      toast.info(`Extracting text & images from ${label} — this may take a moment…`);
    }

    try {
      for (const file of picked) {
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        const isDocx =
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.name.toLowerCase().endsWith(".docx");
        const isDoc =
          file.type === "application/msword" ||
          file.name.toLowerCase().endsWith(".doc");
        const isWord = isDocx || isDoc;
        const isScreenshot = file.type.startsWith("image/");

        if (isPdf) {
          const pdfEntryId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          entries.push({
            id: pdfEntryId,
            name: file.name,
            type: "PDF",
            status: "Ready",
            file,
            previewUrl: URL.createObjectURL(file),
            visibleInUi: true,
          });

          // Extract text + images separately from each PDF.
          try {
            const result = await processPdf(file);
            entries.push(
              ...result.images.map((image) => ({
                ...image,
                visibleInUi: false,
                sourceDocumentId: pdfEntryId,
              }))
            );
            if (result.markdown.trim()) {
              markdownChunks.push(result.markdown);
            }
          } catch (err) {
            console.error(`Failed to process PDF "${file.name}":`, err);
            // Keep the original PDF visible even if extraction fails.
          }
        } else if (isWord) {
          // Extract text + images separately from each Word document.
          try {
            if (isDoc) {
              const base64Data = await toBase64(file);
              const result = await convertLegacyDocAsset({
                name: file.name,
                mimeType: file.type || "application/msword",
                base64Data,
              });

              for (const image of result.images) {
                const convertedFile = base64ToFile(image.base64Data, image.name, image.mimeType);
                entries.push({
                  id: `doc-legacy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                  name: image.name,
                  type: "Screenshot",
                  status: "Ready",
                  file: convertedFile,
                  previewUrl: URL.createObjectURL(convertedFile),
                  visibleInUi: false,
                });
              }

              if (result.markdown.trim()) {
                markdownChunks.push(`--- ${file.name} ---\n${result.markdown}`);
              }
            } else {
              const result = await processDocx(file);
              entries.push(...result.images.map((image) => ({ ...image, visibleInUi: false })));
              if (result.markdown.trim()) {
                markdownChunks.push(`--- ${file.name} ---\n${result.markdown}`);
              }
            }
          } catch (err) {
            console.error(`Failed to process Word document "${file.name}":`, err);
            // Fall back to treating the Word file as a raw upload so the user isn't blocked.
            entries.push({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              name: file.name,
              type: "PRD",
              status: "Ready",
              file,
            });

            if (isDoc) {
              toast.error(`Could not parse legacy Word file ${file.name}. Please retry or convert it to .docx.`);
            }
          }
        } else {
          entries.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: file.name,
            type: isScreenshot ? "Screenshot" : "PRD",
            status: "Ready",
            file,
            previewUrl: isScreenshot ? URL.createObjectURL(file) : undefined,
            visibleInUi: true,
          });
        }
      }

      setFiles((cur) => [...cur, ...entries]);

      // Append extracted document markdown to the context text area
      if (markdownChunks.length > 0) {
        const newMarkdown = markdownChunks.join("\n\n");
        setContextText((prev) => {
          const separator = prev.trim() ? "\n\n" : "";
          return prev + separator + newMarkdown;
        });
      }

      if (needsDocProcessing) {
        const imageCount = entries.filter((e) => e.type === "Screenshot").length;
        const label = hasPdf && hasWord ? "Documents" : hasPdf ? "PDF" : "Word document";
        toast.success(`${label} processed — ${imageCount} image${imageCount === 1 ? "" : "s"} extracted, text added to flow notes.`);
      }
    } finally {
      if (needsDocProcessing) setIsDocProcessing(false);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles((current) => {
      const idsToRemove = new Set<string>([fileId]);
      current.forEach((file) => {
        if (file.sourceDocumentId === fileId) {
          idsToRemove.add(file.id);
        }
      });

      current.forEach((file) => {
        if (idsToRemove.has(file.id) && file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });

      return current.filter((file) => !idsToRemove.has(file.id));
    });
  };

  const openScreenshotModal = (fileId: string) => {
    const index = screenshotFiles.findIndex((file) => file.id === fileId);
    if (index < 0) return;
    setActiveScreenshotIndex(index);
    setIsScreenshotModalOpen(true);
  };

  const openPdfModal = (fileId: string) => {
    const index = pdfFiles.findIndex((file) => file.id === fileId);
    if (index < 0) return;
    setActivePdfIndex(index);
    setIsPdfModalOpen(true);
  };

  const removeActiveScreenshotFromModal = () => {
    const activeScreenshot = screenshotFiles[activeScreenshotIndex];
    if (!activeScreenshot) return;
    removeFile(activeScreenshot.id);
  };

  const removeActivePdfFromModal = () => {
    const activePdf = pdfFiles[activePdfIndex];
    if (!activePdf) return;
    removeFile(activePdf.id);
  };

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
    void addFiles(picked);
  };

  const toggleCriterion = (c: string) =>
    setCriteria((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    void addFiles(picked);
  };

  const toBase64 = (f: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res((r.result as string).split(",")[1] ?? "");
      r.onerror = rej;
      r.readAsDataURL(f);
    });

  const base64ToFile = (base64Data: string, fileName: string, mimeType: string): File => {
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], fileName, { type: mimeType });
  };

  const runReview = async () => {
    const hasImageAsset = files.some(
      (asset) => asset.type === "Screenshot" && Boolean(asset.file) && (asset.file?.type.startsWith("image/") ?? false)
    );

    if (!hasImageAsset) {
      toast.error("Add at least one screenshot image before starting the review.");
      setStep(1);
      return;
    }

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

          const mappedIdx = backendStageToUiIndex[progress.stage ?? ""];
          const idx = typeof mappedIdx === "number"
            ? mappedIdx
            : stageIdxRef.current;

          stageIdxRef.current = idx;
          setStageIdx(idx);
          setCurrentStageLabel(formatBackendStage(progress.stage));

          if (progress.status === "completed") {
            if (pollRef.current) clearInterval(pollRef.current);
            stageIdxRef.current = progressStages.length - 1;
            setStageIdx(progressStages.length - 1);
            setCurrentStageLabel("Completed");
            toast.success(`Review complete — ${progress.findingCount || 0} findings generated.`);
            setTimeout(() => {
              router.push(`/workspace?reviewId=${reviewId}`);
            }, 600);
          } else if (progress.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            toast.error("Review pipeline failed. Check server logs.");
            setCurrentStageLabel("Failed");
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
  const validStep1 = files.some(
    (asset) => asset.type === "Screenshot" && Boolean(asset.file) && (asset.file?.type.startsWith("image/") ?? false)
  );
  const validStep2 = criteria.length > 0;

  return (
    <>
      <AppHeader title="New Review" subtitle="Set up an AI-assisted UX review in 5 guided steps" />
      <div className="flex-1 p-4 pb-28 md:p-6 md:pb-28">
        {/* Stepper */}
        <div className="sticky top-16 z-20 -mx-4 bg-background/90 px-4 py-3 backdrop-blur-lg supports-[backdrop-filter]:bg-background/75 md:-mx-6 md:px-6">
          <ol className="flex flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="list" aria-label="Wizard progress">
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
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">{steps[step]}</CardTitle>
              {stepHelp[step] && <p className="text-sm text-muted-foreground">{stepHelp[step]}</p>}
            </CardHeader>
            <CardContent className="space-y-6">
              {step === 0 && (
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Review name" required help="Use a descriptive, scannable name.">
                    <Input value={name} onChange={(e) => setName(toAlphaNumeric(e.target.value))} aria-required />
                    {name.trim().length === 0 && <p className="mt-1 text-xs text-destructive">Required.</p>}
                  </Field>
                  <Field label="Product / application" required>
                    <Input value={product} onChange={(e) => setProduct(toAlphaNumeric(e.target.value))} aria-required />
                  </Field>
                  <Field label="Business domain">
                    <Select value={domain} onValueChange={setDomain}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground">
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
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground">
                        <SelectItem value="web">Web</SelectItem>
                        <SelectItem value="mobile">Mobile</SelectItem>
                        <SelectItem value="responsive">Responsive web</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Review type">
                    <Select value={reviewType} onValueChange={setReviewType}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground">
                        <SelectItem value="full">Full UX Review</SelectItem>
                        <SelectItem value="prd">PRD Alignment Review</SelectItem>
                        <SelectItem value="a11y">Accessibility Review</SelectItem>
                        <SelectItem value="ds">Design System Review</SelectItem>
                        <SelectItem value="content">Content & Microcopy Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Reviewer / owner" className="md:col-span-2">
                    <Input value={owner} onChange={(e) => setOwner(toAlphaNumeric(e.target.value))} />
                  </Field>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div
                    className={cn(
                      "rounded-xl border-2 border-dashed p-8 text-center transition cursor-pointer",
                      isDocProcessing
                        ? "border-primary/40 bg-primary/5 cursor-wait"
                        : isDragging
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/40 hover:border-primary/40 hover:bg-secondary/70"
                    )}
                    onClick={() => !isDocProcessing && fileInputRef.current?.click()}
                    onDragOver={!isDocProcessing ? handleDragOver : undefined}
                    onDragLeave={!isDocProcessing ? handleDragLeave : undefined}
                    onDrop={!isDocProcessing ? handleDrop : undefined}
                  >
                    {isDocProcessing ? (
                      <>
                        <svg className="mx-auto h-7 w-7 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                        <p className="mt-3 text-sm font-medium text-primary">Extracting text & images…</p>
                        <p className="text-xs text-muted-foreground">Please wait while text and images are separated</p>
                      </>
                    ) : (
                      <>
                        <Upload className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
                        <p className="mt-3 text-sm font-medium">Drag & drop screens, flows or PRDs</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, PDF, DOCX — up to 20 MB each</p>
                        <Button variant="outline" size="sm" className="mt-3 min-h-9" type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileInputRef.current?.click(); }}>Browse files</Button>
                      </>
                    )}
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
                  {visibleFiles.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Uploaded assets ({visibleFiles.length})</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {visibleFiles.map((f) => (
                          <div key={f.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                            {f.type === "Screenshot" && f.previewUrl ? (
                              <button
                                type="button"
                                onClick={() => openScreenshotModal(f.id)}
                                className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border"
                                aria-label={`Open screenshot preview for ${f.name}`}
                              >
                                <img src={f.previewUrl} alt={f.name} className="h-full w-full object-cover" />
                              </button>
                            ) : f.type === "PDF" && f.previewUrl ? (
                              <button
                                type="button"
                                onClick={() => openPdfModal(f.id)}
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-secondary/60 text-[10px] font-semibold text-primary"
                                aria-label={`Open PDF preview for ${f.name}`}
                              >
                                PDF
                              </button>
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary"><FileText className="h-4 w-4" aria-hidden="true" /></div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{f.name}</p>
                              <p className="text-[11px] text-muted-foreground">{f.type} · {f.status}</p>
                            </div>
                            <button type="button" onClick={() => removeFile(f.id)} className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label={`Remove ${f.name}`}>
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
                <div className="space-y-6">
                  {SUBCATEGORY_GROUPS.map((group) => {
                    const groupItems = group.items;
                    const allSelected = groupItems.every((item) => criteria.includes(item.id));
                    const someSelected = groupItems.some((item) => criteria.includes(item.id));

                    const toggleGroup = () => {
                      if (allSelected) {
                        // Deselect all in group
                        setCriteria((cur) => cur.filter((c) => !groupItems.some((item) => item.id === c)));
                      } else {
                        // Select all in group
                        setCriteria((cur) => Array.from(new Set([...cur, ...groupItems.map((item) => item.id)])));
                      }
                    };

                    return (
                      <div key={group.category}>
                        {/* Category header with select-all toggle */}
                        <button
                          type="button"
                          onClick={toggleGroup}
                          className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition"
                        >
                          <span
                            className={cn(
                              "flex h-3.5 w-3.5 items-center justify-center rounded-sm border transition",
                              allSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : someSelected
                                ? "border-primary bg-primary/30"
                                : "border-border bg-card"
                            )}
                          >
                            {allSelected && <Check className="h-2.5 w-2.5" />}
                            {someSelected && !allSelected && (
                              <span className="block h-0.5 w-2 rounded-full bg-primary" />
                            )}
                          </span>
                          {group.category}
                        </button>

                        {/* Subcategory items grid — 2 columns matching the mentor image */}
                        <div className="grid gap-2 sm:grid-cols-2">
                          {groupItems.map((item) => {
                            const active = criteria.includes(item.id);
                            return (
                              <button
                                type="button"
                                key={item.id}
                                onClick={() => toggleCriterion(item.id)}
                                className={cn(
                                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition hover:bg-secondary/60",
                                  active
                                    ? "border-primary bg-primary/5 hover:bg-primary/10"
                                    : "border-border bg-card"
                                )}
                                aria-pressed={active}
                              >
                                <Checkbox checked={active} className="shrink-0" tabIndex={-1} />
                                <span className={cn("font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                                  {item.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {criteria.length === 0 && (
                    <p className="text-xs text-destructive">Select at least one criterion to continue.</p>
                  )}
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
                      <p className="mt-1 text-sm text-muted-foreground">{visibleFiles.length} inputs · {criteria.length} subcategories · {getAgentsFromSubcategories(criteria).length} agents · {depth} depth · ~2–4 min estimated</p>
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        <Button size="lg" variant="outline" className="min-h-11" onClick={() => toast.success("Draft saved")}>
                          <Save className="mr-1.5 h-4 w-4" aria-hidden="true" />Save draft
                        </Button>
                        <Button size="lg" className="min-h-11" onClick={runReview}>
                          <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />Run analysis
                        </Button>
                      </div>
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
                <SumRow label="Inputs" value={`${visibleFiles.length}`} />
                <SumRow label="Criteria" value={`${criteria.length}`} />
                <SumRow label="Depth" value={depth} capitalize />
                <SumRow label="Confidence" value={`≥ ${confidence[0]}%`} />
              </CardContent>
            </Card>
            {criteria.length > 0 && (
              <Card className="shadow-card">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Selected criteria</CardTitle></CardHeader>
                <CardContent className="space-y-1.5">
                  {SUBCATEGORY_GROUPS.map((group) => {
                    const selectedInGroup = group.items.filter((item) => criteria.includes(item.id));
                    if (selectedInGroup.length === 0) return null;
                    return (
                      <div key={group.category}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.category}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selectedInGroup.map((item) => (
                            <Badge key={item.id} variant="secondary" className="gap-1 pl-2 pr-1 text-[10px]">
                              {item.label}
                              <button
                                type="button"
                                onClick={() => toggleCriterion(item.id)}
                                className="ml-1 rounded-full p-0.5 hover:bg-foreground/10"
                                aria-label={`Remove ${item.label}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </aside>
        </div>

        {/* Navigation */}
        {!running && step < steps.length - 1 && (
          <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-end px-4 py-3 md:left-[var(--sidebar-width)] md:px-6 md:peer-data-[state=collapsed]:left-[var(--sidebar-width-icon)]">
            <div className="flex gap-2">
              <Button variant="outline" className="min-h-10" onClick={() => toast.success("Draft saved")}>
                <Save className="mr-1.5 h-4 w-4" aria-hidden="true" />Save draft
              </Button>
              <Button
                className="min-h-10"
                disabled={(step === 0 && !validStep0) || (step === 1 && !validStep1) || (step === 2 && !validStep2)}
                onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              >
                Continue<ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isScreenshotModalOpen} onOpenChange={setIsScreenshotModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-sm font-medium">
                Screenshots ({screenshotFiles.length})
              </DialogTitle>
              {screenshotFiles.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={removeActiveScreenshotFromModal}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />Remove
                </Button>
              )}
            </div>
          </DialogHeader>

          {screenshotFiles.length > 0 && (
            <div className="space-y-3 p-4">
              <div className="relative flex items-center justify-center rounded-lg border border-border bg-secondary/30 p-2">
                <img
                  src={screenshotFiles[activeScreenshotIndex]?.previewUrl}
                  alt={screenshotFiles[activeScreenshotIndex]?.name}
                  className="max-h-[65vh] w-auto rounded object-contain"
                />

                {screenshotFiles.length > 1 && (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute left-3"
                      onClick={() => setActiveScreenshotIndex((idx) => (idx === 0 ? screenshotFiles.length - 1 : idx - 1))}
                      aria-label="Previous screenshot"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute right-3"
                      onClick={() => setActiveScreenshotIndex((idx) => (idx === screenshotFiles.length - 1 ? 0 : idx + 1))}
                      aria-label="Next screenshot"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm text-muted-foreground">{screenshotFiles[activeScreenshotIndex]?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {activeScreenshotIndex + 1} / {screenshotFiles.length}
                </p>
              </div>

              {screenshotFiles.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {screenshotFiles.map((file, idx) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => setActiveScreenshotIndex(idx)}
                      className={cn(
                        "h-14 w-20 shrink-0 overflow-hidden rounded border",
                        idx === activeScreenshotIndex ? "border-primary" : "border-border"
                      )}
                      aria-label={`Open screenshot ${idx + 1}`}
                    >
                      <img src={file.previewUrl} alt={file.name} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-sm font-medium">
                PDFs ({pdfFiles.length})
              </DialogTitle>
              {pdfFiles.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={removeActivePdfFromModal}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />Remove
                </Button>
              )}
            </div>
          </DialogHeader>

          {pdfFiles.length > 0 && (
            <div className="space-y-3 p-4">
              <div className="relative rounded-lg border border-border bg-secondary/20">
                <iframe
                  title={pdfFiles[activePdfIndex]?.name}
                  src={pdfFiles[activePdfIndex]?.previewUrl}
                  className="h-[65vh] w-full rounded"
                />

                {pdfFiles.length > 1 && (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      onClick={() => setActivePdfIndex((idx) => (idx === 0 ? pdfFiles.length - 1 : idx - 1))}
                      aria-label="Previous PDF"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      onClick={() => setActivePdfIndex((idx) => (idx === pdfFiles.length - 1 ? 0 : idx + 1))}
                      aria-label="Next PDF"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm text-muted-foreground">{pdfFiles[activePdfIndex]?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {activePdfIndex + 1} / {pdfFiles.length}
                </p>
              </div>

              {pdfFiles.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {pdfFiles.map((file, idx) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => setActivePdfIndex(idx)}
                      className={cn(
                        "flex h-12 w-20 shrink-0 items-center justify-center rounded border text-xs font-semibold",
                        idx === activePdfIndex ? "border-primary text-primary" : "border-border text-muted-foreground"
                      )}
                      aria-label={`Open PDF ${idx + 1}`}
                    >
                      PDF {idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, children, className, required, help }: { label: string; children: React.ReactNode; className?: string; required?: boolean; help?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}{required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
      </Label>
      {children}
      {help && <p className="text-[11px] text-muted-foreground">{help}</p>}
    </div>
  );
}

function SumRow({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="font-semibold text-foreground">{label}</span>
      <span className={`font-medium text-right ${capitalize ? "capitalize" : ""}`}>{value}</span>
    </div>
  );
}
