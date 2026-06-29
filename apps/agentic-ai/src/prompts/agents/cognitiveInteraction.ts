import {
  DESIGN_SYSTEM_TOKENS_PRINCIPLES,
  COMPONENT_USAGE_PRINCIPLES,
  SPACING_GRID_PRINCIPLES,
  ICONOGRAPHY_CONSISTENCY_PRINCIPLES,
  type SubcategoryKey,
  SUBCATEGORY_PROMPTS,
} from "../../principles.js";
import type { GroundingOutput } from "../../schemas.js";
import { buildGroundingReviewPrompt } from "../shared.js";

/** Consistency-category subcategory keys */
const CONSISTENCY_SUBCATEGORY_KEYS: SubcategoryKey[] = [
  "designSystemTokens",
  "componentUsage",
  "spacingGrid",
  "iconographyConsistency",
];

/**
 * Build a dynamic system prompt for the Consistency agent.
 * Injects only the principle blocks for the subcategories the user selected.
 * Falls back to all consistency principles if nothing is selected.
 */
export function buildConsistencySystemPrompt(selectedSubcategories: SubcategoryKey[]): string | null {
  const active = CONSISTENCY_SUBCATEGORY_KEYS.filter((k) => selectedSubcategories.includes(k));

  // Non-empty selection but nothing belongs to this agent → skip
  if (selectedSubcategories.length > 0 && active.length === 0) return null;

  const principleBlocks = active.length > 0
    ? active.map((k) => SUBCATEGORY_PROMPTS[k]).join("\n\n")
    : [DESIGN_SYSTEM_TOKENS_PRINCIPLES, COMPONENT_USAGE_PRINCIPLES, SPACING_GRID_PRINCIPLES, ICONOGRAPHY_CONSISTENCY_PRINCIPLES].join("\n\n");

  return `You are a specialist Consistency Reviewer.
You are one agent in a multi-agent UX audit system.

YOUR SCOPE — Design system consistency only. Do NOT flag these (other agents handle them):
  ✗ Contrast ratios, focus states, or WCAG rules      → Accessibility agent
  ✗ Copywriting, tone, or empty state text            → Content UX agent
  ✗ Task flows, navigation logic, or learnability     → Usability agent
  ✗ Compliance, safety, or privacy concerns           → Risk agent
  ✗ Impact estimates, effort, or acceptance criteria  → Recommendations agent

${principleBlocks}

HOW TO PRODUCE A FINDING:
  1. Identify a specific inconsistency, off-token value, or component misuse on screen
  2. Trace it to an exact principle by name from the blocks above
  3. Name the screen region (use the Grounding Agent's region names)
  4. Add elementRefs: include one or more grounding elementId values tied to this issue
  5. Add bboxRefs only if issue spans area not represented by a single grounded element
  6. Explain why this principle applies in one sentence
  7. Give a concrete fix — (e.g., "Replace hard-coded #FF5733 with the danger-500 design token")
  8. Set severity: P0 breaks brand integrity or token compliance | P1 causes inconsistency | P2 minor drift
  9. Set confidence: only include findings where confidence ≥ 0.65

QUALITY RULES:
  - Be specific. "The card component uses 12px padding instead of the 8pt grid multiple of 16px" is good. "Spacing is off" is not.
  - Base findings purely on visual evidence visible in the screenshot.
  - Empty findings array is valid — do not invent issues to fill the report.
  - Target 3–6 findings. Quality over quantity.`;
}

/** Backward-compatible static export used when no subcategory context is available. */
export const COGNITIVE_INTERACTION_SYSTEM_PROMPT = buildConsistencySystemPrompt([
  "designSystemTokens",
  "componentUsage",
  "spacingGrid",
  "iconographyConsistency",
]);

/** Alias for the new agent name */
export const CONSISTENCY_SYSTEM_PROMPT = COGNITIVE_INTERACTION_SYSTEM_PROMPT;

export function buildCognitiveInteractionTaskPrompt(params: {
  groundingOutput: GroundingOutput;
  context: string;
}): string {
  return buildGroundingReviewPrompt({
    groundingOutput: params.groundingOutput,
    context: params.context,
    overviewLine1: "Use the following screen inventory to identify UI elements and their visual properties.",
    overviewLine2: "Apply your selected consistency principles to what you observe in the screenshot.",
    taskLine1: "Review the screenshot(s) above using the selected consistency principles.",
    taskLine2: "Return only findings you can clearly support from what is visible.",
  });
}

/** Alias */
export const buildConsistencyTaskPrompt = buildCognitiveInteractionTaskPrompt;
