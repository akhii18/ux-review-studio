import {
  SECTION_508_PRINCIPLES,
  DOMAIN_REGULATION_PRINCIPLES,
  DESTRUCTIVE_ACTION_SAFETY_PRINCIPLES,
  DATA_PRIVACY_PRINCIPLES,
  type SubcategoryKey,
  SUBCATEGORY_PROMPTS,
} from "../../principles.js";
import type { GroundingOutput } from "../../schemas.js";
import { buildGroundingReviewPrompt } from "../shared.js";

/** Risk-category subcategory keys */
const RISK_SUBCATEGORY_KEYS: SubcategoryKey[] = [
  "section508Compliance",
  "domainRegulation",
  "destructiveActionSafety",
  "dataPrivacyDisclosures",
];

/**
 * Build a dynamic system prompt for the Risk agent.
 * Injects only the principle blocks for the subcategories the user selected.
 * Falls back to all risk principles if nothing is selected.
 */
export function buildRiskSystemPrompt(selectedSubcategories: SubcategoryKey[]): string | null {
  const active = RISK_SUBCATEGORY_KEYS.filter((k) => selectedSubcategories.includes(k));

  // Non-empty selection but nothing belongs to this agent → skip
  if (selectedSubcategories.length > 0 && active.length === 0) return null;

  const principleBlocks = active.length > 0
    ? active.map((k) => SUBCATEGORY_PROMPTS[k]).join("\n\n")
    : [SECTION_508_PRINCIPLES, DOMAIN_REGULATION_PRINCIPLES, DESTRUCTIVE_ACTION_SAFETY_PRINCIPLES, DATA_PRIVACY_PRINCIPLES].join("\n\n");

  return `You are a specialist Risk Reviewer.
You are one agent in a multi-agent UX audit system.

YOUR SCOPE — Compliance, safety, and privacy risk only. Do NOT flag these (other agents handle them):
  ✗ Contrast ratios, focus states, or WCAG accessibility → Accessibility agent
  ✗ Design tokens, spacing grid, or component usage      → Consistency agent
  ✗ Copywriting, tone, or label quality                  → Content UX agent
  ✗ Task flows, navigation logic, or learnability        → Usability agent
  ✗ Impact estimates, effort, or acceptance criteria     → Recommendations agent

${principleBlocks}

HOW TO PRODUCE A FINDING:
  1. Identify a specific compliance, safety, or privacy issue visible on screen
  2. Trace it to an exact principle by name from the blocks above
  3. Name the screen region (use the Grounding Agent's region names)
  4. Add elementRefs: include one or more grounding elementId values tied to this issue
  5. Add bboxRefs only if issue spans area not represented by a single grounded element
  6. Explain why this principle applies in one sentence
  7. Give a concrete, actionable fix
  8. Set severity: P0 creates legal or data exposure risk | P1 violates known standard | P2 risk mitigation improvement
  9. Set confidence: only include findings where confidence ≥ 0.65

QUALITY RULES:
  - Be specific. "The 'Delete Account' button executes immediately with no confirmation dialog, violating Destructive Action Safety principle 1" is good. "Dangerous button" is not.
  - Only flag what is visually verifiable from the static screenshot. Note unverifiable dynamic behaviors (session timeouts, server-side consent flows) in coverageNote.
  - Empty findings array is valid — do not invent issues to fill the report.
  - Target 3–6 findings. Quality over quantity.`;
}

/** Backward-compatible static export (replaces GESTALT_SYSTEM_PROMPT) */
export const GESTALT_SYSTEM_PROMPT = buildRiskSystemPrompt([
  "section508Compliance",
  "domainRegulation",
  "destructiveActionSafety",
  "dataPrivacyDisclosures",
]);

/** Alias for the new agent name */
export const RISK_SYSTEM_PROMPT = GESTALT_SYSTEM_PROMPT;

export function buildGestaltTaskPrompt(params: {
  groundingOutput: GroundingOutput;
  context: string;
}): string {
  return buildGroundingReviewPrompt({
    groundingOutput: params.groundingOutput,
    context: params.context,
    overviewLine1: "Use the following screen inventory to identify UI elements and interactive controls.",
    overviewLine2: "Apply your selected risk principles to what you observe in the screenshot.",
    taskLine1: "Review the screenshot(s) above using the selected risk principles.",
    taskLine2: "Return only findings you can clearly support from what is visible.",
  });
}

/** Alias */
export const buildRiskTaskPrompt = buildGestaltTaskPrompt;
