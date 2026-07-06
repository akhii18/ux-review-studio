"use client";

import { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Download, Check, RefreshCw, Sparkles, Image as ImageIcon,
  AlertCircle, ChevronLeft, ChevronRight, X, ArrowUpRight, Edit3, Plus,
  BookOpen, AlertTriangle, MessageSquare, MonitorPlay, ChevronDown,
} from "lucide-react";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { FindingStatusBadge } from "@/components/ui/FindingStatusBadge";
import { cn } from "@/lib/utils";
import { exportReviewReport, getReview, updateFinding, triageFinding } from "@/lib/api";
import { downloadReport } from "@/lib/reportExport";
import { useAppDispatch } from "@/store/hooks";
import { addNotification } from "@/store/slices/notificationsSlice";
import {
  DEFAULT_FINDING_OUTPUT_OPTIONS,
  REVIEW_BASIS_LIBRARY,
  type DiscoveredFlow,
  type FindingOutputOptionKey,
  type FindingAiMetadata,
} from "@uxm/shared";
import { toast } from "sonner";
import Link from "next/link";

type TriageStatus = "PROPOSED" | "ACCEPTED" | "EDITED" | "DISMISSED" | "ESCALATED";

interface ReviewBasisItem {
  id?: string;
  type: string;
  name: string;
  explanation: string;
}

