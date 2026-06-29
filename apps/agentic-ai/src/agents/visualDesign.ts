/**
 * agents/visualDesign.ts  →  Recommendations Agent
 * ---------------------------------------------------
 * Stage 2f of the graph. Runs IN PARALLEL with other UX review agents.
 *
 * JOB: Apply selected Recommendations principles (Business Impact Estimate,
 * Effort Estimate, Acceptance Criteria, Linked Principle) to evaluate the
 * quality of findings and produce structured enrichment recommendations.
 *
 * INPUT  (from state):  screenshots[], groundingOutput, context, selectedPrinciples
 * OUTPUT (to state):    visualDesignOutput
 *
 * Tools: None — pure vision LLM + structured output.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm.js";
import { VisualDesignOutputSchema, type VisualDesignOutput } from "../schemas.js";
import type { GraphStateType } from "../state.js";
import type { SubcategoryKey } from "../principles.js";
import {
  buildRecommendationsSystemPrompt,
  buildVisualDesignTaskPrompt,
} from "../prompts/agents/visualDesign.js";

// ─── Agent Node Function ──────────────────────────────────────────────────────

export async function visualDesignAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Recommendations] Starting recommendations quality review...");

  const { screenshots, groundingOutput, context, selectedPrinciples } = state;

  if (!groundingOutput) {
    throw new Error(
      "[Recommendations] groundingOutput is null — grounding agent must run first"
    );
  }

  // Derive which subcategories are active for this agent
  const selectedSubcategories: SubcategoryKey[] = selectedPrinciples
    ? (Object.keys(selectedPrinciples) as SubcategoryKey[]).filter(
        (k) => selectedPrinciples[k] === true
      )
    : [];

  // Build dynamic system prompt based on user's subcategory selection
  const systemPrompt = buildRecommendationsSystemPrompt(selectedSubcategories);

  // If systemPrompt is null, this agent has no selected subcategories to review
  if (systemPrompt === null) {
    console.log("[Recommendations] Skipped — no relevant subcategories selected.");
    return {
      visualDesignOutput: {
        findings: [],
        summary: "Review skipped (no recommendations criteria selected).",
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
    text: buildVisualDesignTaskPrompt({ groundingOutput, context }),
  };

  try {
    const structuredLLM = llm.withStructuredOutput(VisualDesignOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as VisualDesignOutput;

    console.log(`[Recommendations] Done — ${result.findings.length} findings`);
    result.findings.forEach((f) => {
      console.log(`  ${f.severity} | ${f.principle} | ${f.region}`);
    });

    return { visualDesignOutput: result };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Recommendations] Error:", msg);
    throw err;
  }
}