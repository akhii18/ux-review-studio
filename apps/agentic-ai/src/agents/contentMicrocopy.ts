/**
 * agents/contentMicrocopy.ts  →  Content UX Agent
 * --------------------------------------------------
 * Stage 2d of the graph. Runs IN PARALLEL with other UX review agents.
 *
 * JOB: Apply selected Content UX principles (Microcopy Clarity,
 * Error Message Quality, Label Precision, Tone & Voice) to the screenshot
 * and produce structured findings regarding text clarity, tone, and labeling.
 *
 * INPUT  (from state):  screenshots[], groundingOutput, context, selectedPrinciples
 * OUTPUT (to state):    contentMicrocopyOutput
 *
 * Tools: None — pure vision LLM + structured output.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm.js";
import { ContentMicrocopyOutputSchema, type ContentMicrocopyOutput } from "../schemas.js";
import type { GraphStateType } from "../state.js";
import type { SubcategoryKey } from "../principles.js";
import {
  buildContentUXSystemPrompt,
  buildContentMicrocopyTaskPrompt,
} from "../prompts/agents/contentMicrocopy.js";

// ─── Agent Node Function ──────────────────────────────────────────────────────

export async function contentMicrocopyAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Content UX] Starting content & copy review...");

  const { screenshots, groundingOutput, context, selectedPrinciples } = state;

  if (!groundingOutput) {
    throw new Error(
      "[Content UX] groundingOutput is null — grounding agent must run first"
    );
  }

  // Derive which subcategories are active for this agent
  const selectedSubcategories: SubcategoryKey[] = selectedPrinciples
    ? (Object.keys(selectedPrinciples) as SubcategoryKey[]).filter(
        (k) => selectedPrinciples[k] === true
      )
    : [];

  // Build dynamic system prompt based on user's subcategory selection
  const systemPrompt = buildContentUXSystemPrompt(selectedSubcategories);

  // If systemPrompt is null, this agent has no selected subcategories to review
  if (systemPrompt === null) {
    console.log("[Content UX] Skipped — no relevant subcategories selected.");
    return {
      contentMicrocopyOutput: {
        findings: [],
        summary: "Review skipped (no content UX criteria selected).",
        coverageNote: "N/A",
      },
    };
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
      new SystemMessage(systemPrompt),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as ContentMicrocopyOutput;

    console.log(`[Content UX] Done — ${result.findings.length} findings`);
    result.findings.forEach((f) => {
      console.log(`  ${f.severity} | ${f.principle} | ${f.region}`);
    });

    return { contentMicrocopyOutput: result };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Content UX] Error:", msg);
    throw err;
  }
}