interface BoundingBoxRef {
  screenIndex: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface Finding {
  id: string;
  reviewId: string;
  title: string;
  severity: "P0" | "P1" | "P2";
  area: string;
  screen?: string;
  principle?: string;
  requirement?: string;
  observation?: string;
  description?: string;
  why?: string;
  recommendation?: string;
  businessImpact?: string;
  a11yImpact?: string;
  aiMetadata?: FindingAiMetadata | null;
  flowName?: string;
  flowDescription?: string;
  flowPageNumbers?: number[];
  status: TriageStatus;
  confidence: number;
  notes?: string;
  reviewBasis: ReviewBasisItem[];
  bboxRefs?: unknown;
}

interface WorkspaceScreen {
  id: string;
  name: string;
  screenIndex?: number;
  imageUrl?: string;
  flowName?: string;
  flowDescription?: string;
  flowPageNumbers?: number[];
  issues: number;
  p0: number;
}

interface WorkspaceScreenGroup {
  flowName: string;
  description?: string;
  pageNumbers: number[];
  screens: WorkspaceScreen[];
  issues: number;
  p0: number;
}

interface ImageLayout {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

interface PinPlacement {
  finding: Finding;
  ref: BoundingBoxRef;
}

interface PinCluster {
  id: string;
  ref: BoundingBoxRef;
  anchor: { x: number; y: number };
  placements: PinPlacement[];
}

const pinTone: Record<"P0" | "P1" | "P2", string> = {
  P0: "bg-destructive",
  P1: "bg-warning",
  P2: "bg-info",
};

const severityRank: Record<"P0" | "P1" | "P2", number> = {
  P0: 0,
  P1: 1,
  P2: 2,
};

const PIN_CLUSTER_CENTER_DISTANCE = 0.035;
const PIN_CLUSTER_INTERSECTION_RATIO = 0.15;

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function normalizeScreenLabel(value: string): string {
  return stripExtension(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function findingMatchesScreen(findingScreen?: string, screenName?: string): boolean {
  if (!findingScreen || !screenName) return false;
  const fs = normalizeScreenLabel(findingScreen);
  const sn = normalizeScreenLabel(screenName);
  if (!fs || fs === "unknown") return false;
  if (fs === "multiple") return true;
  return fs === sn || fs.includes(sn) || sn.includes(fs);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalizeBBoxRef(ref: unknown): BoundingBoxRef | null {
  if (!isRecord(ref)) return null;

  const bboxValue = isRecord(ref.bbox)
    ? ref.bbox
    : isRecord(ref.box)
    ? ref.box
    : isRecord(ref.rect)
    ? ref.rect
    : null;

  if (!bboxValue) return null;

  const rawScreenIndex =
    ref.screenIndex ??
    ref.screen ??
    ref.imageIndex ??
    ref.pageIndex;

  const screenIndex = typeof rawScreenIndex === "string"
    ? Number(rawScreenIndex.replace(/[^0-9.-]/g, ""))
    : Number(rawScreenIndex);

  let x = Number(bboxValue.x);
  let y = Number(bboxValue.y);
  let width = Number(bboxValue.width);
  let height = Number(bboxValue.height);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
    const x0 = Number(bboxValue.x0);
    const y0 = Number(bboxValue.y0);
    const x1 = Number(bboxValue.x1);
    const y1 = Number(bboxValue.y1);

    if (Number.isFinite(x0) && Number.isFinite(y0) && Number.isFinite(x1) && Number.isFinite(y1)) {
      x = x0;
      y = y0;
      width = x1 - x0;
      height = y1 - y0;
    }
  }

  if (
    !Number.isFinite(screenIndex) ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return null;
  }

  const safeX = clamp01(x);
  const safeY = clamp01(y);
  const safeWidth = Math.min(1 - safeX, Math.max(0, width));
  const safeHeight = Math.min(1 - safeY, Math.max(0, height));

  if (safeWidth <= 0 || safeHeight <= 0 || safeX >= 1 || safeY >= 1) return null;

  return {
    screenIndex: Math.max(0, Math.floor(screenIndex)),
    bbox: {
      x: safeX,
      y: safeY,
      width: safeWidth,
      height: safeHeight,
    },
  };
}

function normalizeBBoxRefsInput(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizeBBoxRefsInput(parsed);
    } catch {
      return [];
    }
  }

  if (isRecord(value)) {
    if (Array.isArray(value.bboxRefs)) return value.bboxRefs;
    if (Array.isArray(value.refs)) return value.refs;
    if (Array.isArray(value.items)) return value.items;
  }

  return [];
}

function getValidBBoxRefs(finding: Finding): BoundingBoxRef[] {
  return normalizeBBoxRefsInput(finding.bboxRefs)
    .map(normalizeBBoxRef)
    .filter((ref): ref is BoundingBoxRef => Boolean(ref));
}

function getBboxRefForScreen(finding: Finding, screenIndex?: number): BoundingBoxRef | null {
  if (typeof screenIndex !== "number") return null;

  const refs = getValidBBoxRefs(finding);
  const exact = refs.find((ref) => ref.screenIndex === screenIndex);
  if (exact) return exact;

  if (refs.length === 0) return null;

  const minIndex = Math.min(...refs.map((ref) => ref.screenIndex));
  const maxIndex = Math.max(...refs.map((ref) => ref.screenIndex));

  if (minIndex === 1) {
    const oneBased = refs.find((ref) => ref.screenIndex === screenIndex + 1);
    if (oneBased) return oneBased;
  }

  if (screenIndex === 0 && minIndex > 0 && maxIndex > 0) {
    return refs.find((ref) => ref.screenIndex === minIndex) ?? null;
  }

  return null;
}

function getBboxCenter(ref: BoundingBoxRef): { x: number; y: number } {
  return {
    x: ref.bbox.x + ref.bbox.width / 2,
    y: ref.bbox.y + ref.bbox.height / 2,
  };
}

function getCenterDistance(a: BoundingBoxRef, b: BoundingBoxRef): number {
  const ca = getBboxCenter(a);
  const cb = getBboxCenter(b);
  return Math.hypot(ca.x - cb.x, ca.y - cb.y);
}

function getBboxIntersectionRatio(a: BoundingBoxRef, b: BoundingBoxRef): number {
  const left = Math.max(a.bbox.x, b.bbox.x);
  const top = Math.max(a.bbox.y, b.bbox.y);
  const right = Math.min(a.bbox.x + a.bbox.width, b.bbox.x + b.bbox.width);
  const bottom = Math.min(a.bbox.y + a.bbox.height, b.bbox.y + b.bbox.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);

  if (intersection <= 0) return 0;

  const smallerArea = Math.min(a.bbox.width * a.bbox.height, b.bbox.width * b.bbox.height);
  return intersection / Math.max(smallerArea, Number.EPSILON);
}

function isBboxCenterInsideBbox(centerRef: BoundingBoxRef, containerRef: BoundingBoxRef): boolean {
  const center = getBboxCenter(centerRef);
  return (
    center.x >= containerRef.bbox.x &&
    center.x <= containerRef.bbox.x + containerRef.bbox.width &&
    center.y >= containerRef.bbox.y &&
    center.y <= containerRef.bbox.y + containerRef.bbox.height
  );
}

function shouldClusterPlacements(a: PinPlacement, b: PinPlacement): boolean {
  if (a.ref.screenIndex !== b.ref.screenIndex) return false;

  return (
    getCenterDistance(a.ref, b.ref) <= PIN_CLUSTER_CENTER_DISTANCE ||
    getBboxIntersectionRatio(a.ref, b.ref) >= PIN_CLUSTER_INTERSECTION_RATIO ||
    isBboxCenterInsideBbox(a.ref, b.ref) ||
    isBboxCenterInsideBbox(b.ref, a.ref)
  );
}

function getClusterAnchor(placements: PinPlacement[]): { x: number; y: number } {
  const centers = placements.map((placement) => getBboxCenter(placement.ref));
  return {
    x: centers.reduce((sum, center) => sum + center.x, 0) / Math.max(1, centers.length),
    y: centers.reduce((sum, center) => sum + center.y, 0) / Math.max(1, centers.length),
  };
}

function buildPinClusters(placements: PinPlacement[]): PinCluster[] {
  const clusters: PinCluster[] = [];

  for (const placement of placements) {
    const cluster = clusters.find((candidate) =>
      candidate.placements.some((clusterPlacement) => shouldClusterPlacements(placement, clusterPlacement))
    );

    if (cluster) {
      cluster.placements.push(placement);
      cluster.anchor = getClusterAnchor(cluster.placements);
    } else {
      clusters.push({
        id: "",
        ref: placement.ref,
        anchor: getBboxCenter(placement.ref),
        placements: [placement],
      });
    }
  }

  return clusters.map((cluster) => ({
    ...cluster,
    id: [
      cluster.ref.screenIndex,
      ...cluster.placements.map((placement) => placement.finding.id).sort(),
    ].join(":"),
  }));
}

function getClusterSeverity(cluster: PinCluster): "P0" | "P1" | "P2" {
  return cluster.placements.reduce<"P0" | "P1" | "P2">((highest, placement) => {
    return severityRank[placement.finding.severity] < severityRank[highest]
      ? placement.finding.severity
      : highest;
  }, "P2");
}

function findingMatchesScreenContext(finding: Finding, screenName?: string, screenIndex?: number): boolean {
  const hasCoordinateRefs = getValidBBoxRefs(finding).length > 0;
  if (hasCoordinateRefs && typeof screenIndex === "number") {
    return Boolean(getBboxRefForScreen(finding, screenIndex)) || findingMatchesScreen(finding.screen, screenName);
  }
  return findingMatchesScreen(finding.screen, screenName);
}

function getContainedImageLayout(params: {
  containerWidth: number;
  containerHeight: number;
  naturalWidth: number;
  naturalHeight: number;
}): ImageLayout | null {
  const { containerWidth, containerHeight, naturalWidth, naturalHeight } = params;
  if (containerWidth <= 0 || containerHeight <= 0 || naturalWidth <= 0 || naturalHeight <= 0) return null;

  const containerRatio = containerWidth / containerHeight;
  const imageRatio = naturalWidth / naturalHeight;

  if (imageRatio > containerRatio) {
    const width = containerWidth;
    const height = containerWidth / imageRatio;
    return { offsetX: 0, offsetY: (containerHeight - height) / 2, width, height };
  }

  const height = containerHeight;
  const width = containerHeight * imageRatio;
  return { offsetX: (containerWidth - width) / 2, offsetY: 0, width, height };
}

function WorkspaceContent() {
  const params = useSearchParams();
  const reviewId = params.get("reviewId");
  const dispatch = useAppDispatch();

  const [reviewData, setReviewData] = useState<any>(null);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [selectedScreen, setSelectedScreen] = useState<string | null>(null);
  const [open, setOpen] = useState<Finding | null>(null);
  const [openCluster, setOpenCluster] = useState<PinCluster | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const unplacedDiagToastShownRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLayout, setImageLayout] = useState<ImageLayout | null>(null);

