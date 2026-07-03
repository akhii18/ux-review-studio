/**
 * agents/synthesis.ts
 * --------------------
 * Stage 3 of the graph. Runs AFTER all 6 specialist agents finish (fan-in).
 *
 * JOB: Collect every raw finding from the 6 agents, identify overlaps,
 * merge duplicates into canonical findings, and produce a clean,
 * prioritized list that downstream steps (human triage, export) consume.
 *
 * INPUT  (from state):  all 6 *Output fields
 * OUTPUT (to state):    synthesisOutput (SynthesisOutput)
 *
 * Why no vector DB: all ~50 principles + all raw findings fit comfortably
 * in one LLM context window. RAG would add latency with zero benefit here.
 *
 * Tools: None — pure LLM call with structured output.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createLlmForReviewDepth } from "../llm.js";
import {
  SynthesisOutputSchema,
  type SynthesisOutput,
  type FindingBoundingBoxRef,
} from "../schemas.js";
import type { GraphStateType } from "../state.js";
import {
  buildSynthesisSystemPrompt,
  buildSynthesisTaskPrompt,
  resolveAllowedPrincipleNames,
} from "../prompts/agents/synthesis.js";

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function normalizeBBoxRefs(
  refs: FindingBoundingBoxRef[] | undefined,
  maxScreenIndex: number
): FindingBoundingBoxRef[] {
  if (!refs || refs.length === 0) return [];

  const normalized = refs
    .map((ref) => {
      const x = clamp01(ref.bbox.x);
      const y = clamp01(ref.bbox.y);
      const width = clamp01(ref.bbox.width);
      const height = clamp01(ref.bbox.height);
      const screenIndex = Math.max(0, Math.min(maxScreenIndex, ref.screenIndex));

      return {
        screenIndex,
        bbox: { x, y, width, height },
      };
    })
    .filter((ref) => ref.bbox.width > 0 && ref.bbox.height > 0 && ref.bbox.x < 1 && ref.bbox.y < 1);

  const unique = new Map<string, FindingBoundingBoxRef>();
  for (const ref of normalized) {
    const key = [
      ref.screenIndex,
      ref.bbox.x.toFixed(4),
      ref.bbox.y.toFixed(4),
      ref.bbox.width.toFixed(4),
      ref.bbox.height.toFixed(4),
    ].join(":");
    unique.set(key, ref);
  }

  return Array.from(unique.values());
}

function normalizeSynthesisReferences(
  output: SynthesisOutput,
  state: GraphStateType
): SynthesisOutput {
  const validElementIds = new Set(state.groundingOutput?.elements.map((el) => el.elementId) ?? []);
  const maxScreenIndex = Math.max(0, state.screenshots.length - 1);

  const findings = output.findings.map((finding) => {
    const dedupedOriginal = Array.from(new Set(finding.elementRefs));
    const filteredRefs = validElementIds.size > 0
      ? dedupedOriginal.filter((ref) => validElementIds.has(ref))
      : dedupedOriginal;

    const elementRefs = filteredRefs.length > 0
      ? filteredRefs
      : dedupedOriginal.slice(0, 1);

    return {
      ...finding,
      elementRefs,
      bboxRefs: normalizeBBoxRefs(finding.bboxRefs, maxScreenIndex),
    };
  });

  return {
    ...output,
    findings,
  };
}

function canonicalizePrinciple(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function filterFindingsByAllowedPrinciples(
  output: SynthesisOutput,
  allowedPrincipleNames: string[] | null
): SynthesisOutput {
  if (!allowedPrincipleNames || allowedPrincipleNames.length === 0) {
    return output;
  }

  const allowed = new Set(allowedPrincipleNames.map(canonicalizePrinciple));
  const findings = output.findings.filter((finding) => allowed.has(canonicalizePrinciple(finding.principle)));

  return {
    ...output,
    findings,
  };
}

// ─── Helper: flatten all findings from all agents ───────────────────────────

function collectAllFindings(state: GraphStateType): {
  agentName: string;
  finding: Record<string, unknown>;
}[] {
  const agentOutputs = [
    { name: "nielsen",            output: state.nielsenOutput },
    { name: "accessibility",      output: state.accessibilityOutput },
    { name: "cognitiveInteraction", output: state.cognitiveInteractionOutput },
    { name: "contentMicrocopy",   output: state.contentMicrocopyOutput },
    { name: "gestalt",            output: state.gestaltOutput },
    { name: "visualDesign",       output: state.visualDesignOutput },
  ];

  const all: { agentName: string; finding: Record<string, unknown> }[] = [];

  for (const { name, output } of agentOutputs) {
    if (!output || !Array.isArray((output as any).findings)) continue;
    for (const finding of (output as any).findings) {
      all.push({ agentName: name, finding });
    }
  }

  return all;
}

// ─── Agent Node Function ─────────────────────────────────────────────────────

export async function synthesisAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Synthesis] Starting — collecting all agent findings...");

  const allFindings = collectAllFindings(state);
  const totalRaw = allFindings.length;
  const activeAgents = new Set(allFindings.map(({ agentName }) => agentName));

  if (totalRaw === 0) {
    console.warn("[Synthesis] No findings received from any agent — returning empty output.");
    return {
      synthesisOutput: {
        findings: [],
        totalRawFindings: 0,
        deduplicationNote: "No raw findings were produced by the specialist agents.",
      },
    };
  }

  console.log(`[Synthesis] Received ${totalRaw} raw findings across ${activeAgents.size} agents:`);
  const agentCounts: Record<string, number> = {};
  for (const { agentName } of allFindings) {
    agentCounts[agentName] = (agentCounts[agentName] ?? 0) + 1;
  }
  for (const [agent, count] of Object.entries(agentCounts)) {
    console.log(`  • ${agent}: ${count}`);
  }

  // Format all findings as a structured block for the LLM
  const findingsBlock = allFindings
    .map(
      ({ agentName, finding }, i) =>
        `[${i + 1}] Agent: ${agentName}\n` +
        JSON.stringify(finding, null, 2)
    )
    .join("\n\n");

  const groundingElementBlock = state.groundingOutput
    ? state.groundingOutput.elements
        .map(
          (el) =>
            `- ${el.elementId} | screen=${el.screenIndex} | region=${el.region} | ` +
            `bbox=(${el.bbox.x.toFixed(3)},${el.bbox.y.toFixed(3)},${el.bbox.width.toFixed(3)},${el.bbox.height.toFixed(3)})`
        )
        .join("\n")
    : "No grounding output available.";

  const allowedPrincipleNames = resolveAllowedPrincipleNames(state.selectedPrinciples);

  const textBlock = {
    type: "text" as const,
    text: buildSynthesisTaskPrompt({
      totalRawFindings: totalRaw,
      activeAgentCount: activeAgents.size,
      findingsBlock,
      groundingElementBlock,
      selectedPrinciples: state.selectedPrinciples,
      allowedPrincipleNames,
    }),
  };

  try {
    const structuredLLM = createLlmForReviewDepth(state.reviewDepth).withStructuredOutput(SynthesisOutputSchema);

    const result = await structuredLLM.invoke([
      new SystemMessage(
        buildSynthesisSystemPrompt({
          selectedPrinciples: state.selectedPrinciples,
        })
      ),
      new HumanMessage({ content: [textBlock] }),
    ]) as SynthesisOutput;

    const normalizedResult = normalizeSynthesisReferences(result, state);
    const filteredResult = filterFindingsByAllowedPrinciples(normalizedResult, allowedPrincipleNames);

    const p0 = filteredResult.findings.filter((f) => f.severity === "P0").length;
    const p1 = filteredResult.findings.filter((f) => f.severity === "P1").length;
    const p2 = filteredResult.findings.filter((f) => f.severity === "P2").length;

    console.log(`[Synthesis] Done — ${totalRaw} raw → ${filteredResult.findings.length} canonical findings`);
    console.log(`  Severity breakdown: P0=${p0}  P1=${p1}  P2=${p2}`);
    console.log(`  Dedup note: ${filteredResult.deduplicationNote}`);

    return { synthesisOutput: filteredResult };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Synthesis] Error:", msg);
    throw err;
  }
}
