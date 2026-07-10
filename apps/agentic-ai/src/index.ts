import { buildGraph, type ReviewAgentName } from "./graph.js";
import type { FindingOutputOptionKey, SelectedPrinciples, GraphStateType } from "./state.js";
import type { DocumentPageMetadata } from "./schemas.js";
import type { ReviewDepth } from "./llm.js";

export type RunReviewGraphInput = {
  screenshots: string[];
  context: string;
  selectedAgents?: ReviewAgentName[];
  selectedPrinciples?: SelectedPrinciples | null;
  findingMetadataOptions?: FindingOutputOptionKey[] | null;
  reviewDepth?: ReviewDepth | string | null;
  keyFlowsOnly?: boolean;
  documentPages?: DocumentPageMetadata[];
  imagePaths?: string[];
};

export async function runReviewGraph(input: RunReviewGraphInput): Promise<GraphStateType> {
  const graph = buildGraph({ selectedAgents: input.selectedAgents, keyFlowsOnly: input.keyFlowsOnly });

  return graph.invoke({
    screenshots: input.screenshots,
    imagePaths: input.imagePaths ?? input.screenshots,
    keyFlowsOnly: input.keyFlowsOnly === true,
    documentPages: input.documentPages ?? [],
    screenMetadata: [],
    geometryOutput: null,
    context: input.context,
    reviewDepth: input.reviewDepth ?? "standard",
    selectedPrinciples: input.selectedPrinciples ?? null,
    findingMetadataOptions: input.findingMetadataOptions ?? null,
  });
}

export type { ReviewAgentName };
export type { SelectedPrinciples };
export type { FindingOutputOptionKey };
export { refineSingleFinding } from "./refineFinding.js";
export type { RefineFindingInput, RefinedFinding } from "./refineFinding.js";