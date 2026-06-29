/**
 * agents/accessibility.ts
 * ------------------------
 * Stage 2b of the graph. Runs IN PARALLEL with the usability agent.
 *
 * JOB: Apply selected Accessibility principles (WCAG 2.2 AA Conformance,
 * Keyboard Navigation, Screen Reader Interpretation, Touch Targets ≥ 44px)
 * to the screenshot and produce structured, explainable accessibility findings.
 *
 * INPUT  (from state):  screenshots[], groundingOutput, context, selectedPrinciples
 * OUTPUT (to state):    accessibilityOutput (AccessibilityOutput)
 *
 * What this agent does NOT cover (other agents handle these):
 *   - General UX heuristics          → Usability agent
 *   - Design system / spacing        → Consistency agent
 *   - Microcopy and label quality    → Content UX agent
 *   - Compliance / risk              → Risk agent
 *   - Impact estimates               → Recommendations agent
 *
 * Tools: None — pure vision LLM + structured output.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm.js";
import { AccessibilityOutputSchema, type AccessibilityOutput } from "../schemas.js";
import type { GraphStateType } from "../state.js";
import type { SubcategoryKey } from "../principles.js";
import {
  buildAccessibilitySystemPrompt,
  buildAccessibilityTaskPrompt,
} from "../prompts/agents/accessibility.js";

// ─── Agent Node Function ──────────────────────────────────────────────────────

export async function accessibilityAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Accessibility] Starting accessibility review...");

  const { screenshots, groundingOutput, context, selectedPrinciples } = state;

  // Guard: grounding must have run first
  if (!groundingOutput) {
    throw new Error(
      "[Accessibility] groundingOutput is null — grounding agent must run first"
    );
  }

  // Derive which subcategories are active for this agent
  const selectedSubcategories: SubcategoryKey[] = selectedPrinciples
    ? (Object.keys(selectedPrinciples) as SubcategoryKey[]).filter(
        (k) => selectedPrinciples[k] === true
      )
    : [];

  // Build dynamic system prompt based on user's subcategory selection
  const systemPrompt = buildAccessibilitySystemPrompt(selectedSubcategories);

  // If systemPrompt is null, this agent has no selected subcategories to review
  if (systemPrompt === null) {
    console.log("[Accessibility] Skipped — no relevant subcategories selected.");
    return {
      accessibilityOutput: {
        findings: [],
        summary: "Review skipped (no accessibility criteria selected).",
        coverageNote: "N/A",
      },
    };
  }

  // Send screenshots so the agent can see the actual UI
  const imageBlocks = screenshots.map((src) => ({
    type: "image_url" as const,
    image_url: {
      url: src.startsWith("http") || src.startsWith("data:")
        ? src
        : `data:image/png;base64,${src}`,
    },
  }));

  const textBlock = {
    type: "text" as const,
    text: buildAccessibilityTaskPrompt({ groundingOutput, context }),
  };

  try {
    const structuredLLM = llm.withStructuredOutput(AccessibilityOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as AccessibilityOutput;

    console.log(`[Accessibility] Done — ${result.findings.length} findings`);
    result.findings.forEach((f) => {
      const wcag = f.wcagCriteria ? ` (${f.wcagCriteria})` : "";
      console.log(`  ${f.severity} | ${f.principle}${wcag} | ${f.region}`);
    });

    return { accessibilityOutput: result };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Accessibility] Error:", msg);
    throw err;
  }
}
