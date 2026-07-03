/**
 * agents/usability.ts
 * --------------------
 * Stage 2 of the graph. Runs after the Grounding agent.
 *
 * JOB: Apply selected Usability principles (Nielsen's 10 Heuristics,
 * Navigation Logic, Task Flow Efficiency, Recognition Over Recall)
 * to the screen and produce structured, explainable findings.
 *
 * INPUT  (from state):  screenshots[], groundingOutput, context, selectedPrinciples
 * OUTPUT (to state):    nielsenOutput (NielsenOutput)
 *
 * What this agent does NOT do (other agents handle these in the full system):
 *   - WCAG accessibility checks      → Accessibility agent
 *   - Design system / spacing        → Consistency agent
 *   - Microcopy and label quality    → Content UX agent
 *   - Missing states / risk          → Risk agent
 *   - Impact estimates               → Recommendations agent
 *
 * Tools: None — pure vision LLM + structured output.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createLlmForReviewDepth } from "../llm.js";
import { NielsenOutputSchema, type NielsenOutput } from "../schemas.js";
import type { GraphStateType } from "../state.js";
import type { SubcategoryKey } from "../principles.js";
import {
  buildUsabilitySystemPrompt,
  buildUsabilityTaskPrompt,
} from "../prompts/agents/usability.js";

// ─── Agent Node Function ──────────────────────────────────────────────────

export async function usabilityAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Usability] Starting usability review...");

  const { screenshots, groundingOutput, context, selectedPrinciples } = state;

  // Guard: grounding must have run first
  if (!groundingOutput) {
    throw new Error("[Usability] groundingOutput is null — grounding agent must run first");
  }

  // Derive which subcategories are active for this agent
  const selectedSubcategories: SubcategoryKey[] = selectedPrinciples
    ? (Object.keys(selectedPrinciples) as SubcategoryKey[]).filter(
        (k) => selectedPrinciples[k] === true
      )
    : [];

  // Build dynamic system prompt based on user's subcategory selection
  const systemPrompt = buildUsabilitySystemPrompt(selectedSubcategories);

  // If systemPrompt is null, this agent has no selected subcategories to review
  if (systemPrompt === null) {
    console.log("[Usability] Skipped — no relevant subcategories selected.");
    return {
      nielsenOutput: {
        findings: [],
        summary: "Review skipped (no usability criteria selected).",
        coverageNote: "N/A",
      },
    };
  }

  // Send the screenshots again so the agent can see the actual UI
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
    text: buildUsabilityTaskPrompt({ groundingOutput, context }),
  };

  try {
    const structuredLLM = createLlmForReviewDepth(state.reviewDepth).withStructuredOutput(NielsenOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as NielsenOutput;

    console.log(`[Usability] Done — ${result.findings.length} findings`);
    result.findings.forEach((f) => {
      console.log(`  ${f.severity} | ${f.principle} | ${f.region}`);
    });

    return { nielsenOutput: result };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Usability] Error:", msg);
    throw err;
  }
}
