/**
 * agents/visualDesign.ts
 * ------------------------
 * Stage 2f of the graph. Runs IN PARALLEL with other UX review agents.
 *
 * JOB: Apply Visual Design Principles to the screenshot and produce structured
 * findings regarding aesthetics, styling, hierarchy, and polish.
 *
 * INPUT  (from state):  screenshots[], groundingOutput, context
 * OUTPUT (to state):    visualDesignOutput
 *
 * Tools: None — pure vision LLM + structured output.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm.js";
import { VisualDesignOutputSchema, type VisualDesignOutput } from "../schemas.js";
import type { GraphStateType } from "../state.js";
import {
  VISUAL_DESIGN_SYSTEM_PROMPT,
  buildVisualDesignTaskPrompt,
} from "../prompts/agents/visualDesign.js";

// ─── Agent Node Function ──────────────────────────────────────────────────────

export async function visualDesignAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Visual Design] Starting aesthetics & hierarchy review...");

  const { screenshots, groundingOutput, context } = state;

  if (!groundingOutput) {
    throw new Error(
      "[Visual Design] groundingOutput is null — grounding agent must run first"
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
    text: buildVisualDesignTaskPrompt({ groundingOutput, context }),
  };

  try {
    const structuredLLM = llm.withStructuredOutput(VisualDesignOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(VISUAL_DESIGN_SYSTEM_PROMPT),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as VisualDesignOutput;

    console.log(`[Visual Design] Done — ${result.findings.length} findings`);
    result.findings.forEach((f) => {
      console.log(`  ${f.severity} | ${f.principle} | ${f.region}`);
    });

    return { visualDesignOutput: result };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Visual Design] Error:", msg);
    throw err;
  }
}