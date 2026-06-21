/**
 * agents/contentMicrocopy.ts
 * ------------------------
 * Stage 2d of the graph. Runs IN PARALLEL with other UX review agents.
 *
 * JOB: Apply Content & Microcopy principles to the screenshot and produce
 * structured findings regarding text clarity, tone, and labeling.
 *
 * INPUT  (from state):  screenshots[], groundingOutput, context
 * OUTPUT (to state):    contentMicrocopyOutput
 *
 * Tools: None — pure vision LLM + structured output.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm.js";
import { ContentMicrocopyOutputSchema, type ContentMicrocopyOutput } from "../schemas.js";
import type { GraphStateType } from "../state.js";
import {
  CONTENT_MICROCOPY_SYSTEM_PROMPT,
  buildContentMicrocopyTaskPrompt,
} from "../prompts/agents/contentMicrocopy.js";

// ─── Agent Node Function ──────────────────────────────────────────────────────

export async function contentMicrocopyAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Content Microcopy] Starting text & copy review...");

  const { screenshots, groundingOutput, context } = state;

  if (!groundingOutput) {
    throw new Error(
      "[Content Microcopy] groundingOutput is null — grounding agent must run first"
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
    text: buildContentMicrocopyTaskPrompt({ groundingOutput, context }),
  };

  try {
    const structuredLLM = llm.withStructuredOutput(ContentMicrocopyOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(CONTENT_MICROCOPY_SYSTEM_PROMPT),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as ContentMicrocopyOutput;

    console.log(`[Content Microcopy] Done — ${result.findings.length} findings`);
    result.findings.forEach((f) => {
      console.log(`  ${f.severity} | ${f.principle} | ${f.region}`);
    });

    return { contentMicrocopyOutput: result };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Content Microcopy] Error:", msg);
    throw err;
  }
}