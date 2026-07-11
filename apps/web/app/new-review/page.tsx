"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { processPdf } from "@/lib/pdfToPageFiles";
import { processDocx } from "@/lib/docxToMarkdown";
import { useRouter, useSearchParams } from "next/navigation";
import { convertLegacyDocAsset, getReview, getReviewProgress, saveReviewDraft, startReview, type ReviewDepth } from "@/lib/api";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useAppDispatch } from "@/store/hooks";
import { addNotification } from "@/store/slices/notificationsSlice";
import {
  Check, Upload, FileText, Figma, Link as LinkIcon, X, ArrowRight,
  Sparkles, Loader2, Save, Info, Video, ChevronLeft, ChevronRight, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  DEFAULT_FINDING_OUTPUT_OPTIONS,
  FINDING_OUTPUT_OPTIONS,
  type AnalysisScope,
  type FindingOutputOptionKey,
} from "@uxm/shared";

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

type ReviewFileEntry = {
  id: string;
  name: string;
  type: string;
  status: string;
  file?: File;
  previewUrl?: string;
  blobUrl?: string;
  mimeType?: string;
  contentText?: string;
  sizeBytes?: number;
  visibleInUi?: boolean;
  sourceDocumentId?: string;
};

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
  partial: [],
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

function normalizeCriteria(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function getReviewTypeFromCriteria(values: string[]): string {
  const normalized = normalizeCriteria(values);

  for (const [type, preset] of Object.entries(REVIEW_TYPE_REQUIRED_CRITERIA)) {
    if (type === "partial") continue;
    const normalizedPreset = normalizeCriteria(preset);
    if (normalizedPreset.length === normalized.length && normalizedPreset.every((value, index) => value === normalized[index])) {
      return type;
    }
  }

  return "partial";
}

const steps = ["Review Setup", "Add Inputs", "Select Criteria", "Configure AI", "Run Review"];
const stepHelp = [
  "Tell us what you're reviewing — name, product, domain, and type.",
  "Upload screens, paste a Figma URL, or add PRDs and flow assets.",
  "Pick the governed frameworks the AI should apply.",
  "Tune depth, confidence threshold, and what's included in the output.",
  "",
];

const progressStages = [
  "Reading inputs", "Mapping requirements", "Discovering flows", "Analyzing screens",
  "Checking accessibility", "Reviewing consistency", "Generating findings", "Preparing report",
];

const backendStageToUiIndex: Record<string, number> = {
  capturing_figma_prototype: 0,
  capturing_website_reference: 0,
  reading_inputs: 0,
  discovering_flows: 2,
  analyzing_screens: 3,
  checking_accessibility: 4,
  reviewing_content: 5,
  checking_consistency: 5,
  mapping_review_basis: 6,
  prioritizing_findings: 6,
  generating_report: 7,
  completed: 7,
  failed: 7,
};

function formatBackendStage(stage?: string | null): string {
  if (!stage) return "Analyzing…";
  if (stage.startsWith("failed:")) return "Failed";

  const labels: Record<string, string> = {
    capturing_figma_prototype: "Capturing Figma prototype",
    capturing_website_reference: "Capturing website reference",
    reading_inputs: "Reading inputs",
    discovering_flows: "Discovering key flows",
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

function getFailureReason(stage?: string | null): string | null {
  if (!stage?.startsWith("failed:")) return null;
  return stage.slice("failed:".length).trim() || null;
}

function toAlphaNumeric(value: string): string {
  return value.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s{2,}/g, " ");
}

function isValidFigmaPrototypeUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:") return false;
    if (host !== "figma.com" && host !== "www.figma.com") return false;

    const path = url.pathname.toLowerCase();
    return Boolean(
      path.includes("/proto/") ||
      path.includes("/present/") ||
      path.includes("/presentation/") ||
      path.includes("/design/") ||
      (path.includes("/file/") && url.searchParams.has("node-id")) ||
      url.searchParams.has("node-id")
    );
  } catch {
    return false;
  }
}

function isValidWebsiteReferenceUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (url.username || url.password) return false;

    const host = url.hostname.toLowerCase();
    if (!host) return false;
    if (host === "localhost" || host === "0.0.0.0" || host === "::1") return false;
    if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return false;

    return true;
  } catch {
    return false;
  }
}

