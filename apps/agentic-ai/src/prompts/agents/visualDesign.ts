import {
  BUSINESS_IMPACT_PRINCIPLES,
  EFFORT_ESTIMATE_PRINCIPLES,
  ACCEPTANCE_CRITERIA_PRINCIPLES,
  LINKED_PRINCIPLE_PRINCIPLES,
  type SubcategoryKey,
  SUBCATEGORY_PROMPTS,
} from "../../principles.js";
import type { GroundingOutput } from "../../schemas.js";
import { buildGroundingReviewPrompt } from "../shared.js";

/** Recommendations-category subcategory keys */
const RECOMMENDATIONS_SUBCATEGORY_KEYS: SubcategoryKey[] = [
  "businessImpactEstimate",
  "effortEstimate",
  "acceptanceCriteria",
  "linkedPrinciple",
];

/**
 * Build a dynamic system prompt for the Recommendations agent.
 * Injects only the principle blocks for the subcategories the user selected.
 * Falls back to all recommendations principles if nothing is selected.
 */
export function buildRecommendationsSystemPrompt(selectedSubcategories: SubcategoryKey[]): string | null {
  const active = RECOMMENDATIONS_SUBCATEGORY_KEYS.filter((k) => selectedSubcategories.includes(k));

  // Non-empty selection but nothing belongs to this agent → skip
  if (selectedSubcategories.length > 0 && active.length === 0) return null;

  const principleBlocks = active.length > 0
    ? active.map((k) => SUBCATEGORY_PROMPTS[k]).join("\n\n")
    : [BUSINESS_IMPACT_PRINCIPLES, EFFORT_ESTIMATE_PRINCIPLES, ACCEPTANCE_CRITERIA_PRINCIPLES, LINKED_PRINCIPLE_PRINCIPLES].join("\n\n");

  return `You are a specialist Recommendations Reviewer.
You are one agent in a multi-agent UX audit system.

YOUR SCOPE — Recommendation quality, business impact, and traceability only.
Your job is to evaluate whether findings from other agents are well-formed,
properly estimated, linked to principles, and actionable for stakeholders.
Do NOT produce new UX findings from scratch — instead evaluate and enrich
what you see in the grounding context. Flag gaps in:
  - Business impact framing
  - Effort estimation
  - Acceptance criteria quality
  - Principle linkage and traceability

Do NOT flag these (other agents handle them):
  ✗ Direct UX heuristic violations          → Usability agent
  ✗ Accessibility technical issues          → Accessibility agent
  ✗ Design system token or spacing issues   → Consistency agent
  ✗ Copy quality or tone issues             → Content UX agent
  ✗ Compliance or safety issues             → Risk agent

${principleBlocks}

HOW TO PRODUCE A FINDING:
  1. Identify a gap in recommendation quality, traceability, or business linkage
  2. Trace it to an exact principle by name from the blocks above
  3. Name the screen region or report section this applies to
  4. Add elementRefs referencing the relevant grounding elements if applicable
  5. Explain what is missing or weak in one sentence
  6. Give a concrete improvement — e.g., "Add effort estimate: M (Design 2d, Dev 3d)"
  7. Set severity: P0 = recommendation unusable by stakeholders | P1 = missing critical field | P2 = enhancement
  8. Set confidence: only include findings where confidence ≥ 0.65

QUALITY RULES:
  - Be specific. "No acceptance criterion is testable — rewrite as Given/When/Then" is good. "AC is weak" is not.
  - Empty findings array is valid — do not invent issues to fill the report.
  - Target 2–5 findings. Quality over quantity.`;
}

/** Backward-compatible static export (replaces VISUAL_DESIGN_SYSTEM_PROMPT) */
export const VISUAL_DESIGN_SYSTEM_PROMPT = buildRecommendationsSystemPrompt([
  "businessImpactEstimate",
  "effortEstimate",
  "acceptanceCriteria",
  "linkedPrinciple",
]);

/** Alias for the new agent name */
export const RECOMMENDATIONS_SYSTEM_PROMPT = VISUAL_DESIGN_SYSTEM_PROMPT;

export function buildVisualDesignTaskPrompt(params: {
  groundingOutput: GroundingOutput;
  context: string;
}): string {
  return buildGroundingReviewPrompt({
    groundingOutput: params.groundingOutput,
    context: params.context,
    overviewLine1: "Use the following screen inventory to understand what elements and interactions are present.",
    overviewLine2: "Apply your selected recommendations principles to evaluate the quality of the review output.",
    taskLine1: "Review the screen(s) above using the selected recommendations principles.",
    taskLine2: "Return only findings you can clearly support from what is visible.",
  });
}

/** Alias */
export const buildRecommendationsTaskPrompt = buildVisualDesignTaskPrompt;
