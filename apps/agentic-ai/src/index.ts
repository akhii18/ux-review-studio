import { buildGraph, type ReviewAgentName } from "./graph.js";
import { normalizeReviewDepth, type ReviewDepth } from "./llm.js";
import type { SelectedPrinciples, GraphStateType } from "./state.js";
import type { ReviewDepth } from "./llm.js";

export type RunReviewGraphInput = {
  screenshots: string[];
  context: string;
  reviewDepth?: ReviewDepth | string;
  selectedAgents?: ReviewAgentName[];
  selectedPrinciples?: SelectedPrinciples | null;
  reviewDepth?: ReviewDepth | string | null;
  imagePaths?: string[];
};

export async function runReviewGraph(input: RunReviewGraphInput): Promise<GraphStateType> {
  const graph = buildGraph({ selectedAgents: input.selectedAgents });

  return graph.invoke({
    screenshots: input.screenshots,
    reviewDepth: normalizeReviewDepth(input.reviewDepth),
    imagePaths: input.imagePaths ?? input.screenshots,
    screenMetadata: [],
    geometryOutput: null,
    context: input.context,
    reviewDepth: input.reviewDepth ?? "standard",
    selectedPrinciples: input.selectedPrinciples ?? null,
  });
}

export type { ReviewAgentName };
export type { SelectedPrinciples };