/**
 * agents/grounding.ts
 * --------------------
 * Stage 1 of the graph. Runs first, before the Nielsen agent.
 *
 * JOB: Look at the screenshots and produce a structured inventory of
 * everything on screen. This shared context means the Nielsen agent
 * doesn't need to "discover" the UI itself — it can focus purely on
 * applying heuristics to a description it can trust.
 *
 * INPUT  (from state):  screenshots[], context string
 * OUTPUT (to state):    groundingOutput (GroundingOutput)
 *
 * Tools: None — pure vision LLM call.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createLlmForReviewDepth } from "../llm.js";
import { GroundingOutputSchema, type GroundingOutput } from "../schemas.js";
import type { GraphStateType } from "../state.js";
import {
  GROUNDING_SYSTEM_PROMPT,
  buildGroundingTaskPrompt,
} from "../prompts/agents/grounding.js";

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function normalizeGroundingOutput(
  output: GroundingOutput,
  screenshotCount: number
): GroundingOutput {
  const maxIndex = Math.max(0, screenshotCount - 1);
  const perScreenCounters = new Map<number, number>();

  const elements = output.elements.map((element) => {
    const screenIndex = Math.max(0, Math.min(maxIndex, element.screenIndex));
    const nextCount = (perScreenCounters.get(screenIndex) ?? 0) + 1;
    perScreenCounters.set(screenIndex, nextCount);

    return {
      ...element,
      screenIndex,
      elementId: `screen${screenIndex + 1}-el-${nextCount}`,
      bbox: {
        x: clamp01(element.bbox.x),
        y: clamp01(element.bbox.y),
        width: clamp01(element.bbox.width),
        height: clamp01(element.bbox.height),
      },
    };
  });

  return {
    ...output,
    elements,
  };
}

function buildGeometryCandidateBlock(state: GraphStateType): string {
  const candidates = state.geometryOutput?.candidates ?? [];
  if (candidates.length === 0) return "No measured geometry candidates available.";

  return candidates
    .slice(0, 160)
    .map((candidate) =>
      `- ${candidate.candidateId} | screen=${candidate.screenIndex} | ${candidate.sourceType}/${candidate.label ?? "unknown"}` +
      ` | conf=${candidate.sourceConfidence.toFixed(2)}` +
      ` | bbox=(${candidate.bbox.x.toFixed(3)},${candidate.bbox.y.toFixed(3)},${candidate.bbox.width.toFixed(3)},${candidate.bbox.height.toFixed(3)})` +
      (candidate.text ? ` | text="${candidate.text.replace(/"/g, "'")}"` : "")
    )
    .join("\n");
}

// ─── Agent Node Function ──────────────────────────────────────────────────

export async function groundingAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Grounding] Starting — building screen inventory...");

  const { screenshots, context } = state;

  // Build the image blocks — Gemini accepts base64 data URIs or public URLs
  const imageBlocks = screenshots.map((src) => ({
    type: "image_url" as const,
    image_url: {
      // If already a data URI or URL, use as-is; otherwise assume bare base64 PNG
      url: src.startsWith("http") || src.startsWith("data:")
        ? src
        : `data:image/png;base64,${src}`,
    },
  }));

  // Text block that goes alongside the images
  const textBlock = {
    type: "text" as const,
    text: buildGroundingTaskPrompt({
      screenshotCount: screenshots.length,
      context,
      state,
      geometryCandidateBlock: buildGeometryCandidateBlock,
    }),
  };

  try {
    const structuredLLM = createLlmForReviewDepth(state.reviewDepth).withStructuredOutput(GroundingOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(GROUNDING_SYSTEM_PROMPT),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as GroundingOutput;

    const normalized = normalizeGroundingOutput(result, screenshots.length);

    console.log(`[Grounding] Done — found ${normalized.elements.length} elements, type: "${normalized.screenType}"`);
    console.log(`[Grounding] Primary actions: ${normalized.primaryActions.join(", ")}`);

    return { groundingOutput: normalized };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Grounding] Error:", msg);
    throw err; // let LangGraph handle the failure
  }
}
