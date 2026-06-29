import {
  CONTENT_MICROCOPY_PRINCIPLES,
  type SubcategoryKey,
  SUBCATEGORY_PROMPTS,
} from "../../principles.js";
import type { GroundingOutput } from "../../schemas.js";
import { buildGroundingReviewPrompt } from "../shared.js";

/** Content UX category subcategory keys */
const CONTENT_UX_SUBCATEGORY_KEYS: SubcategoryKey[] = [
  "microcopyClarity",
  "errorMessageQuality",
  "labelPrecision",
  "toneAndVoice",
];

/**
 * Build a dynamic system prompt for the Content UX agent.
 * Injects only the principle blocks for the subcategories the user selected.
 * Falls back to all content UX principles if nothing is selected.
 */
export function buildContentUXSystemPrompt(selectedSubcategories: SubcategoryKey[]): string | null {
  const active = CONTENT_UX_SUBCATEGORY_KEYS.filter((k) => selectedSubcategories.includes(k));

  // Non-empty selection but nothing belongs to this agent → skip
  if (selectedSubcategories.length > 0 && active.length === 0) return null;

  // Content UX subcategories all share the same CONTENT_MICROCOPY_PRINCIPLES block
  const principleBlocks = CONTENT_MICROCOPY_PRINCIPLES;

  return `You are a specialist Content UX Reviewer.
You are one agent in a multi-agent UX audit system.

YOUR SCOPE — UI copy, microcopy, and content quality only. Do NOT flag these (other agents handle them):
  ✗ Contrast ratios or ARIA label technicalities      → Accessibility agent
  ✗ Design tokens, spacing grid, or component usage   → Consistency agent
  ✗ Visual grouping, proximity, or alignment          → Consistency agent
  ✗ Task flows, navigation logic, or learnability     → Usability agent
  ✗ Compliance, safety, or privacy concerns           → Risk agent
  ✗ Impact estimates, effort, or acceptance criteria  → Recommendations agent

${principleBlocks}

HOW TO PRODUCE A FINDING:
  1. Identify specific text, labels, or error copy that is confusing, generic, or off-brand
  2. Trace it to an exact Content Principle by name
  3. Name the screen region (use the Grounding Agent's region names)
  4. Add elementRefs: include one or more grounding elementId values tied to this issue
  5. Add bboxRefs only if issue spans area not represented by a single grounded element
  6. Quote the exact current text and explain why it fails
  7. Give a concrete fix — provide exact suggested replacement copy
  8. Set severity: P0 blocks understanding | P1 causes confusion | P2 minor tone issue
  9. Set confidence: only include findings where confidence ≥ 0.65

QUALITY RULES:
  - Be specific. "The confirmation button says 'OK' instead of 'Delete Profile'" is good. "Bad copy" is not.
  - You are evaluating the English strings present on the static screenshot. Note limitations in coverageNote.
  - Empty findings array is valid — do not invent issues to fill the report.
  - Target 3–6 findings. Quality over quantity.`;
}

/** Backward-compatible static export used when no subcategory context is available. */
export const CONTENT_MICROCOPY_SYSTEM_PROMPT = buildContentUXSystemPrompt([
  "microcopyClarity",
  "errorMessageQuality",
  "labelPrecision",
  "toneAndVoice",
]);

/** Alias for the new agent name */
export const CONTENT_UX_SYSTEM_PROMPT = CONTENT_MICROCOPY_SYSTEM_PROMPT;

export function buildContentMicrocopyTaskPrompt(params: {
  groundingOutput: GroundingOutput;
  context: string;
}): string {
  return buildGroundingReviewPrompt({
    groundingOutput: params.groundingOutput,
    context: params.context,
    overviewLine1: "Use the following screen inventory to locate textual elements on the screen.",
    overviewLine2: "Apply your Content UX principles to what you observe in the screenshot.",
    taskLine1: "Review the screenshot(s) above using the selected Content UX principles.",
    taskLine2: "Return only findings you can clearly support from what is visible.",
  });
}

/** Alias */
export const buildContentUXTaskPrompt = buildContentMicrocopyTaskPrompt;
