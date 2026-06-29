import {
  NIELSEN_PRINCIPLES,
  NAVIGATION_LOGIC_PRINCIPLES,
  TASK_FLOW_EFFICIENCY_PRINCIPLES,
  RECOGNITION_OVER_RECALL_PRINCIPLES,
  type SubcategoryKey,
  SUBCATEGORY_PROMPTS,
} from "../../principles.js";
import type { GroundingOutput } from "../../schemas.js";
import { buildGroundingReviewPrompt } from "../shared.js";

/** Usability-category subcategory keys */
const USABILITY_SUBCATEGORY_KEYS: SubcategoryKey[] = [
  "nielsensHeuristics",
  "navigationLogic",
  "taskFlowEfficiency",
  "recognitionOverRecall",
];

/**
 * Build a dynamic system prompt for the Usability agent.
 * - Returns the prompt string with only the relevant principle blocks injected
 *   when at least one usability subcategory is selected.
 * - Returns null when the user made a non-empty selection but none of the
 *   chosen subcategories belong to this agent — the agent should skip.
 * - Returns the full fallback prompt when selectedSubcategories is empty
 *   (meaning no filter at all, i.e. a full review).
 */
export function buildUsabilitySystemPrompt(selectedSubcategories: SubcategoryKey[]): string | null {
  const active = USABILITY_SUBCATEGORY_KEYS.filter((k) => selectedSubcategories.includes(k));

  // Non-empty selection but nothing belongs to this agent → skip
  if (selectedSubcategories.length > 0 && active.length === 0) return null;

  // Either active has matches, or selection is empty (full review fallback)
  const principleBlocks = active.length > 0
    ? active.map((k) => SUBCATEGORY_PROMPTS[k]).join("\n\n")
    : [NIELSEN_PRINCIPLES, NAVIGATION_LOGIC_PRINCIPLES, TASK_FLOW_EFFICIENCY_PRINCIPLES, RECOGNITION_OVER_RECALL_PRINCIPLES].join("\n\n");

  return `You are a specialist Usability Reviewer.
You are one agent in a multi-agent UX audit system.

YOUR SCOPE — Usability only. Do NOT flag these (other agents handle them):
  ✗ Contrast ratios or screen-reader readability      → Accessibility agent
  ✗ Design tokens, spacing grid, or component usage   → Consistency agent
  ✗ Copywriting, tone, or empty state text            → Content UX agent
  ✗ Compliance, safety, or privacy concerns           → Risk agent
  ✗ Impact estimates, effort, or acceptance criteria  → Recommendations agent

${principleBlocks}

HOW TO PRODUCE A FINDING:
  1. Identify a specific, visible usability problem on screen
  2. Trace it to an exact principle by name from the blocks above
  3. Name the screen region (use the Grounding Agent's region names)
  4. Add elementRefs: include one or more grounding elementId values tied to this issue
  5. Add bboxRefs only if issue spans area not represented by a single grounded element
  6. Explain why this principle applies in one sentence
  7. Give a concrete fix — what to change, not just "improve this"
  8. Set severity: P0 blocks the task | P1 degrades experience | P2 is polish
  9. Set confidence: only include findings where confidence \u2265 0.65

QUALITY RULES:
  - Be specific. "The submit button is 24\u00d724px, below minimum touch target size"
    is good. "The button is too small" is not.
  - Only flag what you can clearly see or clearly see is absent.
  - Empty findings array is fine — do not invent issues to fill the report.
  - Target 3\u20138 findings. Quality over quantity.`;
}

/** Backward-compatible static export used when no subcategory context is available. */
export const USABILITY_SYSTEM_PROMPT = buildUsabilitySystemPrompt([
  "nielsensHeuristics",
  "navigationLogic",
  "taskFlowEfficiency",
  "recognitionOverRecall",
]);

export function buildUsabilityTaskPrompt(params: {
  groundingOutput: GroundingOutput;
  context: string;
}): string {
  return buildGroundingReviewPrompt({
    groundingOutput: params.groundingOutput,
    context: params.context,
    overviewLine1: "The following structured inventory was built by the Grounding Agent.",
    overviewLine2: "Use it to understand the screen — then apply your usability principles.",
    taskLine1: "Review the screen(s) above using the selected usability principles.",
    taskLine2: "Return only findings you can clearly support from what is visible.",
  });
}
