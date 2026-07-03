import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { createLlmForReviewDepth } from "../llm.js";
import type { FindingOutputOptionKey, GraphStateType } from "../state.js";
import type { SynthesizedFinding } from "../schemas.js";

const DEFAULT_FINDING_METADATA_OPTIONS: FindingOutputOptionKey[] = [
  "recommendationsWithAcceptanceCriteria",
  "linkedPrinciple",
  "requirementTraceability",
  "accessibilityImpactWcag",
  "businessImpactEstimate",
];

const RecommendationOutputSchema = z.object({
  recommendation: z.string().min(1),
  acceptanceCriteria: z.array(z.string().min(1)).max(5).default([]),
});

const LinkedPrincipleOutputSchema = z.object({
  principle: z.string().min(1),
  why: z.string().min(1),
});

const RequirementTraceabilityOutputSchema = z.object({
  requirementTraceability: z.string().min(1),
});

const AccessibilityImpactOutputSchema = z.object({
  a11yImpact: z.string().min(1),
  wcagCriteria: z.string().nullable().default(null),
});

const BusinessImpactOutputSchema = z.object({
  businessImpact: z.string().min(1),
});

function buildFindingPrompt(params: {
  finding: SynthesizedFinding;
  context: string;
  instruction: string;
}): string {
  return [
    params.instruction,
    "",
    "Final synthesized finding:",
    JSON.stringify(params.finding, null, 2),
    "",
    "Review context and supplied requirements/source notes:",
    params.context || "No additional context supplied.",
  ].join("\n");
}

async function enrichRecommendations(params: {
  finding: SynthesizedFinding;
  context: string;
  reviewDepth: string;
}) {
  const structuredLLM = createLlmForReviewDepth(params.reviewDepth).withStructuredOutput(RecommendationOutputSchema);
  return structuredLLM.invoke([
    new SystemMessage("You refine UX recommendations and create testable acceptance criteria. Keep output specific to the supplied final finding."),
    new HumanMessage(buildFindingPrompt({
      finding: params.finding,
      context: params.context,
      instruction: "Improve the recommendation only if needed, then return 2-4 concrete acceptance criteria that would prove the fix works. Do not add unrelated scope.",
    })),
  ]);
}

async function enrichLinkedPrinciple(params: {
  finding: SynthesizedFinding;
  context: string;
  reviewDepth: string;
}) {
  const structuredLLM = createLlmForReviewDepth(params.reviewDepth).withStructuredOutput(LinkedPrincipleOutputSchema);
  return structuredLLM.invoke([
    new SystemMessage("You link UX findings to the most relevant UX principle and explain the linkage succinctly."),
    new HumanMessage(buildFindingPrompt({
      finding: params.finding,
      context: params.context,
      instruction: "Return the strongest linked principle for this finding and one concise sentence explaining why that principle applies. Prefer the existing principle if it is already accurate.",
    })),
  ]);
}

async function enrichRequirementTraceability(params: {
  finding: SynthesizedFinding;
  context: string;
  reviewDepth: string;
}) {
  const structuredLLM = createLlmForReviewDepth(params.reviewDepth).withStructuredOutput(RequirementTraceabilityOutputSchema);
  return structuredLLM.invoke([
    new SystemMessage("You map UX findings to source requirements conservatively. Never invent requirement IDs, policy names, or source text."),
    new HumanMessage(buildFindingPrompt({
      finding: params.finding,
      context: params.context,
      instruction: "Trace this finding to a requirement, PRD note, policy, or source input when one is present. If no source requirement is visible, return: 'No direct requirement traceability found in the provided inputs.'",
    })),
  ]);
}

async function enrichAccessibilityImpact(params: {
  finding: SynthesizedFinding;
  context: string;
  reviewDepth: string;
}) {
  const structuredLLM = createLlmForReviewDepth(params.reviewDepth).withStructuredOutput(AccessibilityImpactOutputSchema);
  return structuredLLM.invoke([
    new SystemMessage("You summarize accessibility impact and map WCAG criteria when supported by the finding."),
    new HumanMessage(buildFindingPrompt({
      finding: params.finding,
      context: params.context,
      instruction: "Return the accessibility impact for affected users. Include a specific WCAG criterion only when it is directly supported; otherwise set wcagCriteria to null.",
    })),
  ]);
}

async function enrichBusinessImpact(params: {
  finding: SynthesizedFinding;
  context: string;
  reviewDepth: string;
}) {
  const structuredLLM = createLlmForReviewDepth(params.reviewDepth).withStructuredOutput(BusinessImpactOutputSchema);
  return structuredLLM.invoke([
    new SystemMessage("You estimate business impact for UX findings in concise stakeholder language."),
    new HumanMessage(buildFindingPrompt({
      finding: params.finding,
      context: params.context,
      instruction: "Return a concise business impact estimate describing likely user, conversion, support, compliance, operational, or trust consequences. Do not invent numeric metrics.",
    })),
  ]);
}

async function enrichFinding(params: {
  finding: SynthesizedFinding;
  selectedOptions: Set<FindingOutputOptionKey>;
  context: string;
  reviewDepth: string;
}): Promise<SynthesizedFinding> {
  const enriched: SynthesizedFinding = { ...params.finding };

  if (params.selectedOptions.has("recommendationsWithAcceptanceCriteria")) {
    const result = await enrichRecommendations(params);
    enriched.fix = result.recommendation;
    enriched.acceptanceCriteria = result.acceptanceCriteria ?? [];
  }

  if (params.selectedOptions.has("linkedPrinciple")) {
    const result = await enrichLinkedPrinciple(params);
    enriched.principle = result.principle;
    enriched.why = result.why;
  }

  if (params.selectedOptions.has("requirementTraceability")) {
    const result = await enrichRequirementTraceability(params);
    enriched.requirementTraceability = result.requirementTraceability;
  }

  if (params.selectedOptions.has("accessibilityImpactWcag")) {
    const result = await enrichAccessibilityImpact(params);
    enriched.a11yImpact = result.a11yImpact;
    enriched.wcagCriteria = result.wcagCriteria ?? null;
  }

  if (params.selectedOptions.has("businessImpactEstimate")) {
    const result = await enrichBusinessImpact(params);
    enriched.businessImpact = result.businessImpact;
  }

  return enriched;
}

async function mapWithConcurrency<T, U>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<U>
): Promise<U[]> {
  const results: U[] = [];

  for (let index = 0; index < items.length; index += limit) {
    const chunk = items.slice(index, index + limit);
    const chunkResults = await Promise.all(chunk.map(mapper));
    results.push(...chunkResults);
  }

  return results;
}

export async function outputEnrichmentAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  const synthesis = state.synthesisOutput;
  if (!synthesis || synthesis.findings.length === 0) {
    return {};
  }

  const optionKeys = state.findingMetadataOptions ?? DEFAULT_FINDING_METADATA_OPTIONS;
  const selectedOptions = new Set(optionKeys);

  if (selectedOptions.size === 0) {
    console.log("[Output enrichment] Skipped — no finding output options selected.");
    return { synthesisOutput: synthesis };
  }

  console.log(`[Output enrichment] Starting — ${synthesis.findings.length} findings, ${selectedOptions.size} selected output options`);

  const findings = await mapWithConcurrency(
    synthesis.findings,
    2,
    (finding) => enrichFinding({
      finding,
      selectedOptions,
      context: state.context,
      reviewDepth: String(state.reviewDepth ?? "standard"),
    })
  );

  console.log("[Output enrichment] Done");

  return {
    synthesisOutput: {
      ...synthesis,
      findings,
    },
  };
}