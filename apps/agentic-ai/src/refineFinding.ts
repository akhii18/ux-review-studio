/**
 * refineFinding.ts
 * ─────────────────
 * Targeted single-finding refinement via a direct LLM call.
 *
 * Instead of re-running the full 8-node agentic pipeline (which produces
 * 10–30+ unrelated findings), this module makes ONE focused LLM call to
 * refine a specific existing finding based on user feedback/comments.
 *
 * Inputs:
 *   - The original finding (title, description, severity, area, etc.)
 *   - User comments / feedback for the refinement
 *   - The relevant screenshot (just the one this finding lives on)
 *   - Review context (product name, domain, etc.)
 *
 * Output:
 *   - A refined version of the same finding with updated fields.
 */

import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createLlmForReviewDepth } from "./llm.js";

// ── Schema for the refined finding output ────────────────────────────────────

export const RefinedFindingSchema = z.object({
  issue: z
    .string()
    .describe("Updated specific, factual description of the problem."),

  fix: z
    .string()
    .describe("Updated concrete actionable fix — what to change and how."),

  severity: z
    .enum(["P0", "P1", "P2"])
    .describe("Updated severity after considering user feedback."),

  why: z
    .string()
    .describe("Updated explanation of why this issue matters."),

  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Updated confidence level (0–1) after refinement."),

  businessImpact: z
    .string()
    .nullable()
    .default(null)
    .describe("Updated business impact estimate, if applicable."),

  a11yImpact: z
    .string()
    .nullable()
    .default(null)
    .describe("Updated accessibility impact, if applicable."),

  acceptanceCriteria: z
    .array(z.string())
    .default([])
    .describe("Updated testable acceptance criteria for the fix."),

  refinementNote: z
    .string()
    .describe(
      "Brief note explaining what was changed and why, based on user feedback."
    ),
});

export type RefinedFinding = z.infer<typeof RefinedFindingSchema>;

// ── Input type ───────────────────────────────────────────────────────────────

export type RefineFindingInput = {
  /** The original finding's current data */
  originalFinding: {
    title: string;
    description: string | null;
    observation: string | null;
    severity: string;
    area: string;
    screen: string | null;
    principle: string | null;
    why: string | null;
    recommendation: string | null;
    businessImpact: string | null;
    a11yImpact: string | null;
    confidence: number;
  };
  /** User comments / feedback that should guide the refinement */
  userComments: string[];
  /** Data URL of the relevant screenshot (just the one for this finding) */
  screenshot: string | null;
  /** Review context string (product, domain, etc.) */
  reviewContext: string;
  /** Review depth for model selection */
  reviewDepth: string;
};

// ── System prompt ────────────────────────────────────────────────────────────

function buildRefinementSystemPrompt(): string {
  return `You are an expert UX reviewer refining a specific existing finding based on user feedback.

You will receive:
1. The ORIGINAL FINDING with its current title, description, severity, recommendation, and other fields.
2. USER COMMENTS — feedback from a human reviewer who wants this finding refined.
3. A SCREENSHOT of the relevant screen (if available).
4. REVIEW CONTEXT about the product being reviewed.

Your job is to REFINE this specific finding — NOT to discover new findings or review other parts of the screen.

Rules:
- Stay focused on the SAME UI element / issue described in the original finding.
- Update the finding's fields based on the user's feedback.
- If the user says the severity should be different, adjust it with justification.
- If the user provides additional context about the issue, incorporate it into the description and "why".
- If the user disagrees with the recommendation, provide a better one.
- If no user comments are provided, re-evaluate the finding from scratch against the screenshot, but keep it about the same UI area/element.
- The confidence score should reflect how certain you are about the refined finding (0.0–1.0).
- Do NOT invent issues that aren't visible or described. Stay grounded in what you can see.
- Write in a professional, concise tone appropriate for a UX review report.`;
}

// ── Task prompt builder ──────────────────────────────────────────────────────

function buildRefinementTaskPrompt(input: RefineFindingInput): string {
  const { originalFinding, userComments, reviewContext } = input;

  const commentBlock =
    userComments.length > 0
      ? userComments.map((c, i) => `  ${i + 1}. ${c}`).join("\n")
      : "  (No comments provided — re-evaluate the finding from scratch)";

  return `=== REVIEW CONTEXT ===
${reviewContext}

=== ORIGINAL FINDING ===
Title: ${originalFinding.title}
Severity: ${originalFinding.severity}
Area: ${originalFinding.area}
Screen: ${originalFinding.screen ?? "Unknown"}
Principle: ${originalFinding.principle ?? "N/A"}

Description/Observation:
${originalFinding.observation || originalFinding.description || "N/A"}

Why it matters:
${originalFinding.why ?? "N/A"}

Current recommendation:
${originalFinding.recommendation ?? "N/A"}

Business impact: ${originalFinding.businessImpact ?? "N/A"}
Accessibility impact: ${originalFinding.a11yImpact ?? "N/A"}
Current confidence: ${originalFinding.confidence}

=== USER FEEDBACK ===
${commentBlock}

=== YOUR TASK ===
Refine the finding above based on the user feedback. Return an updated version of this finding with improved description, severity, recommendation, and other fields as needed. Stay focused on the same UI element and issue.`;
}

// ── Main function ────────────────────────────────────────────────────────────

export async function refineSingleFinding(
  input: RefineFindingInput
): Promise<RefinedFinding> {
  const systemPrompt = buildRefinementSystemPrompt();
  const taskPrompt = buildRefinementTaskPrompt(input);

  const llm = createLlmForReviewDepth(input.reviewDepth);
  const structuredLLM = llm.withStructuredOutput(RefinedFindingSchema);

  // Build the message content — include screenshot if available
  const contentParts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
    { type: "text" as const, text: taskPrompt },
  ];

  if (input.screenshot) {
    contentParts.push({
      type: "image_url" as const,
      image_url: { url: input.screenshot },
    });
  }

  const result = await structuredLLM.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage({ content: contentParts }),
  ]);

  return result as RefinedFinding;
}
