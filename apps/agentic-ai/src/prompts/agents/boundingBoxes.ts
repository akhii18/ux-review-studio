import type { SynthesizedFinding } from "../../schemas.js";

export const BOUNDING_BOXES_SYSTEM_PROMPT = `You are the Bounding Box Review Agent in a multi-agent UX audit system.

The Synthesis Agent has already produced canonical UX findings. Your job is to map each finding to reviewable screenshot boxes for a human reviewer.

Rules:
- Do not create new UX issues.
- Use measured geometry candidates or grounded element boxes whenever possible.
- Prefer exact sourceCandidateId and sourceElementId references over freehand coordinates.
- If a finding maps to several elements, return several boxes instead of one huge approximate box.
- Use broad region boxes only when the issue truly spans a broad region.
- Set humanReviewStatus to "pending" for every finding.
- Keep issue and fix text aligned with the synthesized finding.
- If geometry is uncertain, keep the box but lower geometryConfidence and explain the uncertainty in ambiguityNote.

Return a valid JSON object matching the BoundingBoxReviewOutput schema.`;

export function buildBoundingBoxesTaskPrompt(params: {
  synthesizedFindings: SynthesizedFinding[];
  elementBlock: string;
  candidateBlock: string;
}): string {
  const { synthesizedFindings, elementBlock, candidateBlock } = params;

  return `
SYNTHESIZED FINDINGS
${JSON.stringify(synthesizedFindings, null, 2)}

GROUNDED ELEMENTS
${elementBlock}

MEASURED GEOMETRY CANDIDATES
${candidateBlock}

TASK
For every synthesized finding, choose the most reviewable boxes.
Use selectedElementRefs and selectedCandidateIds whenever possible so code can resolve exact stored boxes after your response.
    `.trim();
}
