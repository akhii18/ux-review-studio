import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { llm } from "../llm.js";
import {
  BoundingBoxReviewOutputSchema,
  type BoundingBoxReviewFinding,
  type BoundingBoxReviewOutput,
  type GeometryCandidate,
  type ReviewBox,
  type SynthesizedFinding,
} from "../schemas.js";
import type { GraphStateType } from "../state.js";
import {
  BOUNDING_BOXES_SYSTEM_PROMPT,
  buildBoundingBoxesTaskPrompt,
} from "../prompts/agents/boundingBoxes.js";

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function candidateToReviewBox(candidate: GeometryCandidate, label: string): ReviewBox {
  return {
    screenIndex: candidate.screenIndex,
    bbox: candidate.bbox,
    label,
    sourceType: candidate.sourceType,
    sourceConfidence: candidate.sourceConfidence,
    sourceCandidateId: candidate.candidateId,
    sourceElementId: null,
    sourceEvidence: candidate.sourceEvidence,
  };
}

function dedupeBoxes(boxes: ReviewBox[]): ReviewBox[] {
  const unique = new Map<string, ReviewBox>();

  for (const box of boxes) {
    const key = [
      box.screenIndex,
      box.sourceCandidateId ?? "",
      box.sourceElementId ?? "",
      box.bbox.x.toFixed(4),
      box.bbox.y.toFixed(4),
      box.bbox.width.toFixed(4),
      box.bbox.height.toFixed(4),
    ].join(":");
    unique.set(key, box);
  }

  return Array.from(unique.values());
}

function normalizeReviewFinding(params: {
  finding: SynthesizedFinding;
  proposed?: BoundingBoxReviewFinding;
  state: GraphStateType;
}): BoundingBoxReviewFinding {
  const { finding, proposed, state } = params;
  const elementLookup = new Map(
    (state.groundingOutput?.elements ?? []).map((element) => [element.elementId, element])
  );
  const candidateLookup = new Map(
    (state.geometryOutput?.candidates ?? []).map((candidate) => [candidate.candidateId, candidate])
  );

  const selectedElementRefs = Array.from(new Set([
    ...(proposed?.selectedElementRefs ?? []),
    ...finding.elementRefs,
  ])).filter((elementId) => elementLookup.has(elementId));

  const selectedCandidateIds = Array.from(new Set(proposed?.selectedCandidateIds ?? []))
    .filter((candidateId) => candidateLookup.has(candidateId));

  const boxes: ReviewBox[] = [];

  for (const candidateId of selectedCandidateIds) {
    const candidate = candidateLookup.get(candidateId);
    if (candidate) {
      boxes.push(candidateToReviewBox(candidate, finding.id));
    }
  }

  for (const elementId of selectedElementRefs) {
    const element = elementLookup.get(elementId);
    if (!element) continue;
    boxes.push({
      screenIndex: element.screenIndex,
      bbox: element.bbox,
      label: finding.id,
      sourceType: "element",
      sourceConfidence: 0.7,
      sourceCandidateId: null,
      sourceElementId: elementId,
      sourceEvidence: `Grounded element ${elementId}: ${element.region}`,
    });
  }

  for (const proposedBox of proposed?.boxes ?? []) {
    if (proposedBox.sourceCandidateId && candidateLookup.has(proposedBox.sourceCandidateId)) {
      boxes.push(candidateToReviewBox(candidateLookup.get(proposedBox.sourceCandidateId)!, finding.id));
      continue;
    }

    if (proposedBox.sourceElementId && elementLookup.has(proposedBox.sourceElementId)) {
      const element = elementLookup.get(proposedBox.sourceElementId)!;
      boxes.push({
        screenIndex: element.screenIndex,
        bbox: element.bbox,
        label: finding.id,
        sourceType: "element",
        sourceConfidence: 0.7,
        sourceCandidateId: null,
        sourceElementId: proposedBox.sourceElementId,
        sourceEvidence: `Grounded element ${proposedBox.sourceElementId}: ${element.region}`,
      });
      continue;
    }

    boxes.push({
      ...proposedBox,
      label: finding.id,
      bbox: {
        x: clamp01(proposedBox.bbox.x),
        y: clamp01(proposedBox.bbox.y),
        width: clamp01(proposedBox.bbox.width),
        height: clamp01(proposedBox.bbox.height),
      },
      sourceConfidence: Math.min(proposedBox.sourceConfidence, 0.55),
      sourceType: proposedBox.sourceType === "element" ? "llm" : proposedBox.sourceType,
      sourceEvidence: proposedBox.sourceEvidence || "Unresolved model-selected box",
    });
  }

  if (boxes.length === 0) {
    for (const ref of finding.bboxRefs) {
      boxes.push({
        screenIndex: ref.screenIndex,
        bbox: ref.bbox,
        label: finding.id,
        sourceType: "synthesis",
        sourceConfidence: 0.45,
        sourceCandidateId: null,
        sourceElementId: null,
        sourceEvidence: "Fallback to synthesis bboxRef; needs human verification",
      });
    }
  }

  const finalBoxes = dedupeBoxes(boxes).filter((box) => box.bbox.width > 0 && box.bbox.height > 0);
  const averageBoxConfidence = finalBoxes.length > 0
    ? finalBoxes.reduce((total, box) => total + box.sourceConfidence, 0) / finalBoxes.length
    : 0;

  return {
    findingId: finding.id,
    severity: finding.severity,
    region: finding.region,
    issue: finding.issue,
    fix: finding.fix,
    selectedElementRefs,
    selectedCandidateIds,
    boxes: finalBoxes,
    geometryConfidence: proposed
      ? Math.min(proposed.geometryConfidence, Math.max(0.35, averageBoxConfidence))
      : averageBoxConfidence,
    humanReviewStatus: "pending",
    ambiguityNote: finalBoxes.length > 0
      ? proposed?.ambiguityNote || "None"
      : "No reliable geometry could be resolved for this finding.",
  };
}

