/**
 * agents/usability.ts
 * --------------------
 * Stage 2 of the graph. Runs after the Grounding agent.
 *
 * JOB: Apply Nielsen's 10 Usability Heuristics (+ supporting cognitive laws)
 * to the screen and produce structured, explainable findings.
 *
 * INPUT  (from state):  screenshots[], groundingOutput, context
 * OUTPUT (to state):    nielsenOutput (NielsenOutput)
 *
 * What this agent does NOT do (other agents handle these in the full system):
 *   - WCAG accessibility checks      → Accessibility agent
 *   - Microcopy and label quality    → Content UX agent
 *   - Gestalt / spacing / alignment  → Consistency agent
 *   - Missing states / risk          → Risk agent
 *
 * Tools: None — pure vision LLM + structured output.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm.js";
import { NielsenOutputSchema, type NielsenOutput } from "../schemas.js";
import type { GraphStateType } from "../state.js";
import {
  USABILITY_SYSTEM_PROMPT,
  buildUsabilityTaskPrompt,
} from "../prompts/agents/usability.js";

// ─── Agent Node Function ──────────────────────────────────────────────────

export async function usabilityAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Usability] Starting Nielsen heuristic review...");

  const { screenshots, groundingOutput, context } = state;

  // Guard: grounding must have run first
  if (!groundingOutput) {
    throw new Error("[Usability] groundingOutput is null — grounding agent must run first");
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

  // The grounding output gives the agent a head start — no need to re-discover the UI
  const textBlock = {
    type: "text" as const,
    text: buildUsabilityTaskPrompt({ groundingOutput, context }),
  };

  try {
    const structuredLLM = llm.withStructuredOutput(NielsenOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(USABILITY_SYSTEM_PROMPT),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as NielsenOutput;

    // Log a summary to the console
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
