import { buildGraph, type ReviewAgentName } from "./graph.js";
import type { SelectedPrinciples, GraphStateType } from "./state.js";

export type RunReviewGraphInput = {
  screenshots: string[];
  context: string;
  selectedAgents?: ReviewAgentName[];
  selectedPrinciples?: SelectedPrinciples | null;
  imagePaths?: string[];
};

export async function runReviewGraph(input: RunReviewGraphInput): Promise<GraphStateType> {
  const graph = buildGraph({ selectedAgents: input.selectedAgents });

  return graph.invoke({
    screenshots: input.screenshots,
    imagePaths: input.imagePaths ?? input.screenshots,
    screenMetadata: [],
    geometryOutput: null,
    context: input.context,
    selectedPrinciples: input.selectedPrinciples ?? null,
  });
}

export type { ReviewAgentName };
export type { SelectedPrinciples };