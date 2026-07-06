import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createLlmForReviewDepth } from "../llm.js";
import {
  FlowDiscoveryOutputSchema,
  type DiscoveredFlow,
  type FlowDiscoveryOutput,
} from "../schemas.js";
import type { GraphStateType } from "../state.js";
import {
  FLOW_DISCOVERY_SYSTEM_PROMPT,
  buildFlowDiscoveryTaskPrompt,
} from "../prompts/agents/flowDiscovery.js";

function uniqueSortedPageNumbers(pageNumbers: number[], pageCount: number): number[] {
  return Array.from(new Set(
    pageNumbers
      .map((pageNumber) => Math.floor(Number(pageNumber)))
      .filter((pageNumber) => pageNumber >= 1 && pageNumber <= pageCount)
  )).sort((a, b) => a - b);
}

function fallbackFlowForPage(pageNumber: number, assetName?: string): DiscoveredFlow {
  const stem = assetName?.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return {
    flowName: stem ? `Page ${pageNumber} - ${stem}` : `Page ${pageNumber}`,
    description: "Independent page-level asset used when no broader journey grouping is available.",
    pageNumbers: [pageNumber],
  };
}

function normalizeFlowDiscoveryOutput(
  output: FlowDiscoveryOutput,
  state: GraphStateType
): FlowDiscoveryOutput {
  const pageCount = state.screenshots.length;
  const pagesByNumber = new Map(state.documentPages.map((page) => [page.pageNumber, page]));
  const assigned = new Set<number>();
  const flows: DiscoveredFlow[] = [];

  for (const flow of output.flows) {
    const pageNumbers = uniqueSortedPageNumbers(flow.pageNumbers, pageCount)
      .filter((pageNumber) => !assigned.has(pageNumber));

    if (pageNumbers.length === 0) continue;

    for (const pageNumber of pageNumbers) assigned.add(pageNumber);

    flows.push({
      flowName: flow.flowName.trim() || `Flow ${flows.length + 1}`,
      description: flow.description.trim() || "AI-discovered journey grouping.",
      pageNumbers,
    });
  }

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    if (!assigned.has(pageNumber)) {
      flows.push(fallbackFlowForPage(pageNumber, pagesByNumber.get(pageNumber)?.assetName));
    }
  }

  return {
    flows: flows.length > 0
      ? flows
      : Array.from({ length: pageCount }, (_, index) =>
          fallbackFlowForPage(index + 1, pagesByNumber.get(index + 1)?.assetName)
        ),
    routingRationale: output.routingRationale.trim() || "Pages were grouped by inferred user intent and task continuity.",
  };
}

function appendFlowContext(context: string, output: FlowDiscoveryOutput): string {
  const flowSummary = output.flows
    .map((flow) => `- ${flow.flowName} (pages ${flow.pageNumbers.join(", ")}): ${flow.description}`)
    .join("\n");

  return [
    context,
    "",
    "Auto-discovered key flows:",
    flowSummary,
    `Routing rationale: ${output.routingRationale}`,
  ].filter(Boolean).join("\n");
}

export async function flowDiscoveryAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Flow discovery] Starting — discovering key flows...");

  const imageBlocks = state.screenshots.map((src) => ({
    type: "image_url" as const,
    image_url: {
      url: src.startsWith("http") || src.startsWith("data:")
        ? src
        : `data:image/png;base64,${src}`,
    },
  }));

  const textBlock = {
    type: "text" as const,
    text: buildFlowDiscoveryTaskPrompt({
      pageCount: state.screenshots.length,
      pages: state.documentPages,
      context: state.context,
    }),
  };

  try {
    const structuredLLM = createLlmForReviewDepth(state.reviewDepth).withStructuredOutput(FlowDiscoveryOutputSchema);
    const result = await structuredLLM.invoke([
      new SystemMessage(FLOW_DISCOVERY_SYSTEM_PROMPT),
      new HumanMessage({ content: [...imageBlocks, textBlock] }),
    ]) as FlowDiscoveryOutput;

    const normalized = normalizeFlowDiscoveryOutput(result, state);
    console.log(`[Flow discovery] Done — ${normalized.flows.length} flow(s) discovered`);

    return {
      flowDiscoveryOutput: normalized,
      context: appendFlowContext(state.context, normalized),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Flow discovery] Error:", msg);
    throw err;
  }
}