function parseStoredContextNotes(noteBlocks: string[]) {
  let storedFigmaUrl = "";
  let storedDesignSystemUrl = "";
  let storedWebsiteLoginIdentifier = "";
  let storedWebsiteLoginPassword = "";
  const remainingBlocks: string[] = [];

  for (const block of noteBlocks) {
    const retainedLines: string[] = [];

    for (const line of block.split(/\r?\n/)) {
      const trimmedLine = line.trim();

      if (!storedFigmaUrl && /^Figma URL:\s*/i.test(trimmedLine)) {
        storedFigmaUrl = trimmedLine.replace(/^Figma URL:\s*/i, "").trim();
        continue;
      }

      if (!storedDesignSystemUrl && /^Design System URL:\s*/i.test(trimmedLine)) {
        storedDesignSystemUrl = trimmedLine.replace(/^Design System URL:\s*/i, "").trim();
        continue;
      }

      if (!storedWebsiteLoginIdentifier && /^Website Login Identifier:\s*/i.test(trimmedLine)) {
        storedWebsiteLoginIdentifier = trimmedLine.replace(/^Website Login Identifier:\s*/i, "").trim();
        continue;
      }

      if (!storedWebsiteLoginPassword && /^Website Login Password:\s*/i.test(trimmedLine)) {
        storedWebsiteLoginPassword = trimmedLine.replace(/^Website Login Password:\s*/i, "").trim();
        continue;
      }

      retainedLines.push(line);
    }

    const retained = retainedLines.join("\n").trim();
    if (retained) {
      remainingBlocks.push(retained);
    }
  }

  return {
    figmaUrl: storedFigmaUrl,
    designSystemUrl: storedDesignSystemUrl,
    websiteLoginIdentifier: storedWebsiteLoginIdentifier,
    websiteLoginPassword: storedWebsiteLoginPassword,
    contextText: remainingBlocks.join("\n\n"),
  };
}