  const fetchReview = useCallback(() => {
    if (!reviewId) return;
    setReviewLoading(true);
    getReview(reviewId)
      .then((data) => {
        setReviewData(data);
      })
      .catch((err) => {
        toast.error("Failed to load review data");
        console.error(err);
      })
      .finally(() => setReviewLoading(false));
  }, [reviewId]);

  useEffect(() => {
    if (reviewId) {
      fetchReview();
    }
  }, [reviewId, fetchReview]);

  const allFindings: Finding[] = useMemo(() => {
    if (reviewData?.findings) {
      return reviewData.findings.map((f: any) => ({
        ...f,
        // Map backend uppercase severities to frontend P0/P1/P2
        severity: f.severity || "P2",
        status: f.status || "PROPOSED",
        reviewBasis: f.reviewBasis || [],
        aiMetadata: f.aiMetadata || null,
        flowName: f.flowName || f.aiMetadata?.flowName,
        flowDescription: f.flowDescription || f.aiMetadata?.flowDescription,
        flowPageNumbers: f.flowPageNumbers || f.aiMetadata?.flowPageNumbers,
      }));
    }
    return [];
  }, [reviewData]);

  const findingMetadataOptions = useMemo<FindingOutputOptionKey[]>(() => {
    const options = reviewData?.findingMetadataOptions;
    return Array.isArray(options) ? options : [...DEFAULT_FINDING_OUTPUT_OPTIONS];
  }, [reviewData]);

  const discoveredFlows = useMemo<DiscoveredFlow[]>(() => {
    const flows = reviewData?.flowDiscovery?.flows;
    if (!Array.isArray(flows)) return [];

    return flows
      .map((flow: any) => ({
        flowName: typeof flow.flowName === "string" ? flow.flowName : "",
        description: typeof flow.description === "string" ? flow.description : "",
        pageNumbers: Array.isArray(flow.pageNumbers)
          ? flow.pageNumbers.filter((pageNumber: unknown): pageNumber is number => typeof pageNumber === "number" && Number.isInteger(pageNumber) && pageNumber > 0)
          : [],
      }))
      .filter((flow) => flow.flowName && flow.pageNumbers.length > 0);
  }, [reviewData]);

  const flowByPageNumber = useMemo(() => {
    const map = new Map<number, DiscoveredFlow>();
    for (const flow of discoveredFlows) {
      for (const pageNumber of flow.pageNumbers) {
        if (!map.has(pageNumber)) map.set(pageNumber, flow);
      }
    }
    return map;
  }, [discoveredFlows]);

  const screens: WorkspaceScreen[] = useMemo(() => {
    if (!reviewData) return [];
    const assetsList = reviewData.assets ?? [];
    const imageAssets = assetsList.filter((a: any) => a.mimeType?.startsWith("image/"));

    if (imageAssets.length > 0) {
      return imageAssets.map((asset: any, assetIndex: number) => {
        const screenName = stripExtension(asset.name);
        const screenFindings = allFindings.filter((f) => findingMatchesScreenContext(f, screenName, assetIndex));
        const flow = flowByPageNumber.get(assetIndex + 1);
        return {
          id: asset.id,
          name: screenName,
          screenIndex: assetIndex,
          imageUrl: asset.blobUrl
            ? asset.blobUrl
            : asset.base64Data
            ? `data:${asset.mimeType};base64,${asset.base64Data}`
            : undefined,
          flowName: flow?.flowName,
          flowDescription: flow?.description,
          flowPageNumbers: flow?.pageNumbers,
          issues: screenFindings.length,
          p0: screenFindings.filter((f) => f.severity === "P0").length,
        };
      });
    }

    const screenNames = [
      ...new Set(
        allFindings
          .map((f) => f.screen)
          .filter((s): s is string => !!s && s !== "Unknown" && s !== "Multiple"),
      ),
    ];

    if (screenNames.length === 0) {
      return [{
        id: "overview",
        name: "Review overview",
        flowName: reviewData.analysisScope === "key" ? "Key flows" : undefined,
        issues: allFindings.length,
        p0: allFindings.filter((f) => f.severity === "P0").length,
      }];
    }

    return screenNames.map((name, i) => {
      const screenFindings = allFindings.filter((f) => findingMatchesScreen(f.screen, name));
      return {
        id: `screen-${i}`,
        name,
        flowName: allFindings.find((f) => findingMatchesScreen(f.screen, name))?.flowName,
        issues: screenFindings.length,
        p0: screenFindings.filter((f) => f.severity === "P0").length,
      };
    });
  }, [reviewData, allFindings, flowByPageNumber]);

