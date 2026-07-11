import { prisma } from "../config/prisma";

type Severity = "P0" | "P1" | "P2";

type ScoreFinding = {
  severity: Severity;
  screen: string | null;
  bboxRefs: unknown;
};

type BBoxRef = {
  screenIndex: number;
};

const SEVERITY_PENALTY: Record<Severity, number> = {
  P0: 10,
  P1: 5,
  P2: 2,
};

function normalizeBBoxRefsInput(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      return normalizeBBoxRefsInput(JSON.parse(value));
    } catch {
      return [];
    }
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.bboxRefs)) return record.bboxRefs;
    if (Array.isArray(record.refs)) return record.refs;
    if (Array.isArray(record.items)) return record.items;
  }

  return [];
}

function normalizeBBoxRefs(value: unknown, totalScreens: number): BBoxRef[] {
  return normalizeBBoxRefsInput(value)
    .map((item): BBoxRef | null => {
      if (!item || typeof item !== "object") return null;
      const screenIndex = Number((item as Record<string, unknown>).screenIndex);
      if (!Number.isFinite(screenIndex)) return null;
      return { screenIndex: Math.max(0, Math.floor(screenIndex)) };
    })
    .filter((item): item is BBoxRef => Boolean(item));
}

function normalizeScreenName(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "Unknown" || trimmed === "Multiple") return null;
  return trimmed.toLowerCase().replace(/\.[^.]+$/, "");
}

function scorePage(findings: ScoreFinding[]): number {
  const penalty = findings.reduce((sum, finding) => sum + SEVERITY_PENALTY[finding.severity], 0);
  return Math.max(0, 100 - penalty);
}

function calculateAveragePageScore(findings: ScoreFinding[], totalScreens: number): number {
  const pageFindings = new Map<string, ScoreFinding[]>();

  for (let index = 0; index < totalScreens; index += 1) {
    pageFindings.set(`index:${index}`, []);
  }

  for (const finding of findings) {
    const refs = normalizeBBoxRefs(finding.bboxRefs, totalScreens);
    const screenKeys = new Set<string>();

    for (const ref of refs) {
      if (ref.screenIndex >= 0 && (totalScreens === 0 || ref.screenIndex < totalScreens)) {
        screenKeys.add(`index:${ref.screenIndex}`);
      }
    }

    if (screenKeys.size === 0) {
      const screenName = normalizeScreenName(finding.screen);
      if (screenName) screenKeys.add(`screen:${screenName}`);
    }

    if (screenKeys.size === 0) {
      screenKeys.add("screen:overview");
    }

    for (const key of screenKeys) {
      const list = pageFindings.get(key) ?? [];
      list.push(finding);
      pageFindings.set(key, list);
    }
  }

  const pages = Array.from(pageFindings.values());
  if (pages.length === 0) return 100;

  return Math.round(pages.reduce((sum, page) => sum + scorePage(page), 0) / pages.length);
}

export async function calculateCurrentUxScore(reviewId: string): Promise<number> {
  const [screenCount, findings] = await Promise.all([
    prisma.asset.count({ where: { reviewId, mimeType: { startsWith: "image/" } } }),
    prisma.finding.findMany({
      where: {
        reviewId,
        status: { not: "DISMISSED" },
      },
      select: {
        severity: true,
        screen: true,
        bboxRefs: true,
      },
    }),
  ]);

  return calculateAveragePageScore(findings, screenCount);
}

export async function refreshReviewUxScore(reviewId: string): Promise<number> {
  const uxScore = await calculateCurrentUxScore(reviewId);
  await prisma.review.update({
    where: { id: reviewId },
    data: { uxScore },
  });
  return uxScore;
}