function formatReviewTypeLabel(value: string): string {
  const label = value.replaceAll("_", " ").trim().toLowerCase();
  if (!label) return "—";
  if (label === "partial") return "Custom";
  if (label === "a11y") return "A11y";
  if (label === "prd") return "PRD";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getAssetType(asset: { name?: string; mimeType?: string | null }) {
  const mimeType = asset.mimeType ?? "";
  const name = asset.name ?? "";
  if (mimeType.startsWith("image/")) return "Screenshot";
  if (mimeType === "application/pdf" || name.toLowerCase().endsWith(".pdf")) return "PDF";
  if (mimeType.includes("wordprocessingml") || name.toLowerCase().endsWith(".docx")) return "Word";
  return "PRD";
}

const REVIEW_DEPTH_OPTIONS = ["quick", "standard", "deep"] as const satisfies readonly ReviewDepth[];

interface CriteriaSelectionPanelProps {
  criteria: string[];
  onToggleCriterion: (id: string) => void;
  onToggleGroup: (groupItemIds: string[], selectAll: boolean) => void;
}

function CriteriaSelectionPanel({
  criteria,
  onToggleCriterion,
  onToggleGroup,
}: CriteriaSelectionPanelProps) {
  return (
    <div className="space-y-6">
      {SUBCATEGORY_GROUPS.map((group) => {
        const groupItems = group.items;
        const allSelected = groupItems.every((item) => criteria.includes(item.id));
        const someSelected = groupItems.some((item) => criteria.includes(item.id));

        return (
          <div key={group.category}>
            <button
              type="button"
              onClick={() => onToggleGroup(groupItems.map((item) => item.id), !allSelected)}
              className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground transition hover:text-foreground"
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

            <div className="grid gap-2 sm:grid-cols-2">
              {groupItems.map((item) => {
                const active = criteria.includes(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => onToggleCriterion(item.id)}
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
        <p className="text-xs text-destructive">Select at least one criteria to continue.</p>
      )}
    </div>
  );
}

export default function NewReviewPage() {
  type UploadAsset = ReviewFileEntry;

  const [step, setStep] = useState(0);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const initialReviewId = searchParams.get("reviewId");
  const [draftReviewId, setDraftReviewId] = useState<string | null>(initialReviewId);
  const [isLoadingDraft, setIsLoadingDraft] = useState(Boolean(initialReviewId));
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [name, setName] = useState("");
  const [product, setProduct] = useState("");
  const [domain, setDomain] = useState("bfsi");
  const [reviewType, setReviewType] = useState("full");
  const [owner, setOwner] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [designSystemUrl, setDesignSystemUrl] = useState("");
  const [websiteLoginIdentifier, setWebsiteLoginIdentifier] = useState("");
  const [websiteLoginPassword, setWebsiteLoginPassword] = useState("");
  const [isWebsiteAuthModalOpen, setIsWebsiteAuthModalOpen] = useState(false);
  const [criteria, setCriteria] = useState<string[]>(REVIEW_TYPE_REQUIRED_CRITERIA.full);
  const [findingMetadataOptions, setFindingMetadataOptions] = useState<FindingOutputOptionKey[]>([
    ...DEFAULT_FINDING_OUTPUT_OPTIONS,
  ]);
  const [files, setFiles] = useState<ReviewFileEntry[]>([]);
  const [contextText, setContextText] = useState("");
  const [depth, setDepth] = useState<ReviewDepth>("standard");
  const [analysisScope, setAnalysisScope] = useState<AnalysisScope>("all");
  const [confidence, setConfidence] = useState([75]);
  const [running, setRunning] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const [currentStageLabel, setCurrentStageLabel] = useState("");
  const stageIdxRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<ReviewFileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isDocProcessing, setIsDocProcessing] = useState(false);
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [activeScreenshotIndex, setActiveScreenshotIndex] = useState(0);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isCustomCriteriaModalOpen, setIsCustomCriteriaModalOpen] = useState(false);
  const [activeDocumentIndex, setActiveDocumentIndex] = useState(0);
  const [uploadedAssetsStart, setUploadedAssetsStart] = useState(0);
  const [nameTouched, setNameTouched] = useState(false);
  const [productTouched, setProductTouched] = useState(false);
  const criteriaTouchedRef = useRef(false);

  const visibleFiles = useMemo(
    () => files.filter((file) => file.visibleInUi !== false),
    [files]
  );

  const screenshotFiles = useMemo(
    () => visibleFiles.filter((file) => file.type === "Screenshot" && Boolean(file.previewUrl)),
    [visibleFiles]
  );

  const documentFiles = useMemo(
    () => visibleFiles.filter((file) => (file.type === "PDF" || file.type === "Word") && Boolean(file.previewUrl)),
    [visibleFiles]
  );

  const visibleUploadedAssets = useMemo(
    () => visibleFiles.slice(uploadedAssetsStart, uploadedAssetsStart + 3),
    [visibleFiles, uploadedAssetsStart]
  );

  const maxUploadedAssetsStart = Math.max(0, visibleFiles.length - 3);

  const handleReviewTypeChange = (nextType: string) => {
    criteriaTouchedRef.current = false;
    setReviewType(nextType);
    setCriteria(REVIEW_TYPE_REQUIRED_CRITERIA[nextType] ?? []);
    if (nextType === "partial") {
      setIsCustomCriteriaModalOpen(true);
    } else {
      setIsCustomCriteriaModalOpen(false);
    }
  };

  const toggleCriterionGroup = useCallback((groupItemIds: string[], selectAll: boolean) => {
    setCriteria((current) => {
      criteriaTouchedRef.current = true;
      if (selectAll) {
        return Array.from(new Set([...current, ...groupItemIds]));
      }
      return current.filter((id) => !groupItemIds.includes(id));
    });
  }, []);

  useEffect(() => {
    if (!criteriaTouchedRef.current) return;

    const nextType = getReviewTypeFromCriteria(criteria);
    if (nextType !== reviewType) {
      setReviewType(nextType);
    }
  }, [criteria, reviewType]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    const syncOwnerFromSignedInUser = () => {
      if (typeof window === "undefined") return;

      const raw = localStorage.getItem("current_user");
      if (!raw) {
        setOwner("User");
        return;
      }

      try {
        const parsed = JSON.parse(raw) as { name?: string };
        setOwner((parsed.name ?? "User").trim() || "User");
      } catch {
        setOwner("User");
      }
    };

    syncOwnerFromSignedInUser();

    const handleStorage = () => syncOwnerFromSignedInUser();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("uxm:user-updated", handleStorage as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("uxm:user-updated", handleStorage as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!initialReviewId) {
      setIsLoadingDraft(false);
      return;
    }

    let cancelled = false;
    setIsLoadingDraft(true);

    getReview(initialReviewId)
      .then((review) => {
        if (cancelled) return;

        const resolvedReviewId = review.id ?? initialReviewId;

        setDraftReviewId(resolvedReviewId);
        setName(review.name ?? "");
        setProduct(review.product ?? "");
        setDomain(review.domain || "bfsi");
        const loadedReviewType = review.reviewType || "full";
        setReviewType(loadedReviewType);
        setOwner(review.owner || "");
        setCriteria(Array.isArray(review.criteria) && review.criteria.length > 0 ? review.criteria : REVIEW_TYPE_REQUIRED_CRITERIA[loadedReviewType] ?? []);
        setDepth((review.depth as ReviewDepth) || "standard");
        setAnalysisScope(review.analysisScope === "key" ? "key" : "all");
        setConfidence([typeof review.confidenceThreshold === "number" ? review.confidenceThreshold : 75]);
        criteriaTouchedRef.current = false;

        const loadedFiles: ReviewFileEntry[] = [];
        const noteBlocks: string[] = [];

        for (const asset of review.assets ?? []) {
          const isContextNote = asset.name === "Context notes" && asset.contentText;
          if (isContextNote) {
            noteBlocks.push(asset.contentText);
            continue;
          }

          loadedFiles.push({
            id: asset.id ?? `${asset.name}-${asset.createdAt ?? Math.random()}`,
            name: asset.name ?? "Saved asset",
            type: getAssetType(asset),
            status: "Saved",
            previewUrl: asset.blobUrl ?? undefined,
            blobUrl: asset.storageRef ?? asset.blobUrl ?? undefined,
            mimeType: asset.mimeType ?? undefined,
            contentText: asset.contentText ?? undefined,
            sizeBytes: asset.sizeBytes ?? undefined,
          });
        }

        const parsedNotes = parseStoredContextNotes(noteBlocks);

        setFiles(loadedFiles);
        setContextText(parsedNotes.contextText);
        setFigmaUrl(parsedNotes.figmaUrl);
        setDesignSystemUrl(parsedNotes.designSystemUrl);
        setWebsiteLoginIdentifier(parsedNotes.websiteLoginIdentifier);
        setWebsiteLoginPassword(parsedNotes.websiteLoginPassword);

        const stepMatch = typeof review.stage === "string" ? review.stage.match(/^step-(\d+)$/) : null;
        if (stepMatch) {
          setStep(Math.max(0, Math.min(steps.length - 1, Number(stepMatch[1]) - 1)));
        }

        if (review.status === "completed") {
          dispatch(addNotification({
            type: "review_completed",
            title: "Review completed",
            message: `${review.name ?? "Your review"} is ready.`,
            href: `/workspace?reviewId=${resolvedReviewId}`,
            reviewId: resolvedReviewId,
            dedupeKey: `review-status:${resolvedReviewId}`,
          }));
          router.replace(`/workspace?reviewId=${resolvedReviewId}`);
          return;
        }

        if (review.status === "in_progress") {
          setRunning(true);
          setStep(4);
          setCurrentStageLabel(formatBackendStage(review.stage) || "AI agent at work…");
          const mappedIdx = typeof review.stage === "string" ? backendStageToUiIndex[review.stage] : undefined;
          const idx = typeof mappedIdx === "number" ? mappedIdx : 0;
          stageIdxRef.current = idx;
          setStageIdx(idx);

          if (pollRef.current) clearInterval(pollRef.current);

          const pollProgress = async () => {
            try {
              const progress = await getReviewProgress(resolvedReviewId);
              const progressIdx = backendStageToUiIndex[progress.stage ?? ""];
              const nextIdx = typeof progressIdx === "number" ? progressIdx : stageIdxRef.current;

              stageIdxRef.current = nextIdx;
              setStageIdx(nextIdx);
              setCurrentStageLabel(formatBackendStage(progress.stage));

              if (progress.status === "completed") {
                if (pollRef.current) clearInterval(pollRef.current);
                stageIdxRef.current = progressStages.length - 1;
                setStageIdx(progressStages.length - 1);
                setCurrentStageLabel("Completed");
                dispatch(addNotification({
                  type: "review_completed",
                  title: "Review completed",
                  message: `${review.name ?? "Your review"} finished with ${progress.findingCount || 0} findings.`,
                  href: `/workspace?reviewId=${resolvedReviewId}`,
                  reviewId: resolvedReviewId,
                  dedupeKey: `review-status:${resolvedReviewId}`,
                }));
                setRunning(false);
                router.replace(`/workspace?reviewId=${resolvedReviewId}`);
              } else if (progress.status === "failed") {
                if (pollRef.current) clearInterval(pollRef.current);
                const failureReason = getFailureReason(progress.stage);
                dispatch(addNotification({
                  type: "review_failed",
                  title: "Review failed",
                  message: failureReason ? `${review.name ?? "Your review"} failed: ${failureReason}` : `${review.name ?? "Your review"} failed during processing.`,
                  href: `/new-review?reviewId=${resolvedReviewId}`,
                  reviewId: resolvedReviewId,
                  dedupeKey: `review-status:${resolvedReviewId}`,
                }));
                setCurrentStageLabel("Failed");
                setRunning(false);
              }
            } catch {
              // Ignore transient polling errors
            }
          };

          void pollProgress();
          pollRef.current = setInterval(pollProgress, 2000);
        }
      })
      .catch((error) => {
        console.error(error);
        toast.error("Failed to load draft review");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDraft(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, initialReviewId, router]);

  useEffect(() => {
    return () => {
      filesRef.current.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });
        if (pollRef.current) {
          clearInterval(pollRef.current);
        }
        if (redirectTimeoutRef.current) {
          clearTimeout(redirectTimeoutRef.current);
        }
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
    if (!isDocumentModalOpen) return;
    if (documentFiles.length === 0) {
      setIsDocumentModalOpen(false);
      return;
    }
    if (activeDocumentIndex > documentFiles.length - 1) {
      setActiveDocumentIndex(documentFiles.length - 1);
    }
  }, [activeDocumentIndex, documentFiles, isDocumentModalOpen]);

  useEffect(() => {
    if (uploadedAssetsStart > maxUploadedAssetsStart) {
      setUploadedAssetsStart(maxUploadedAssetsStart);
    }
  }, [maxUploadedAssetsStart, uploadedAssetsStart]);

  const reviewTypeOptions = [
    { value: "full", label: "Full UX Review" },
    { value: "prd", label: "PRD Alignment Review" },
    { value: "a11y", label: "Accessibility Review" },
    { value: "ds", label: "Design System Review" },
    { value: "content", label: "Content & Microcopy Review" },
    { value: "partial", label: "Custom" },
  ];

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
            // Fall back to treating the DOCX as a raw upload so the user isn't blocked.
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

  const openDocumentModal = (fileId: string) => {
    const index = documentFiles.findIndex((file) => file.id === fileId);
    if (index < 0) return;
    setActiveDocumentIndex(index);
    setIsDocumentModalOpen(true);
  };

  const removeActiveScreenshotFromModal = () => {
    const activeScreenshot = screenshotFiles[activeScreenshotIndex];
    if (!activeScreenshot) return;
    removeFile(activeScreenshot.id);
  };

  const removeActiveDocumentFromModal = () => {
    const activeDocument = documentFiles[activeDocumentIndex];
    if (!activeDocument) return;
    removeFile(activeDocument.id);
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
    setCriteria((cur) => {
      criteriaTouchedRef.current = true;
      return cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c];
    });

  const toggleFindingMetadataOption = (optionKey: FindingOutputOptionKey) =>
    setFindingMetadataOptions((current) =>
      current.includes(optionKey)
        ? current.filter((key) => key !== optionKey)
        : [...current, optionKey]
    );

  const validStep0 = name.trim().length > 0 && product.trim().length > 0;
  const hasScreenshotAsset = files.some(
    (asset) => asset.type === "Screenshot" && ((Boolean(asset.file) && (asset.file?.type.startsWith("image/") ?? false)) || Boolean(asset.blobUrl || asset.previewUrl))
  );
  const figmaUrlTrimmed = figmaUrl.trim();
  const hasValidFigmaUrl = figmaUrlTrimmed.length > 0 && isValidFigmaPrototypeUrl(figmaUrlTrimmed);
  const figmaUrlError = figmaUrlTrimmed.length > 0 && !hasValidFigmaUrl;
  const designSystemUrlTrimmed = designSystemUrl.trim();
  const hasValidDesignSystemUrl = designSystemUrlTrimmed.length > 0 && isValidWebsiteReferenceUrl(designSystemUrlTrimmed);
  const designSystemUrlError = designSystemUrlTrimmed.length > 0 && !hasValidDesignSystemUrl;
  const validStep1 = hasScreenshotAsset || hasValidFigmaUrl || hasValidDesignSystemUrl;
  const validStep2 = criteria.length > 0;
  const nameRequiredError = nameTouched && name.trim().length === 0;
  const productRequiredError = productTouched && product.trim().length === 0;
  const progressPercent = Math.min(100, Math.max(0, Math.round(((stageIdx + 1) / progressStages.length) * 100)));

  const canNavigateToStep = (targetStep: number) => {
    if (running || isLoadingDraft) {
      return targetStep <= step;
    }

    if (targetStep <= step) {
      return true;
    }

    if (targetStep >= 1 && !validStep0) return false;
    if (targetStep >= 2 && !validStep1) return false;
    if (targetStep >= 3 && !validStep2) return false;

    return true;
  };

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
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new File([bytes], fileName, { type: mimeType });
  };

  const persistDraft = async ({ notify = true }: { notify?: boolean } = {}) => {
    setIsSavingDraft(true);

    const assets: Array<{
      name: string;
      mimeType: string;
      base64Data?: string;
      blobUrl?: string;
      contentText?: string;
      sizeBytes?: number;
    }> = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        mimeType: f.file?.type || f.mimeType || "application/octet-stream",
        base64Data: f.file ? await toBase64(f.file) : undefined,
        blobUrl: f.file ? undefined : f.blobUrl,
        contentText: f.contentText,
        sizeBytes: f.file?.size ?? f.sizeBytes,
      })),
    );

    const notes: string[] = [];
    if (contextText.trim()) notes.push(contextText.trim());
    if (figmaUrl.trim()) notes.push(`Figma URL: ${figmaUrl.trim()}`);
    if (designSystemUrl.trim()) notes.push(`Design System URL: ${designSystemUrl.trim()}`);
    if (websiteLoginIdentifier.trim()) notes.push(`Website Login Identifier: ${websiteLoginIdentifier.trim()}`);
    if (websiteLoginPassword.trim()) notes.push(`Website Login Password: ${websiteLoginPassword.trim()}`);

    if (notes.length > 0) {
      assets.push({
        name: "Context notes",
        mimeType: "text/plain",
        contentText: notes.join("\n\n"),
        base64Data: undefined,
        sizeBytes: undefined,
      });
    }

    try {
      const savedReview = await saveReviewDraft({
        reviewId: draftReviewId ?? undefined,
        name,
        product,
        domain,
        reviewType,
        owner,
        criteria,
        findingMetadataOptions,
        analysisScope,
        depth,
        confidenceThreshold: confidence[0],
        stage: `step-${step + 1}`,
        assets,
      });

      if (savedReview?.id) {
        setDraftReviewId(savedReview.id);
        if (notify) {
          dispatch(addNotification({
            type: "draft_saved",
            title: "Draft saved",
            message: `${name || "Your review"} was saved as a draft.`,
            href: `/new-review?reviewId=${savedReview.id}`,
            reviewId: savedReview.id,
            dedupeKey: `draft-saved:${savedReview.id}`,
          }));
        }
      }

      return savedReview?.id as string | undefined;
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await persistDraft();
      toast.success("Draft saved");
    } catch (error) {
      toast.error("Failed to save draft");
      console.error(error);
    }
  };

  const startReviewPipeline = async () => {
    setRunning(true);
    setStageIdx(0);
    setCurrentStageLabel("Saving review…");

    try {
      const reviewId = await persistDraft({ notify: false });

      if (!reviewId) {
        throw new Error("Did not receive a valid review ID from the server");
      }

      dispatch(addNotification({
        type: "review_started",
        title: "Review started",
        message: `${name || "Your review"} is now running.`,
        href: `/new-review?reviewId=${reviewId}`,
        reviewId,
        dedupeKey: `review-status:${reviewId}`,
      }));

      setCurrentStageLabel("Starting review…");
      await startReview(reviewId);

      let completionHandled = false;
      const pollProgress = async () => {
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
            if (completionHandled) return;
            completionHandled = true;
            if (pollRef.current) clearInterval(pollRef.current);
            stageIdxRef.current = progressStages.length - 1;
            setStageIdx(progressStages.length - 1);
            setCurrentStageLabel("Completed");
            dispatch(addNotification({
              type: "review_completed",
              title: "Review completed",
              message: `${name || "Your review"} finished with ${progress.findingCount || 0} findings.`,
              href: `/workspace?reviewId=${reviewId}`,
              reviewId,
              dedupeKey: `review-status:${reviewId}`,
            }));
            toast.success(`Review complete — ${progress.findingCount || 0} findings generated.`);
            setRunning(false);
            redirectTimeoutRef.current = setTimeout(() => {
              router.push(`/workspace?reviewId=${reviewId}`);
            }, 600);
          } else if (progress.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            const failureReason = getFailureReason(progress.stage);
            dispatch(addNotification({
              type: "review_failed",
              title: "Review failed",
              message: failureReason ? `${name || "Your review"} failed: ${failureReason}` : `${name || "Your review"} failed during processing.`,
              href: `/new-review?reviewId=${reviewId}`,
              reviewId,
              dedupeKey: `review-status:${reviewId}`,
            }));
            toast.error(failureReason ? `Review pipeline failed: ${failureReason}` : "Review pipeline failed.");
            setCurrentStageLabel("Failed");
            setRunning(false);
          }
        } catch (err) {
          // Ignore transient polling errors
        }
      };

      pollRef.current = setInterval(pollProgress, 2000);
      void pollProgress();
    } catch (err: any) {
      toast.error(err.message || "Failed to start review");
      setRunning(false);
    }
  };

  const runReview = async () => {
    if (!validStep1) {
      toast.error("Add at least one screenshot image, a valid public Figma prototype URL, or a valid public Design System URL before starting the review.");
      setStep(1);
      return;
    }

    if (hasValidDesignSystemUrl) {
      setIsWebsiteAuthModalOpen(true);
      return;
    }

    await startReviewPipeline();
  };

  if (isLoadingDraft) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] flex-1 items-center justify-center p-6">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-foreground">Loading saved review</h2>
          <p className="mt-1 text-sm text-muted-foreground">Preparing your draft and opening the step where you left off.</p>
        </div>
      </div>
    );
  }

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
                  onClick={() => canNavigateToStep(i) && setStep(i)}
                  disabled={!canNavigateToStep(i)}
                  aria-current={i === step ? "step" : undefined}
                  className={cn(
                    "flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    i === step ? "border-primary bg-primary text-primary-foreground"
                    : i < step ? "border-success/40 bg-success/10 text-success"
                    : canNavigateToStep(i) ? "border-border bg-card text-muted-foreground hover:bg-secondary" : "border-border bg-card text-muted-foreground/50 opacity-60",
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
                    <Input
                      value={name}
                      onChange={(e) => setName(toAlphaNumeric(e.target.value))}
                      onBlur={() => setNameTouched(true)}
                      className={cn(nameRequiredError && "border-red-500 focus-visible:ring-red-500")}
                      aria-required
                    />
                    {nameRequiredError && <p className="mt-1 text-xs text-red-500">Required.</p>}
                  </Field>
                  <Field label="Product / application" required>
                    <Input
                      value={product}
                      onChange={(e) => setProduct(toAlphaNumeric(e.target.value))}
                      onBlur={() => setProductTouched(true)}
                      className={cn(productRequiredError && "border-red-500 focus-visible:ring-red-500")}
                      aria-required
                    />
                    {productRequiredError && <p className="mt-1 text-xs text-red-500">Required.</p>}
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
                    <Select value={reviewType} onValueChange={handleReviewTypeChange}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground">
                        {reviewTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {reviewType === "partial" && (
                    <div className="md:col-span-2 rounded-lg border border-border bg-secondary/30 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">Custom criteria</p>
                          <p className="text-xs text-muted-foreground">
                            {criteria.length === 0
                              ? "Choose the checks the AI should run for this review."
                              : `${criteria.length} criteria selected`}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-9"
                          onClick={() => setIsCustomCriteriaModalOpen(true)}
                        >
                          {criteria.length === 0 ? "Choose criteria" : "Edit criteria"}
                        </Button>
                      </div>
                      {criteria.length === 0 && (
                        <p className="mt-2 text-xs text-destructive">Select at least one criteria to continue.</p>
                      )}
                    </div>
                  )}
                  <Field label="Reviewer / owner" className="md:col-span-2">
                    <div className="text-sm font-medium text-foreground px-0.5 -mt-2">
                      {owner || "User"}
                    </div>
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
                  {visibleFiles.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Uploaded assets ({visibleFiles.length})</p>
                        {visibleFiles.length > 3 && (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => setUploadedAssetsStart((current) => Math.max(0, current - 1))}
                              disabled={uploadedAssetsStart === 0}
                              aria-label="Show previous uploaded assets"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => setUploadedAssetsStart((current) => Math.min(maxUploadedAssetsStart, current + 1))}
                              disabled={uploadedAssetsStart >= maxUploadedAssetsStart}
                              aria-label="Show next uploaded assets"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="grid gap-2 md:grid-cols-3">
                        {visibleUploadedAssets.map((f) => (
                          <div
                            key={f.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              if (f.type === "Screenshot" && f.previewUrl) {
                                openScreenshotModal(f.id);
                              } else if ((f.type === "PDF" || f.type === "Word") && f.previewUrl) {
                                openDocumentModal(f.id);
                              }
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                if (f.type === "Screenshot" && f.previewUrl) {
                                  openScreenshotModal(f.id);
                                } else if ((f.type === "PDF" || f.type === "Word") && f.previewUrl) {
                                  openDocumentModal(f.id);
                                }
                              }
                            }}
                            className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 transition hover:border-primary/40 hover:bg-secondary/20"
                            aria-label={`Open preview for ${f.name}`}
                          >
                            {f.type === "Screenshot" && f.previewUrl ? (
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border">
                                <img src={f.previewUrl} alt={f.name} className="h-full w-full object-cover" />
                              </div>
                            ) : (f.type === "PDF" || f.type === "Word") && f.previewUrl ? (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-secondary/60 text-[10px] font-semibold text-primary">
                                {f.type === "PDF" ? "PDF" : "DOC"}
                              </div>
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-primary"><FileText className="h-4 w-4" aria-hidden="true" /></div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{f.name}</p>
                              <p className="text-[11px] text-muted-foreground">{f.type} · {f.status}</p>
                            </div>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                removeFile(f.id);
                              }}
                              className="rounded p-1 text-muted-foreground hover:text-destructive"
                              aria-label={`Remove ${f.name}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Figma prototype URL" help="Public prototype link. If you do not upload screenshots, the review will capture the prototype automatically with Playwright.">
                      <div className="relative">
                        <Figma className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                          placeholder="https://figma.com/proto/…"
                          className={cn("pl-9", figmaUrlError && "border-red-500 focus-visible:ring-red-500")}
                          value={figmaUrl}
                          onChange={(e) => setFigmaUrl(e.target.value)}
                        />
                      </div>
                      {figmaUrlError ? <p className="mt-1 text-xs text-red-500">Enter a valid public Figma prototype URL.</p> : null}
                      {!figmaUrlError && hasValidFigmaUrl ? <p className="mt-1 text-xs text-muted-foreground">The prototype will be opened in Playwright and converted into screenshots when the review starts.</p> : null}
                    </Field>
                    <Field label="Design system reference">
                      <div className="relative">
                        <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <Input
                          placeholder="https://zeroheight.com/…"
                          className={cn("pl-9", designSystemUrlError && "border-red-500 focus-visible:ring-red-500")}
                          value={designSystemUrl}
                          onChange={(e) => setDesignSystemUrl(e.target.value)}
                        />
                      </div>
                      {designSystemUrlError ? <p className="mt-1 text-xs text-red-500">Enter a valid public website URL.</p> : null}
                      {!designSystemUrlError && hasValidDesignSystemUrl ? <p className="mt-1 text-xs text-muted-foreground">The crawler will navigate related pages, capture screenshots, and feed the same AI review pipeline used for screenshots and PDFs.</p> : null}
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
                </div>
              )}

              {step === 2 && (
                <CriteriaSelectionPanel
                  criteria={criteria}
                  onToggleCriterion={toggleCriterion}
                  onToggleGroup={toggleCriterionGroup}
                />
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
                    <RadioGroup value={depth} onValueChange={(value) => setDepth(value as ReviewDepth)} className="flex flex-wrap items-center gap-2">
                      {REVIEW_DEPTH_OPTIONS.map((v) => (
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
                    <Select value={analysisScope} onValueChange={(value) => setAnalysisScope(value as AnalysisScope)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All selected screens</SelectItem>
                        <SelectItem value="key">Key flows only</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="space-y-2.5 md:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Include in output</p>
                    {FINDING_OUTPUT_OPTIONS.map((option) => (
                      <div key={option.key} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
                        <Label className="text-sm" htmlFor={`finding-output-${option.key}`}>{option.label}</Label>
                        <Switch
                          id={`finding-output-${option.key}`}
                          checked={findingMetadataOptions.includes(option.key)}
                          onCheckedChange={() => toggleFindingMetadataOption(option.key)}
                        />
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
                      <div className="flex items-center gap-3">
                        <Progress value={progressPercent} className="h-1.5 flex-1" />
                        <span className="min-w-11 text-right text-xs font-medium tabular-nums text-muted-foreground">{progressPercent}%</span>
                      </div>
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
                <SumRow label="Type" value={formatReviewTypeLabel(reviewType)} />
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

        <Dialog open={isWebsiteAuthModalOpen} onOpenChange={setIsWebsiteAuthModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Website Login Credentials</DialogTitle>
              <DialogDescription>
                Enter LAN ID or email and password if the Design System URL requires login. Credentials are used only for this analysis run.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Field label="LAN ID or Email">
                <Input
                  value={websiteLoginIdentifier}
                  onChange={(event) => setWebsiteLoginIdentifier(event.target.value)}
                  placeholder="lanid or email@example.com"
                />
              </Field>

              <Field label="Password">
                <Input
                  type="password"
                  value={websiteLoginPassword}
                  onChange={(event) => setWebsiteLoginPassword(event.target.value)}
                  placeholder="Enter password"
                />
              </Field>

              <p className="text-xs text-muted-foreground">
                Leave fields blank to continue with guest/public mode.
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={async () => {
                  setIsWebsiteAuthModalOpen(false);
                  await startReviewPipeline();
                }}
              >
                Continue Without Login
              </Button>
              <Button
                onClick={async () => {
                  if (websiteLoginIdentifier.trim().length === 0 || websiteLoginPassword.trim().length === 0) {
                    toast.error("Enter both identifier and password, or continue without login.");
                    return;
                  }

                  setIsWebsiteAuthModalOpen(false);
                  await startReviewPipeline();
                }}
              >
                Save and Run
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Navigation */}
        {!running && step < steps.length - 1 && (
          <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border/80 bg-card/95 px-4 py-3 shadow-[0_-12px_40px_-24px_rgba(15,23,42,0.35)] backdrop-blur-xl md:left-[var(--sidebar-width)] md:px-6 md:peer-data-[state=collapsed]:left-[var(--sidebar-width-icon)]">
            <div className={cn("mx-auto flex max-w-6xl items-center", step > 0 ? "justify-between" : "justify-end")}>
              {step > 0 && (
                <Button
                  variant="ghost"
                  className="min-h-10 px-2"
                  aria-label="Back"
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />Back
                </Button>
              )}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="outline" className="min-h-10 bg-background" onClick={() => void handleSaveDraft()} disabled={isSavingDraft || isLoadingDraft}>
                  {isSavingDraft ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-1.5 h-4 w-4" aria-hidden="true" />}
                  Save draft
                </Button>
                <Button
                  className="min-h-10"
                  disabled={isLoadingDraft || (step === 0 && !validStep0) || (step === 1 && !validStep1) || (step === 2 && !validStep2)}
                  onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
                >
                  Continue<ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isCustomCriteriaModalOpen} onOpenChange={setIsCustomCriteriaModalOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Select criteria</DialogTitle>
            <DialogDescription>
              Choose the frameworks and checks the AI should apply for this custom review.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <CriteriaSelectionPanel
              criteria={criteria}
              onToggleCriterion={toggleCriterion}
              onToggleGroup={toggleCriterionGroup}
            />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              {criteria.length} criteria selected
            </p>
            <Button
              type="button"
              className="min-h-10"
              disabled={criteria.length === 0}
              onClick={() => setIsCustomCriteriaModalOpen(false)}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isScreenshotModalOpen} onOpenChange={setIsScreenshotModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="border-b border-border px-4 py-3 pr-16">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-sm font-medium">
                {screenshotFiles[activeScreenshotIndex]?.name ?? "Screenshot"}
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
              <div className="flex items-center justify-end gap-2">
                <p className="text-xs text-muted-foreground">
                  {activeScreenshotIndex + 1} / {screenshotFiles.length}
                </p>
              </div>

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

      <Dialog open={isDocumentModalOpen} onOpenChange={setIsDocumentModalOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <DialogHeader className="border-b border-border px-4 py-3 pr-16">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-sm font-medium">
                {documentFiles[activeDocumentIndex]?.name ?? "Document"}
              </DialogTitle>
              {documentFiles.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={removeActiveDocumentFromModal}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />Remove
                </Button>
              )}
            </div>
          </DialogHeader>

          {documentFiles.length > 0 && (
            <div className="grid h-[78vh] min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden p-4">
              <div className="shrink-0 flex items-center justify-end gap-2 pb-3">
                <p className="text-xs text-muted-foreground">
                  {activeDocumentIndex + 1} / {documentFiles.length}
                </p>
              </div>

              <div className="relative min-h-0 overflow-y-auto overscroll-contain rounded-lg border border-border bg-secondary/20">
                <iframe
                  title={documentFiles[activeDocumentIndex]?.name}
                  src={documentFiles[activeDocumentIndex]?.previewUrl}
                  className="h-full min-h-[58vh] w-full rounded"
                />

                {documentFiles.length > 1 && (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      onClick={() => setActiveDocumentIndex((idx) => (idx === 0 ? documentFiles.length - 1 : idx - 1))}
                      aria-label="Previous document"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      onClick={() => setActiveDocumentIndex((idx) => (idx === documentFiles.length - 1 ? 0 : idx + 1))}
                      aria-label="Next document"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              {documentFiles.length > 1 && (
                <div className="shrink-0 flex gap-2 overflow-x-auto pt-3 pb-1">
                  {documentFiles.map((file, idx) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => setActiveDocumentIndex(idx)}
                      className={cn(
                        "flex h-12 w-20 shrink-0 items-center justify-center rounded border text-xs font-semibold",
                        idx === activeDocumentIndex ? "border-primary text-primary" : "border-border text-muted-foreground"
                      )}
                      aria-label={`Open document ${idx + 1}`}
                    >
                      {file.type === "PDF" ? "PDF" : "DOC"} {idx + 1}
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
