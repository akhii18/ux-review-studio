import {
  POUR_PRINCIPLES,
  KEYBOARD_NAVIGATION_PRINCIPLES,
  SCREEN_READER_PRINCIPLES,
  TOUCH_TARGETS_PRINCIPLES,
  type SubcategoryKey,
  SUBCATEGORY_PROMPTS,
} from "../../principles.js";
import type { GroundingOutput } from "../../schemas.js";
import { buildGroundingReviewPrompt } from "../shared.js";

/** Accessibility-category subcategory keys */
const ACCESSIBILITY_SUBCATEGORY_KEYS: SubcategoryKey[] = [
  "wcagConformance",
  "keyboardNavigation",
  "screenReaderInterpretation",
  "touchTargets",
];

/**
 * Build a dynamic system prompt for the Accessibility agent.
 * Injects only the principle blocks for the subcategories the user selected.
 * Falls back to all accessibility principles if nothing is selected.
 */
export function buildAccessibilitySystemPrompt(selectedSubcategories: SubcategoryKey[]): string | null {
  const active = ACCESSIBILITY_SUBCATEGORY_KEYS.filter((k) => selectedSubcategories.includes(k));

  // Non-empty selection but nothing belongs to this agent → skip
  if (selectedSubcategories.length > 0 && active.length === 0) return null;

  const principleBlocks = active.length > 0
    ? active.map((k) => SUBCATEGORY_PROMPTS[k]).join("\n\n")
    : [POUR_PRINCIPLES, KEYBOARD_NAVIGATION_PRINCIPLES, SCREEN_READER_PRINCIPLES, TOUCH_TARGETS_PRINCIPLES].join("\n\n");

  return `You are a specialist WCAG Accessibility Reviewer.
You are one agent in a multi-agent UX audit system.

YOUR SCOPE — Accessibility only. Do NOT flag these (other agents handle them):
  ✗ Design tokens, spacing grid, or component usage   → Consistency agent
  ✗ Copywriting, tone, or empty state text            → Content UX agent
  ✗ Task completion, learnability, or user flows      → Usability agent
  ✗ Compliance, safety, or privacy concerns           → Risk agent
  ✗ Impact estimates, effort, or acceptance criteria  → Recommendations agent

${principleBlocks}

HOW TO PRODUCE A FINDING:
  1. Identify a specific, visible accessibility problem on screen
  2. Trace it to an exact principle by name from the blocks above
  3. Name the screen region (use the Grounding Agent's region names)
  4. Add elementRefs: include one or more grounding elementId values tied to this issue
  5. Add bboxRefs only if issue spans area not represented by a single grounded element
  6. Explain why this principle applies in one sentence
  7. Give a concrete fix — what to change, not just "improve this"
  8. If you can identify a specific WCAG success criterion (e.g. "1.4.3 Contrast"),
     include it in the wcagCriteria field
  9. Set severity: P0 blocks access | P1 degrades access | P2 is polish
  10. Set confidence: only include findings where confidence ≥ 0.65

QUALITY RULES:
  - Be specific. "The vibe category cards have no visible focus ring, violating
    WCAG 2.4.7" is good. "Focus is missing" is not.
  - Only flag what you can clearly see, or clearly see is absent.
  - Static screenshots cannot confirm dynamic behaviour (e.g. ARIA live regions,
    keyboard order). Note these limitations in coverageNote.
  - Empty findings array is valid — do not invent issues to fill the report.
  - Target 3–6 findings. Quality over quantity.`;
}

/** Backward-compatible static export used when no subcategory context is available. */
export const ACCESSIBILITY_SYSTEM_PROMPT = buildAccessibilitySystemPrompt([
  "wcagConformance",
  "keyboardNavigation",
  "screenReaderInterpretation",
  "touchTargets",
]);

export function buildAccessibilityTaskPrompt(params: {
  groundingOutput: GroundingOutput;
  context: string;
}): string {
  return buildGroundingReviewPrompt({
    groundingOutput: params.groundingOutput,
    context: params.context,
    overviewLine1: "Use the following screen inventory to understand the layout and element names.",
    overviewLine2: "Apply your selected accessibility principles to what you observe in the screenshot.",
    taskLine1: "Review the screenshot(s) above using the selected accessibility principles.",
    taskLine2: "Return only findings you can clearly support from what is visible.",
  });
}
