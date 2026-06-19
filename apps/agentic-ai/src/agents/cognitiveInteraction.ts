/**
 * agents/cognitiveInteraction.ts
 * ------------------------
 * Stage 2c of the graph. Runs IN PARALLEL with other UX review agents.
 *
 * JOB: Apply Cognitive Interaction Laws (Fitts's, Hick's, Miller's, etc.)
 * to the screenshot and produce structured, explainable friction findings.
 *
 * INPUT  (from state):  screenshots[], groundingOutput, context
 * OUTPUT (to state):    cognitiveInteractionOutput
 *
 * Tools: None — pure vision LLM + structured output.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm.js";
import { CognitiveInteractionOutputSchema, type CognitiveInteractionOutput } from "../schemas.js";
import type { GraphStateType } from "../state.js";
import {
  COGNITIVE_INTERACTION_SYSTEM_PROMPT,
  buildCognitiveInteractionTaskPrompt,
} from "../prompts/agents/cognitiveInteraction.js";

// ─── Agent Node Function ──────────────────────────────────────────────────────

export async function cognitiveInteractionAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Cognitive Interaction] Starting mental load & friction review...");

  const { screenshots, groundingOutput, context } = state;

  if (!groundingOutput) {
    throw new Error(
      "[Cognitive Interaction] groundingOutput is null — grounding agent must run first"
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
    text: buildCognitiveInteractionTaskPrompt({ groundingOutput, context }),
  };

  try {
    const structuredLLM = llm.withStructuredOutput(CognitiveInteractionOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(COGNITIVE_INTERACTION_SYSTEM_PROMPT),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as CognitiveInteractionOutput;

    console.log(`[Cognitive Interaction] Done — ${result.findings.length} findings`);
    result.findings.forEach((f) => {
      console.log(`  ${f.severity} | ${f.principle} | ${f.region}`);
    });

    return { cognitiveInteractionOutput: result };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Cognitive Interaction] Error:", msg);
    throw err;
  }
}