  const screenGroups = useMemo<WorkspaceScreenGroup[]>(() => {
    const groups = new Map<string, WorkspaceScreenGroup>();

    for (const screen of screens) {
      const flowName = screen.flowName || "Screens";
      const existing = groups.get(flowName);

      if (existing) {
        existing.screens.push(screen);
        existing.issues += screen.issues;
        existing.p0 += screen.p0;
      } else {
        groups.set(flowName, {
          flowName,
          description: screen.flowDescription,
          pageNumbers: screen.flowPageNumbers ?? [],
          screens: [screen],
          issues: screen.issues,
          p0: screen.p0,
        });
      }
    }

    return Array.from(groups.values());
  }, [screens]);

  useEffect(() => {
    if (screens.length === 0) {
      setSelectedScreen(null);
      return;
    }
    if (!selectedScreen || !screens.some((s) => s.id === selectedScreen)) {
      setSelectedScreen(screens[0].id);
    }
  }, [screens, selectedScreen]);

  const screen = screens.find((s) => s.id === selectedScreen) ?? screens[0] ?? null;
  const idx = screen ? screens.findIndex((s) => s.id === screen.id) : -1;

  const screenFindings = useMemo(() => {
    if (!screen) return allFindings;
    return allFindings.filter((f) => findingMatchesScreenContext(f, screen.name, screen.screenIndex));
  }, [allFindings, screen]);

  const pinPlacements = useMemo<PinPlacement[]>(() => {
    if (imageLoadFailed) return [];
    if (typeof screen?.screenIndex !== "number") return [];

    return screenFindings
      .filter((finding) => finding.status !== "DISMISSED")
      .map((finding) => ({ finding, ref: getBboxRefForScreen(finding, screen.screenIndex) }))
      .filter((placement): placement is PinPlacement => Boolean(placement.ref));
  }, [screenFindings, screen, imageLoadFailed]);

  const pinClusters = useMemo<PinCluster[]>(() => {
    return buildPinClusters(pinPlacements);
  }, [pinPlacements]);

  const unplacedFindings = useMemo(() => {
    if (imageLoadFailed) {
      return screenFindings.filter((finding) => finding.status !== "DISMISSED");
    }

    if (typeof screen?.screenIndex !== "number") {
      return screenFindings.filter((finding) => finding.status !== "DISMISSED");
    }

    return screenFindings
      .filter((finding) => finding.status !== "DISMISSED")
      .filter((finding) => !getBboxRefForScreen(finding, screen.screenIndex));
  }, [screenFindings, screen, imageLoadFailed]);

  const unplacedFindingGroups = useMemo(() => {
    const groups = new Map<string, Finding[]>();

    for (const finding of unplacedFindings) {
      const flowName = finding.flowName || screen?.flowName || "Findings";
      const group = groups.get(flowName) ?? [];
      group.push(finding);
      groups.set(flowName, group);
    }

    return Array.from(groups.entries()).map(([flowName, findings]) => ({ flowName, findings }));
  }, [unplacedFindings, screen?.flowName]);

  const visibleScreenFindingCount = useMemo(
    () => screenFindings.filter((finding) => finding.status !== "DISMISSED").length,
    [screenFindings],
  );

  const unplacedPinCount = unplacedFindings.length;

  useEffect(() => {
    if (!screen || typeof screen.screenIndex !== "number") return;
    if (imageLoadFailed) return;
    if (visibleScreenFindingCount === 0) return;
    if (unplacedPinCount !== visibleScreenFindingCount) return;

    const diagKey = `${screen.id}:${visibleScreenFindingCount}:${unplacedPinCount}`;
    if (unplacedDiagToastShownRef.current === diagKey) return;
    unplacedDiagToastShownRef.current = diagKey;

    const refsSummary = screenFindings.map((finding) => {
      const normalizedRefs = getValidBBoxRefs(finding);
      const rawRefs = normalizeBBoxRefsInput(finding.bboxRefs);
      return {
        id: finding.id,
        title: finding.title,
        screen: finding.screen,
        rawRefCount: rawRefs.length,
        normalizedRefCount: normalizedRefs.length,
        normalizedIndexes: normalizedRefs.map((ref) => ref.screenIndex),
      };
    });

    toast.warning(
      `All findings are unplaced on \"${screen.name}\". Diagnostics: ${JSON.stringify(refsSummary.slice(0, 5))}`,
      { duration: 12000 }
    );
  }, [screen, imageLoadFailed, visibleScreenFindingCount, unplacedPinCount, screenFindings]);

  useEffect(() => {
    if (!screen || typeof screen.screenIndex !== "number") return;
    if (imageLoadFailed) return;
    if (unplacedPinCount === 0) return;

    const hasAnyPlaced = pinPlacements.length > 0;
    if (!hasAnyPlaced) return;

    const diagKey = `partial:${screen.id}:${pinPlacements.length}:${unplacedPinCount}`;
    if (unplacedDiagToastShownRef.current === diagKey) return;
    unplacedDiagToastShownRef.current = diagKey;

    toast.info(
      `Partial pin placement on \"${screen.name}\": placed=${pinPlacements.length}, unplaced=${unplacedPinCount}. This is temporary debug info for prod diagnostics.`,
      { duration: 9000 }
    );
  }, [screen, imageLoadFailed, pinPlacements.length, unplacedPinCount]);

