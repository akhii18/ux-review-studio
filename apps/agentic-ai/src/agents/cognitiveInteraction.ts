/**
 * agents/cognitiveInteraction.ts  →  Consistency Agent
 * ------------------------------------------------------
 * Stage 2c of the graph. Runs IN PARALLEL with other UX review agents.
 *
 * JOB: Apply selected Consistency principles (Design System Tokens,
 * Component Usage, Spacing 8pt Grid, Iconography Consistency)
 * to the screenshot and produce structured findings.
 *
 * INPUT  (from state):  screenshots[], groundingOutput, context, selectedPrinciples
 * OUTPUT (to state):    cognitiveInteractionOutput
 *
 * Tools: None — pure vision LLM + structured output.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getLlmForState } from "../llm.js";
import { CognitiveInteractionOutputSchema, type CognitiveInteractionOutput } from "../schemas.js";
import type { GraphStateType } from "../state.js";
import type { SubcategoryKey } from "../principles.js";
import {
  buildConsistencySystemPrompt,
  buildCognitiveInteractionTaskPrompt,
} from "../prompts/agents/cognitiveInteraction.js";

// ─── Agent Node Function ──────────────────────────────────────────────────────

export async function cognitiveInteractionAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Consistency] Starting design system consistency review...");

  const { screenshots, groundingOutput, context, selectedPrinciples } = state;

  if (!groundingOutput) {
    throw new Error(
      "[Consistency] groundingOutput is null — grounding agent must run first"
    );
  }

  // Derive which subcategories are active for this agent
  const selectedSubcategories: SubcategoryKey[] = selectedPrinciples
    ? (Object.keys(selectedPrinciples) as SubcategoryKey[]).filter(
        (k) => selectedPrinciples[k] === true
      )
    : [];

  // Build dynamic system prompt based on user's subcategory selection
  const systemPrompt = buildConsistencySystemPrompt(selectedSubcategories);

  // If systemPrompt is null, this agent has no selected subcategories to review
  if (systemPrompt === null) {
    console.log("[Consistency] Skipped — no relevant subcategories selected.");
    return {
      cognitiveInteractionOutput: {
        findings: [],
        summary: "Review skipped (no consistency criteria selected).",
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
    text: buildCognitiveInteractionTaskPrompt({ groundingOutput, context }),
  };

  try {
    const structuredLLM = getLlmForState(state).withStructuredOutput(CognitiveInteractionOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as CognitiveInteractionOutput;

    console.log(`[Consistency] Done — ${result.findings.length} findings`);
    result.findings.forEach((f) => {
      console.log(`  ${f.severity} | ${f.principle} | ${f.region}`);
    });

    return { cognitiveInteractionOutput: result };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Consistency] Error:", msg);
    throw err;
  }
}