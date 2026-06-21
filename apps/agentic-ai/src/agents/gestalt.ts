/**
 * agents/gestalt.ts
 * ------------------------
 * Stage 2e of the graph. Runs IN PARALLEL with other UX review agents.
 *
 * JOB: Apply Gestalt Principles to the screenshot and produce structured
 * findings regarding layout logic, visual relationships, and grouping.
 *
 * INPUT  (from state):  screenshots[], groundingOutput, context
 * OUTPUT (to state):    gestaltOutput
 *
 * Tools: None — pure vision LLM + structured output.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm.js";
import { GestaltOutputSchema, type GestaltOutput } from "../schemas.js";
import type { GraphStateType } from "../state.js";
import {
  GESTALT_SYSTEM_PROMPT,
  buildGestaltTaskPrompt,
} from "../prompts/agents/gestalt.js";

// ─── Agent Node Function ──────────────────────────────────────────────────────

export async function gestaltAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Gestalt] Starting visual relationship & layout review...");

  const { screenshots, groundingOutput, context } = state;

  if (!groundingOutput) {
    throw new Error(
      "[Gestalt] groundingOutput is null — grounding agent must run first"
    );
  }

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
    text: buildGestaltTaskPrompt({ groundingOutput, context }),
  };

  try {
    const structuredLLM = llm.withStructuredOutput(GestaltOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(GESTALT_SYSTEM_PROMPT),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as GestaltOutput;

    console.log(`[Gestalt] Done — ${result.findings.length} findings`);
    result.findings.forEach((f) => {
      console.log(`  ${f.severity} | ${f.principle} | ${f.region}`);
    });

    return { gestaltOutput: result };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Gestalt] Error:", msg);
    throw err;
  }
}