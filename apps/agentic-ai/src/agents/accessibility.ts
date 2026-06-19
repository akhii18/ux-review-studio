/**
 * agents/accessibility.ts
 * ------------------------
 * Stage 2b of the graph. Runs IN PARALLEL with the usability agent.
 *
 * JOB: Apply WCAG's 4 POUR principles to the screenshot and produce
 * structured, explainable accessibility findings.
 *
 * POUR Principles (sourced from accessibility_principles.csv):
 *   - Perceivable  : Information must be presentable to all users
 *   - Operable     : Interface must be operable by any input method
 *   - Understandable: Content must be readable and predictable
 *   - Robust       : Must work reliably with assistive technologies
 *
 * INPUT  (from state):  screenshots[], groundingOutput, context
 * OUTPUT (to state):    accessibilityOutput (AccessibilityOutput)
 *
 * What this agent does NOT cover (other agents handle these):
 *   - General UX heuristics       → Usability (Nielsen) agent
 *   - Microcopy and label quality → Content UX agent (if added)
 *
 * Tools: None — pure vision LLM + structured output.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm.js";
import { AccessibilityOutputSchema, type AccessibilityOutput } from "../schemas.js";
import type { GraphStateType } from "../state.js";
import {
  ACCESSIBILITY_SYSTEM_PROMPT,
  buildAccessibilityTaskPrompt,
} from "../prompts/agents/accessibility.js";

// ─── Agent Node Function ──────────────────────────────────────────────────────

export async function accessibilityAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Accessibility] Starting WCAG POUR review...");

  const { screenshots, groundingOutput, context } = state;

  // Guard: grounding must have run first
  if (!groundingOutput) {
    throw new Error(
      "[Accessibility] groundingOutput is null — grounding agent must run first"
    );
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

  // Grounding output gives the agent element names and layout context
  const textBlock = {
    type: "text" as const,
    text: buildAccessibilityTaskPrompt({ groundingOutput, context }),
  };

  try {
    const structuredLLM = llm.withStructuredOutput(AccessibilityOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(ACCESSIBILITY_SYSTEM_PROMPT),
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