function buildFallbackOutput(state: GraphStateType): BoundingBoxReviewOutput {
  const findings = (state.synthesisOutput?.findings ?? []).map((finding) =>
    normalizeReviewFinding({ finding, state })
  );

  return {
    findings,
    summary: `Prepared ${findings.length} findings using deterministic element and synthesis fallbacks.`,
    coverageNote: "Bounding Box Review Agent fallback ran without model-selected geometry.",
  };
}

function buildCandidateBlock(candidates: GeometryCandidate[]): string {
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

export async function boundingBoxesAgent(
  state: GraphStateType
): Promise<Partial<GraphStateType>> {
  console.log("\n[Bounding Boxes] Starting — mapping findings to reviewable geometry...");

  if (!state.synthesisOutput || state.synthesisOutput.findings.length === 0) {
    return {
      boundingBoxReviewOutput: {
        findings: [],
        summary: "No synthesized findings to annotate.",
        coverageNote: "No bounding boxes generated because synthesis returned no findings.",
      },
    };
  }

  const elementBlock = state.groundingOutput
    ? state.groundingOutput.elements
        .map((element) =>
          `- ${element.elementId} | screen=${element.screenIndex} | ${element.type} | ${element.region}` +
          ` | bbox=(${element.bbox.x.toFixed(3)},${element.bbox.y.toFixed(3)},${element.bbox.width.toFixed(3)},${element.bbox.height.toFixed(3)})` +
          (element.text ? ` | text="${element.text.replace(/"/g, "'")}"` : "")
        )
        .join("\n")
    : "No grounded elements available.";

  const candidateBlock = state.geometryOutput?.candidates.length
    ? buildCandidateBlock(state.geometryOutput.candidates)
    : "No measured geometry candidates available.";

  const textBlock = {
    type: "text" as const,
    text: buildBoundingBoxesTaskPrompt({
      synthesizedFindings: state.synthesisOutput.findings,
      elementBlock,
      candidateBlock,
    }),
  };

  try {
    const structuredLLM = llm.withStructuredOutput(BoundingBoxReviewOutputSchema);
    const result = await structuredLLM.invoke([
      new SystemMessage(BOUNDING_BOXES_SYSTEM_PROMPT),
      new HumanMessage({ content: [textBlock] }),
    ]) as BoundingBoxReviewOutput;

    const proposedById = new Map(result.findings.map((finding) => [finding.findingId, finding]));
    const normalizedFindings = state.synthesisOutput.findings.map((finding) =>
      normalizeReviewFinding({
        finding,
        proposed: proposedById.get(finding.id),
        state,
      })
    );

    const unresolved = normalizedFindings.filter((finding) => finding.boxes.length === 0).length;
    const normalizedOutput: BoundingBoxReviewOutput = {
      findings: normalizedFindings,
      summary: result.summary,
      coverageNote: `${result.coverageNote} Unresolved findings: ${unresolved}.`,
    };

    console.log(`[Bounding Boxes] Done — ${normalizedFindings.length} findings, ${unresolved} unresolved`);
    return { boundingBoxReviewOutput: normalizedOutput };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Bounding Boxes] Model selection failed, using deterministic fallback: ${message}`);
    return { boundingBoxReviewOutput: buildFallbackOutput(state) };
  }
}