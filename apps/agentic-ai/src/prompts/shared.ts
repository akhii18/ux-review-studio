import type { GroundingOutput } from "../schemas.js";

type GroundingReviewPromptArgs = {
  groundingOutput: GroundingOutput;
  context: string;
  overviewLine1: string;
  overviewLine2: string;
  taskLine1: string;
  taskLine2: string;
};

function formatGroundingElements(groundingOutput: GroundingOutput): string {
  return groundingOutput.elements
    .map((el) =>
      `  • [${el.elementId}] [screen=${el.screenIndex}] [${el.type}] "${el.region}" — ${el.description}` +
      ` | bbox: x=${el.bbox.x.toFixed(3)}, y=${el.bbox.y.toFixed(3)}, w=${el.bbox.width.toFixed(3)}, h=${el.bbox.height.toFixed(3)}` +
      (el.text ? ` | text: "${el.text}"` : "") +
      (el.interactive ? " | interactive" : "")
    )
    .join("\n");
}

function formatGroundingObservations(groundingOutput: GroundingOutput): string {
  return groundingOutput.observations.map((o) => `  • ${o}`).join("\n");
}

export function buildGroundingReviewPrompt(args: GroundingReviewPromptArgs): string {
  const {
    groundingOutput,
    context,
    overviewLine1,
    overviewLine2,
    taskLine1,
    taskLine2,
  } = args;

  return `
=== GROUNDING AGENT OUTPUT ===
${overviewLine1}
${overviewLine2}

Screen type    : ${groundingOutput.screenType}
Layout         : ${groundingOutput.layout}
Primary actions: ${groundingOutput.primaryActions.join(", ")}

Elements on screen:
${formatGroundingElements(groundingOutput)}

Grounding observations:
${formatGroundingObservations(groundingOutput)}

=== REVIEW CONTEXT ===
${context || "No additional context provided."}

=== YOUR TASK ===
${taskLine1}
${taskLine2}
  `.trim();
}
