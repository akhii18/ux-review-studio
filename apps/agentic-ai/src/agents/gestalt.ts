/**
 * agents/gestalt.ts  →  Risk Agent
 * ----------------------------------
 * Stage 2e of the graph. Runs IN PARALLEL with other UX review agents.
 *
 * JOB: Apply selected Risk principles (Compliance / Section 508,
 * Domain Regulation / HIPAA & BFSI, Destructive Action Safety,
 * Data Privacy Disclosures) to the screenshot and produce structured
 * findings regarding compliance, safety, and privacy risks.
 *
 * INPUT  (from state):  screenshots[], groundingOutput, context, selectedPrinciples
 * OUTPUT (to state):    gestaltOutput
 *
 * Tools: None — pure vision LLM + structured output.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm.js";
import { GestaltOutputSchema, type GestaltOutput } from "../schemas.js";
import type { GraphStateType } from "../state.js";
import type { SubcategoryKey } from "../principles.js";
import {
  buildRiskSystemPrompt,
  buildGestaltTaskPrompt,
} from "../prompts/agents/gestalt.js";

// ─── Agent Node Function ──────────────────────────────────────────────────────

export async function gestaltAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Risk] Starting compliance & risk review...");

  const { screenshots, groundingOutput, context, selectedPrinciples } = state;

  if (!groundingOutput) {
    throw new Error(
      "[Risk] groundingOutput is null — grounding agent must run first"
    );
  }

  // Derive which subcategories are active for this agent
  const selectedSubcategories: SubcategoryKey[] = selectedPrinciples
    ? (Object.keys(selectedPrinciples) as SubcategoryKey[]).filter(
        (k) => selectedPrinciples[k] === true
      )
    : [];

  // Build dynamic system prompt based on user's subcategory selection
  const systemPrompt = buildRiskSystemPrompt(selectedSubcategories);

  // If systemPrompt is null, this agent has no selected subcategories to review
  if (systemPrompt === null) {
    console.log("[Risk] Skipped — no relevant subcategories selected.");
    return {
      gestaltOutput: {
        findings: [],
        summary: "Review skipped (no risk criteria selected).",
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
    text: buildGestaltTaskPrompt({ groundingOutput, context }),
  };

  try {
    const structuredLLM = llm.withStructuredOutput(GestaltOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as GestaltOutput;

    console.log(`[Risk] Done — ${result.findings.length} findings`);
    result.findings.forEach((f) => {
      console.log(`  ${f.severity} | ${f.principle} | ${f.region}`);
    });

    return { gestaltOutput: result };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Risk] Error:", msg);
    throw err;
  }
}