  const updateImageLayout = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || image.naturalWidth === 0 || image.naturalHeight === 0) {
      setImageLayout(null);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    setImageLayout(getContainedImageLayout({
      containerWidth: rect.width,
      containerHeight: rect.height,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    }));
  }, []);

  useEffect(() => {
    setImageLayout(null);
    setImageLoadFailed(false);
  }, [screen?.imageUrl]);

  useEffect(() => {
    if (!screen?.imageUrl) return;
    updateImageLayout();

    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateImageLayout);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [screen?.imageUrl, updateImageLayout]);

  const triage = useMemo(() => {
    return {
      accepted: allFindings.filter((f) => f.status === "ACCEPTED").length,
      edited: allFindings.filter((f) => f.status === "EDITED").length,
      dismissed: allFindings.filter((f) => f.status === "DISMISSED").length,
      escalated: allFindings.filter((f) => f.status === "ESCALATED").length,
      proposed: allFindings.filter((f) => f.status === "PROPOSED").length,
    };
  }, [allFindings]);

  const triagedCount = triage.accepted + triage.edited + triage.dismissed + triage.escalated;
  const allAcceptedHaveBasis = useMemo(() => {
    return allFindings
      .filter((f) => f.status === "ACCEPTED" || f.status === "EDITED")
      .every((f) => f.reviewBasis && f.reviewBasis.length > 0);
  }, [allFindings]);

  const exportable = triage.proposed === 0 && allAcceptedHaveBasis && (triage.accepted + triage.edited > 0);

  const handleDownload = useCallback((report: any, format: "pdf" | "word" | "html") => {
    downloadReport(report, format);
  }, []);

  const handleExport = useCallback(async (format: "pdf" | "word" | "html") => {
    if (!reviewId) return;
    try {
      const report = await exportReviewReport(reviewId);
      dispatch(addNotification({
        type: "report_exported",
        title: "Report exported",
        message: `${reviewData?.name ?? "Your review"} report was exported successfully.`,
        href: `/workspace?reviewId=${reviewId}`,
        reviewId,
        dedupeKey: `report-exported:${reviewId}`,
      }));
      handleDownload(report, format);
      toast.success("Report exported");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to export report");
    }
  }, [dispatch, handleDownload, reviewData?.name, reviewId]);

  const handleFindingAction = useCallback(
    (findingId: string, actionStatus: TriageStatus) => {
      updateFinding(findingId, { status: actionStatus })
        .then(() => {
          toast.success(`Finding status set to ${actionStatus.toLowerCase()}`);
          fetchReview();
          // Update details sheet finding if open
          setOpen((prev) => prev && prev.id === findingId ? { ...prev, status: actionStatus } : prev);
        })
        .catch((err) => {
          toast.error("Failed to update finding");
          console.error(err);
        });
    },
    [fetchReview]
  );

  const handleBasisChange = useCallback(
    (findingId: string, basis: ReviewBasisItem[]) => {
      updateFinding(findingId, { reviewBasis: basis })
        .then(() => {
          toast.success("Review basis updated");
          fetchReview();
          // Update details sheet finding if open
          setOpen((prev) => prev && prev.id === findingId ? { ...prev, reviewBasis: basis } : prev);
        })
        .catch((err) => {
          toast.error("Failed to save basis");
          console.error(err);
        });
    },
    [fetchReview]
  );

  if (!reviewId) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <CardFallback />
      </div>
    );
  }

  if (reviewLoading && !reviewData) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading workspace…
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Review not found.
      </div>
    );
  }

  const reviewTitle = reviewData.name ?? "Review Workspace";
  const reviewSubtitle = `${reviewData.product} · ${screens.length} screen${screens.length === 1 ? "" : "s"} · ${allFindings.length} findings · UX score ${reviewData.uxScore ?? "—"}`;

  return (
    <>
      <AppHeader title={reviewTitle} subtitle={reviewSubtitle} />

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border bg-card px-4 py-2.5 md:px-6">
        <Metric label="UX Score" value={String(reviewData.uxScore ?? "—")} accent />
        <Metric label="Findings" value={String(allFindings.length)} />
        <Metric label="P0" value={String(allFindings.filter((f) => f.severity === "P0").length)} tone="text-destructive" />
        <Metric label="Triaged" value={`${triagedCount} / ${allFindings.length}`} />
        <div className="hidden items-center gap-2 md:flex" aria-label="Triage states">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">States</span>
          <Badge variant="outline" className="gap-1 text-[10px]"><Check className="h-3 w-3 text-green-600" />Accepted {triage.accepted}</Badge>
          <Badge variant="outline" className="gap-1 text-[10px]"><Edit3 className="h-3 w-3 text-blue-600" />Edited {triage.edited}</Badge>
          <Badge variant="outline" className="gap-1 text-[10px]"><X className="h-3 w-3" />Dismissed {triage.dismissed}</Badge>
          <Badge variant="outline" className="gap-1 text-[10px]"><ArrowUpRight className="h-3 w-3 text-destructive" />Escalated {triage.escalated}</Badge>
        </div>
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="flex-1 sm:flex-none">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="min-h-9 w-full sm:w-auto" disabled={!exportable}>
                        <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Export
                        <ChevronDown className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => { void handleExport("pdf"); }}>
                        Export as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { void handleExport("word"); }}>
                        Export as Word
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => { void handleExport("html"); }}>
                        Export as HTML
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </span>
              </TooltipTrigger>
              {!exportable && (
                <TooltipContent side="bottom" className="max-w-xs">
                  {!allAcceptedHaveBasis
                    ? "Ensure all accepted/edited findings have at least one Review Basis item."
                    : triage.proposed > 0
                    ? `Triage the remaining ${triage.proposed} findings to enable export.`
                    : "Accept at least one finding to enable export."}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <Button size="sm" className="min-h-9 flex-1 bg-accent text-accent-foreground hover:bg-accent/90 sm:flex-none">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Run again
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Screen thumbnails */}
        <aside className="hidden w-48 shrink-0 overflow-y-auto border-r border-border bg-card/60 p-2 lg:block" aria-label="Screen list">
          <p className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {reviewData.analysisScope === "key" ? "Key flows" : "Screens"}
          </p>
          {screens.length === 0 ? (
            <p className="px-2 py-4 text-[11px] text-muted-foreground">No screens uploaded.</p>
          ) : (
            <div className="space-y-3">
              {screenGroups.map((group) => (
                <div key={group.flowName} className="space-y-1.5">
                  <div className="px-2 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[11px] font-semibold text-foreground">{group.flowName}</p>
                      <Badge variant="outline" className="shrink-0 text-[10px]">{group.issues}</Badge>
                    </div>
                    {group.description && reviewData.analysisScope === "key" && (
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">{group.description}</p>
                    )}
                  </div>
                  {group.screens.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedScreen(s.id)}
                      className={cn(
                        "group flex w-full flex-col gap-1.5 rounded-lg border p-2 text-left transition",
                        selectedScreen === s.id ? "border-accent bg-accent/5 shadow-sm" : "border-transparent hover:border-border hover:bg-secondary/50",
                      )}
                      aria-current={selectedScreen === s.id}
                    >
                      <div className={cn("flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border border-border bg-secondary/60", selectedScreen === s.id && "border-accent/30")}>
                        {s.imageUrl ? (
                          <img src={s.imageUrl} alt="" className="h-full w-full object-cover object-top" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground/40" aria-hidden="true" />
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-[11px] font-medium">{s.name}</span>
                        {s.p0 > 0 && <PriorityBadge priority="P0" compact />}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{s.issues} finding{s.issues === 1 ? "" : "s"}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Canvas */}
        <section aria-label="Screen canvas" className="flex flex-1 flex-col overflow-hidden bg-secondary/30">
          {screen ? (
            <>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-card px-3 py-2 md:px-4">
                <Button variant="ghost" size="icon" className="h-9 w-9" disabled={idx <= 0} onClick={() => setSelectedScreen(screens[idx - 1].id)} aria-label="Previous screen">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {screen.flowName && <Badge variant="outline" className="max-w-[12rem] truncate text-[10px]">{screen.flowName}</Badge>}
                <div className="truncate text-sm font-medium">{screen.name}</div>
                <Badge variant="secondary" className="text-[10px]">{idx + 1} / {screens.length}</Badge>
                <Button variant="ghost" size="icon" className="h-9 w-9" disabled={idx >= screens.length - 1} onClick={() => setSelectedScreen(screens[idx + 1].id)} aria-label="Next screen">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="mx-1 hidden h-5 md:block" />
                <span className="hidden text-xs text-muted-foreground md:inline">
                  {pinClusters.length} pins{pinPlacements.length !== pinClusters.length ? ` · ${pinPlacements.length} placed findings` : ""}{unplacedPinCount > 0 ? ` · ${unplacedPinCount} unplaced` : ""} · click a pin to view explainable insights
                </span>
                <span className="text-xs text-muted-foreground md:hidden">
                  {pinClusters.length} pins{unplacedPinCount > 0 ? ` · ${unplacedPinCount} unplaced` : ""}
                </span>
              </div>

              <div className="flex flex-1 items-center justify-center overflow-auto p-6">
                <div className="relative w-full max-w-3xl">
                  <div ref={canvasRef} className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    {screen.imageUrl && !imageLoadFailed ? (
                      <img
                        ref={imageRef}
                        src={screen.imageUrl}
                        alt={screen.name}
                        className="absolute inset-0 h-full w-full object-contain bg-secondary/20"
                        onLoad={updateImageLayout}
                        onError={() => {
                          setImageLayout(null);
                          setImageLoadFailed(true);
                        }}
                      />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
                        <p className="mt-2 text-xs text-muted-foreground">{imageLoadFailed ? "Screen image unavailable" : screen.name}</p>
                        <p className="text-[11px] text-muted-foreground/70">
                          Screen preview
                        </p>
                      </div>
                    )}

                    <TooltipProvider>
                      {pinClusters.map((cluster, i) => {
                        const severity = getClusterSeverity(cluster);
                        const style = imageLayout
                          ? {
                              left: imageLayout.offsetX + cluster.anchor.x * imageLayout.width,
                              top: imageLayout.offsetY + cluster.anchor.y * imageLayout.height,
                            }
                          : { display: "none" };
                        const isCluster = cluster.placements.length > 1;
                        const primaryFinding = cluster.placements[0]?.finding;

                        return (
                          <Tooltip key={cluster.id}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => {
                                  if (isCluster) {
                                    setOpen(null);
                                    setOpenCluster(cluster);
                                  } else if (primaryFinding) {
                                    setOpenCluster(null);
                                    setOpen(primaryFinding);
                                  }
                                }}
                                className={cn(
                                  "absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md ring-2 ring-card transition hover:scale-110",
                                  isCluster ? "bg-[rgb(140, 4, 122)]" : pinTone[severity],
                                  isCluster && "h-8 w-8 ring-4 ring-card before:absolute before:inset-[-5px] before:-z-10 before:rounded-full before:border-2 before:border-current before:bg-card before:opacity-80 after:absolute after:inset-[-9px] after:-z-20 after:rounded-full after:border after:border-current after:opacity-35",
                                )}
                                style={style}
                                aria-label={isCluster
                                  ? `${cluster.placements.length} findings at this location, highest severity ${severity}`
                                  : primaryFinding
                                  ? `Finding ${i + 1} (${primaryFinding.severity}): ${primaryFinding.title}`
                                  : "Finding pin"}
                              >
                                {isCluster ? (
                                  <>
                                    <span aria-hidden="true">{i + 1}</span>
                                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-background px-1 text-[10px] font-extrabold leading-none text-foreground shadow-sm">
                                      {cluster.placements.length}+
                                    </span>
                                  </>
                                ) : i + 1}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              {isCluster ? (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium">{cluster.placements.length} findings here</p>
                                  {cluster.placements.slice(0, 3).map(({ finding }) => (
                                    <p key={finding.id} className="truncate text-[10px] text-muted-foreground">
                                      {finding.severity} · {finding.title}
                                    </p>
                                  ))}
                                  {cluster.placements.length > 3 && (
                                    <p className="text-[10px] text-muted-foreground">+{cluster.placements.length - 3} more</p>
                                  )}
                                </div>
                              ) : primaryFinding ? (
                                <>
                                  <p className="text-xs font-medium">{primaryFinding.title}</p>
                                  <p className="text-[10px] text-muted-foreground">{primaryFinding.severity} · {primaryFinding.area}</p>
                                </>
                              ) : null}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </TooltipProvider>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground">
                    {(["P0", "P1", "P2"] as const).map((p) => (
                      <div key={p} className="flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 rounded-full", pinTone[p])} aria-hidden="true" />
                        <PriorityBadge priority={p} compact />
                      </div>
                    ))}
                  </div>

                  {unplacedFindings.length > 0 && (
                    <div className="mt-4 rounded-lg border border-border bg-card p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium">Unplaced findings</p>
                          <p className="text-[11px] text-muted-foreground">These findings do not have a valid coordinate on this screen.</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px]">{unplacedFindings.length}</Badge>
                      </div>
                      <ScrollArea className="mt-2 max-h-36">
                        <div className="space-y-2 pr-2">
                          {unplacedFindingGroups.map((group) => (
                            <div key={group.flowName} className="space-y-1">
                              {unplacedFindingGroups.length > 1 && (
                                <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{group.flowName}</p>
                              )}
                              {group.findings.map((finding) => (
                                <button
                                  key={finding.id}
                                  onClick={() => {
                                    setOpenCluster(null);
                                    setOpen(finding);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-secondary/70"
                                >
                                  <span className={cn("h-2 w-2 shrink-0 rounded-full", pinTone[finding.severity])} aria-hidden="true" />
                                  <span className="min-w-0 flex-1 truncate">{finding.title}</span>
                                  <PriorityBadge priority={finding.severity} compact />
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
              {allFindings.length > 0
                ? "Findings are available but no screens were uploaded."
                : "No findings yet."}
            </div>
          )}
        </section>
      </div>

      <Sheet open={!!open || !!openCluster} onOpenChange={(o) => {
        if (!o) {
          setOpen(null);
          setOpenCluster(null);
        }
      }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {open ? (
            <FindingDetail
              finding={open}
              screenImageUrl={screen?.imageUrl}
              findingMetadataOptions={findingMetadataOptions}
              onAction={(status) => handleFindingAction(open.id, status)}
              onBasisChange={(basis) => handleBasisChange(open.id, basis)}
            />
          ) : openCluster ? (
            <FindingClusterDetail
              cluster={openCluster}
              onSelect={(finding) => {
                setOpenCluster(null);
                setOpen(finding);
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

// ──────────────────────────────────────────────
// Finding detail panel
// ──────────────────────────────────────────────

interface FindingDetailProps {
  finding: Finding;
  screenImageUrl?: string;
  findingMetadataOptions: FindingOutputOptionKey[];
  onAction: (status: TriageStatus) => void;
  onBasisChange: (basis: ReviewBasisItem[]) => void;
}

interface FindingClusterDetailProps {
  cluster: PinCluster;
  onSelect: (finding: Finding) => void;
}

function FindingClusterDetail({ cluster, onSelect }: FindingClusterDetailProps) {
  const severity = getClusterSeverity(cluster);

  return (
    <>
      <SheetHeader>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={severity} />
          <Badge variant="outline">{cluster.placements.length} findings</Badge>
          {cluster.placements[0]?.finding.flowName && (
            <Badge variant="secondary" className="text-[10px]">{cluster.placements[0].finding.flowName}</Badge>
          )}
        </div>
        <SheetTitle className="mt-2 text-left">Findings at this location</SheetTitle>
        <SheetDescription className="text-left">Select a finding to review its details.</SheetDescription>
      </SheetHeader>

      <div className="mt-5 space-y-2">
        {cluster.placements.map(({ finding }) => (
          <button
            key={finding.id}
            onClick={() => onSelect(finding)}
            className="w-full rounded-lg border border-border bg-card p-3 text-left transition hover:border-accent hover:bg-secondary/60"
          >
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge priority={finding.severity} compact />
              <FindingStatusBadge status={finding.status as any} />
              <Badge variant="outline" className="text-[10px]">{finding.area}</Badge>
              {finding.flowName && <Badge variant="secondary" className="text-[10px]">{finding.flowName}</Badge>}
            </div>
            <p className="mt-2 text-sm font-medium">{finding.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{finding.observation || finding.description}</p>
          </button>
        ))}
      </div>
    </>
  );
}

function FindingDetail({ finding, screenImageUrl, findingMetadataOptions, onAction, onBasisChange }: FindingDetailProps) {
  const [basisSearch, setBasisSearch] = useState("");
  const hasOutputOption = (option: FindingOutputOptionKey) => findingMetadataOptions.includes(option);

  const filteredLibrary = useMemo(() => {
    const search = basisSearch.trim().toLowerCase();
    if (!search) return REVIEW_BASIS_LIBRARY;
    return REVIEW_BASIS_LIBRARY.filter((b) =>
      b.name.toLowerCase().includes(search) ||
      b.type.toLowerCase().includes(search)
    );
  }, [basisSearch]);

  const addBasisItem = (item: any) => {
    if (finding.reviewBasis.some((b) => b.name === item.name)) return;
    const newBasisItem: ReviewBasisItem = {
      type: item.type,
      name: item.name,
      explanation: item.explanation,
    };
    onBasisChange([...finding.reviewBasis, newBasisItem]);
  };

  const removeBasisItem = (name: string) => {
    onBasisChange(finding.reviewBasis.filter((b) => b.name !== name));
  };

  const needsBasis =
    (finding.status === "ACCEPTED" || finding.status === "EDITED") &&
    finding.reviewBasis.length === 0;

  return (
    <>
      <SheetHeader>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={finding.severity} />
          <FindingStatusBadge status={finding.status as any} />
          <Badge variant="outline">{finding.area}</Badge>
          {finding.flowName && <Badge variant="secondary">{finding.flowName}</Badge>}
          {needsBasis && (
            <Badge variant="outline" className="gap-1 border-yellow-400/60 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
              <AlertTriangle className="h-3 w-3" />Incomplete — add basis
            </Badge>
          )}
        </div>
        <SheetTitle className="mt-2 text-left">{finding.title}</SheetTitle>
        <SheetDescription className="text-left">
          {hasOutputOption("linkedPrinciple") && finding.principle
            ? `${finding.screen} · ${finding.principle}`
            : finding.screen}
        </SheetDescription>
      </SheetHeader>

      <div className="mt-5 space-y-5 text-sm">
        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-secondary/40">
          {screenImageUrl ? (
            <img src={screenImageUrl} alt={finding.screen} className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
          )}
        </div>

        <Section title="Observation">{finding.observation || finding.description}</Section>
        {hasOutputOption("linkedPrinciple") && finding.why && (
          <Section title="Why it matters">{finding.why}</Section>
        )}

        {/* ── Review Basis ─────────────────────────── */}
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
                          key={item.name}
                          onClick={() => addBasisItem(item)}
                          disabled={already}
                          className={cn(
                            "w-full rounded px-2 py-1.5 text-left transition",
                            already
                              ? "cursor-default opacity-40"
                              : "hover:bg-secondary/60"
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
            <p className="mt-1 text-xs text-muted-foreground italic">No basis mapped yet. Add at least one before approving.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {finding.reviewBasis.map((b) => (
                <div
                  key={b.name}
                  className="group flex items-start gap-1.5 rounded-lg border border-border bg-secondary/40 px-2.5 py-2 w-full"
                >
                  <BookOpen className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{b.type}</p>
                    <p className="text-xs font-semibold">{b.name}</p>
                    <p className="text-[11px] text-muted-foreground">{b.explanation}</p>
                  </div>
                  <button
                    onClick={() => removeBasisItem(b.name)}
                    className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
                    aria-label={`Remove ${b.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* ─────────────────────────────────────────── */}

        {hasOutputOption("recommendationsWithAcceptanceCriteria") && finding.recommendation && (
          <Section title="Recommendation">{finding.recommendation}</Section>
        )}
        {hasOutputOption("recommendationsWithAcceptanceCriteria") && finding.aiMetadata?.acceptanceCriteria?.length ? (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Acceptance criteria</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
              {finding.aiMetadata.acceptanceCriteria.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {hasOutputOption("linkedPrinciple") && finding.principle && (
          <Section title="Linked principle">{finding.principle}</Section>
        )}
        {hasOutputOption("requirementTraceability") && finding.aiMetadata?.requirementTraceability && (
          <Section title="Requirement traceability">{finding.aiMetadata.requirementTraceability}</Section>
        )}
        {hasOutputOption("businessImpactEstimate") && finding.businessImpact && (
          <Section title="Business impact">{finding.businessImpact}</Section>
        )}
        {hasOutputOption("accessibilityImpactWcag") && finding.a11yImpact && (
          <Section title="Accessibility impact">{finding.a11yImpact}</Section>
        )}
        {hasOutputOption("accessibilityImpactWcag") && finding.aiMetadata?.wcagCriteria && (
          <Section title="WCAG criterion">{finding.aiMetadata.wcagCriteria}</Section>
        )}

        <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-accent">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI confidence · {finding.confidence}%
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            You decide the final outcome.
          </p>
        </div>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm" className="min-h-9"
            onClick={() => onAction("ACCEPTED")}
            disabled={finding.status === "ACCEPTED"}
          >
            <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Accept
          </Button>
          <Button
            size="sm" variant="outline" className="min-h-9"
            onClick={() => onAction("EDITED")}
            disabled={finding.status === "EDITED"}
          >
            <Edit3 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Edit & accept
          </Button>
          <Button
            size="sm" variant="outline" className="min-h-9"
            onClick={() => onAction("DISMISSED")}
            disabled={finding.status === "DISMISSED"}
          >
            <X className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Dismiss
          </Button>
          <Button
            size="sm" variant="outline" className="min-h-9"
            onClick={() => onAction("ESCALATED")}
            disabled={finding.status === "ESCALATED"}
          >
            <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Escalate
          </Button>
          <Button size="sm" variant="outline" className="min-h-9"><MessageSquare className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Comment</Button>
          <Button size="sm" variant="outline" className="min-h-9">Create Jira ticket</Button>
          <Button size="sm" variant="ghost" className="min-h-9"><RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Regenerate</Button>
          <Button size="sm" variant="ghost" className="min-h-9"><AlertCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />False positive</Button>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value, tone, accent }: { label: string; value: string; tone?: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", accent && "text-accent", tone)}>{value}</span>
    </div>
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

function CardFallback() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-sm w-full text-center border border-border rounded-xl p-8 space-y-4 bg-card">
        <MonitorPlay className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="font-semibold">No review selected</h2>
        <p className="text-sm text-muted-foreground">Open a review from History or start a new one.</p>
        <div className="flex gap-2 justify-center">
          <Button asChild><Link href="/new-review">New Review</Link></Button>
          <Button asChild variant="outline"><Link href="/history">History</Link></Button>
        </div>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <>
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><p className="text-muted-foreground text-sm">Loading…</p></div>}>
        <WorkspaceContent />
      </Suspense>
    </>
  );
}
