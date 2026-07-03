/**
 * schemas.ts
 * ----------
 * All the data shapes in one place, defined with Zod.
 *
 * Zod does two things for us here:
 *  1. Runtime validation — if the LLM returns something unexpected, Zod catches it
 *  2. TypeScript types — z.infer<> gives us the TS type for free, no duplication
 *
 * Every field has a .describe() so the LLM knows what to put there when we
 * call .withStructuredOutput(schema) — Zod descriptions become JSON schema hints.
 */

import { z } from "zod";

// ─── Severity ─────────────────────────────────────────────────────────────────
// P0 / P1 / P2 maps directly to the PRD priority table

export const SeveritySchema = z.enum(["P0", "P1", "P2"]).describe(
  "P0 = blocks the task or violates a baseline. P1 = significantly degrades experience. P2 = polish."
);
export type Severity = z.infer<typeof SeveritySchema>;

// ─── Geometry / Screen References ──────────────────────────────────────────────

const NormalizedCoordinateSchema = z
  .number()
  .min(0)
  .max(1)
  .describe("Normalized coordinate value in [0, 1] relative to the screenshot dimensions");

export const BoundingBoxSchema = z.object({
  x: NormalizedCoordinateSchema.describe("Normalized left position of the box"),
  y: NormalizedCoordinateSchema.describe("Normalized top position of the box"),
  width: NormalizedCoordinateSchema.describe("Normalized width of the box"),
  height: NormalizedCoordinateSchema.describe("Normalized height of the box"),
});
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const ScreenMetadataSchema = z.object({
  screenIndex: z.number().int().min(0),
  screenId: z.string(),
  path: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type ScreenMetadata = z.infer<typeof ScreenMetadataSchema>;

export const GeometrySourceTypeSchema = z.enum([
  "ocr",
  "layout",
  "cv",
  "dom",
  "llm",
  "element",
  "synthesis",
  "hybrid",
]);
export type GeometrySourceType = z.infer<typeof GeometrySourceTypeSchema>;

export const GeometryCandidateSchema = z.object({
  candidateId: z
    .string()
    .describe("Stable ID for this detected geometry candidate within the run"),
  screenIndex: z
    .number()
    .int()
    .min(0)
    .describe("Zero-based screenshot index this candidate belongs to"),
  bbox: BoundingBoxSchema.describe("Normalized candidate box in screenshot coordinates"),
  sourceType: GeometrySourceTypeSchema.describe("How this candidate was produced"),
  sourceConfidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Provider confidence for this candidate box"),
  label: z
    .string()
    .nullable()
    .describe("Short provider label, such as 'text-line', 'text-group', or 'control'"),
  text: z
    .string()
    .nullable()
    .describe("Recognized visible text associated with this candidate, when available"),
  sourceEvidence: z
    .string()
    .describe("Compact provenance string describing provider, raw confidence, or grouping rule"),
});
export type GeometryCandidate = z.infer<typeof GeometryCandidateSchema>;

export const GeometryOutputSchema = z.object({
  extractionMode: z
    .string()
    .describe("Provider mode used for this run, e.g. 'local-ocr-layout'"),
  candidates: z
    .array(GeometryCandidateSchema)
    .describe("Detected candidate boxes available for downstream semantic agents"),
  providerNotes: z
    .array(z.string())
    .describe("Operational notes from geometry providers"),
});
export type GeometryOutput = z.infer<typeof GeometryOutputSchema>;

export const FindingBoundingBoxRefSchema = z.object({
  screenIndex: z
    .number()
    .int()
    .min(0)
    .describe("Zero-based index of screenshot this box belongs to"),
  bbox: BoundingBoxSchema,
});
export type FindingBoundingBoxRef = z.infer<typeof FindingBoundingBoxRefSchema>;

// ─── One UX Finding ───────────────────────────────────────────────────────────
// This is the atomic output unit. Each agent produces an array of these.

export const FindingSchema = z.object({
  id: z
    .string()
    .describe("Short unique ID for this finding, e.g. 'nielsen-001'"),

  region: z
    .string()
    .describe("Where on screen: use the Grounding Agent's region names, e.g. 'top nav bar'"),

  elementRefs: z
    .array(z.string())
    .min(1)
    .describe(
      "One or more Grounding elementId values where this issue appears. " +
      "Use IDs exactly as provided by the Grounding Agent."
    ),

  bboxRefs: z
    .array(FindingBoundingBoxRefSchema)
    .default([])
    .describe(
      "Optional issue-specific bounding boxes. Use when the issue spans an area not captured by a single grounded element."
    ),

  issue: z
    .string()
    .describe("Specific, factual description of the problem. What is wrong, not why."),

  principle: z
    .string()
    .describe("Exact name of the Nielsen heuristic violated, e.g. 'Visibility of System Status'"),

  why: z
    .string()
    .describe("One sentence: why this principle applies to this specific issue"),

  severity: SeveritySchema,

  fix: z
    .string()
    .describe("Concrete actionable fix — what to change and how, specific to this screen"),

  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("How confident: 0.9 = certain, 0.7 = likely, below 0.6 do not include"),
});
export type Finding = z.infer<typeof FindingSchema>;

// ─── Grounding Agent Output ───────────────────────────────────────────────────
// The structured inventory of what is on the screen.
// The Nielsen agent reads this instead of re-discovering the UI itself.

export const GroundingOutputSchema = z.object({
  screenType: z
    .string()
    .describe("What kind of screen: dashboard, form, modal, landing page, settings, etc."),

  layout: z
    .string()
    .describe("Structural overview: how is the screen laid out? Sidebar? Card grid? Single column?"),

  elements: z
    .array(
      z.object({
        elementId: z
          .string()
          .describe(
            "Stable ID for this element, unique within the run. Format: screen{n}-el-{index}. " +
            "Every finding must reference one or more of these IDs."
          ),
        screenIndex: z
          .number()
          .int()
          .min(0)
          .describe("Zero-based screenshot index this element belongs to"),
        region: z
          .string()
          .describe("Location name e.g. 'top navigation bar', 'hero CTA button', 'left sidebar'"),
        type: z
          .string()
          .describe("Element type: button, input, heading, image, nav, card, table, etc."),
        description: z.string().describe("What it looks like and what it does"),
        text: z.string().nullable().describe("Visible text on the element, if any"),
        interactive: z.boolean().describe("Can the user click, tap, or type here?"),
        bbox: BoundingBoxSchema.describe(
          "Normalized bounding box for this visible element in its screenshot"
        ),
      })
    )
    .describe("Complete list of every UI element visible on screen"),

  primaryActions: z
    .array(z.string())
    .describe("The main things a user can DO on this screen — the key CTAs"),

  observations: z
    .array(z.string())
    .describe(
      "Factual first-impression notes for downstream agents. " +
      "Facts only, no judgments yet. E.g. 'submit button is very small', " +
      "'no visible error states', 'three CTAs compete above the fold'"
    ),
});
export type GroundingOutput = z.infer<typeof GroundingOutputSchema>;

// ─── Nielsen Agent Output ─────────────────────────────────────────────────────

export const NielsenOutputSchema = z.object({
  findings: z.array(FindingSchema),

  summary: z
    .string()
    .describe("2-3 sentence overall usability assessment of this screen"),

  coverageNote: z
    .string()
    .describe("What you checked, what was unclear, any limitations in this analysis"),
});
export type NielsenOutput = z.infer<typeof NielsenOutputSchema>;

// ─── Accessibility Agent Output ───────────────────────────────────────────────
// Uses the same FindingSchema (id, region, issue, principle, severity, fix, confidence)
// but the principle field will contain a WCAG POUR principle name instead of a Nielsen one.

export const AccessibilityOutputSchema = z.object({
  findings: z.array(
    FindingSchema.extend({
      principle: z
        .string()
        .describe(
          "The WCAG POUR principle violated: 'Perceivable', 'Operable', 'Understandable', or 'Robust'"
        ),
      wcagCriteria: z
        .string()
        .nullable()
        .describe("The specific WCAG criterion if known, e.g. '1.1.1 Non-text Content'"),
    })
  ),

  summary: z
    .string()
    .describe("2-3 sentence overall accessibility assessment of this screen"),

  coverageNote: z
    .string()
    .describe("What you checked and what could not be determined from a static screenshot alone"),
});
export type AccessibilityOutput = z.infer<typeof AccessibilityOutputSchema>;
// ─── Cognitive Interaction Agent Output ───────────────────────────────────────

export const CognitiveInteractionOutputSchema = z.object({
  findings: z.array(
    FindingSchema.extend({
      principle: z
        .string()
        .describe("Exact name of the Cognitive Interaction Law violated, e.g. 'Fitts\\'s Law' or 'Hick\\'s Law'"),
    })
  ),

  summary: z
    .string()
    .describe("2-3 sentence overall assessment of mental load, friction, and interaction physics on this screen"),

  coverageNote: z
    .string()
    .describe("What you checked and what interaction details could not be determined from a static image"),
});
export type CognitiveInteractionOutput = z.infer<typeof CognitiveInteractionOutputSchema>;

// ─── Content Microcopy Agent Output ───────────────────────────────────────────

export const ContentMicrocopyOutputSchema = z.object({
  findings: z.array(
    FindingSchema.extend({
      principle: z
        .string()
        .describe("Exact name of the Content Principle violated, e.g. 'Clarity over cleverness'"),
    })
  ),

  summary: z
    .string()
    .describe("2-3 sentence overall assessment of text clarity, tone, and labeling on this screen"),

  coverageNote: z
    .string()
    .describe("What you checked and any limitations (e.g., hidden tooltips, unrendered states)"),
});
export type ContentMicrocopyOutput = z.infer<typeof ContentMicrocopyOutputSchema>;

// ─── Gestalt Agent Output ─────────────────────────────────────────────────────

export const GestaltOutputSchema = z.object({
  findings: z.array(
    FindingSchema.extend({
      principle: z
        .string()
        .describe("Exact name of the Gestalt Principle violated, e.g. 'Proximity', 'Similarity', or 'Common Region'"),
    })
  ),

  summary: z
    .string()
    .describe("2-3 sentence overall assessment of structural grouping and visual relationships"),

  coverageNote: z
    .string()
    .describe("What you checked and limitations in determining structural intent from a flat image"),
});
export type GestaltOutput = z.infer<typeof GestaltOutputSchema>;

// ─── Visual Design Agent Output ───────────────────────────────────────────────

export const VisualDesignOutputSchema = z.object({
  findings: z.array(
    FindingSchema.extend({
      principle: z
        .string()
        .describe("Exact name of the Visual Design Principle violated, e.g. 'Visual hierarchy', 'Alignment', or 'White space'"),
    })
  ),

  summary: z
    .string()
    .describe("2-3 sentence overall assessment of aesthetics, styling, and visual polish"),

  coverageNote: z
    .string()
    .describe("What you checked and limitations (e.g., hover states, animations not visible)"),
});
export type VisualDesignOutput = z.infer<typeof VisualDesignOutputSchema>;

// ─── Synthesis Agent Output ───────────────────────────────────────────────────
// A single deduplicated, cross-agent finding. Multiple raw findings that describe
// the same root problem in the same region are merged into one canonical entry.

export const SynthesizedFindingSchema = FindingSchema.extend({
  sources: z
    .array(z.string())
    .describe(
      "Which specialist agents flagged this — e.g. ['nielsen', 'gestalt', 'visualDesign']. " +
      "At least one entry always present."
    ),

  mergedFrom: z
    .array(z.string())
    .describe(
      "The original finding IDs (e.g. 'nielsen-002', 'gestalt-001') that were collapsed " +
      "into this canonical finding. One entry = no merge happened."
    ),

  agreementCount: z
    .number()
    .int()
    .min(1)
    .describe(
      "How many independent agents flagged this same root problem. " +
      "Used to escalate severity: 3+ agents → escalate one level."
    ),
  acceptanceCriteria: z
    .array(z.string())
    .default([])
    .describe("Testable acceptance criteria for the recommended fix, when requested."),

  requirementTraceability: z
    .string()
    .nullable()
    .default(null)
    .describe("Requirement or source-input traceability for this finding, when requested."),

  wcagCriteria: z
    .string()
    .nullable()
    .default(null)
    .describe("Specific WCAG criterion connected to this finding, when requested and applicable."),

  businessImpact: z
    .string()
    .nullable()
    .default(null)
    .describe("Business impact estimate for this finding, when requested."),

  a11yImpact: z
    .string()
    .nullable()
    .default(null)
    .describe("Accessibility impact summary for this finding, when requested and applicable."),
  // bboxRefs: z.array(z.any()).optional(),
});
export type SynthesizedFinding = z.infer<typeof SynthesizedFindingSchema>;

export const SynthesisOutputSchema = z.object({
  findings: z
    .array(SynthesizedFindingSchema)
    .describe(
      "Deduplicated, prioritized list of canonical UX findings. " +
      "Ordered P0 → P1 → P2, then by agreementCount descending."
    ),

  totalRawFindings: z
    .number()
    .int()
    .describe("Total number of raw findings received across all 6 agents before deduplication."),

  deduplicationNote: z
    .string()
    .describe(
      "Brief summary of what was merged and why — e.g. " +
      "'3 clusters merged: cramped layout flagged by Gestalt+Nielsen+VisualDesign; " +
      "missing alt text by Accessibility+Nielsen.'"
    ),
});
export type SynthesisOutput = z.infer<typeof SynthesisOutputSchema>;

// ─── Bounding Box Review Output ───────────────────────────────────────────────
// Post-synthesis artifact for human review. This layer maps canonical UX issues
// onto reviewable geometry and carries enough provenance to audit bad boxes.

export const HumanReviewStatusSchema = z.enum([
  "pending",
  "accepted",
  "rejected",
  "needs_changes",
]);
export type HumanReviewStatus = z.infer<typeof HumanReviewStatusSchema>;

export const ReviewBoxSchema = z.object({
  screenIndex: z
    .number()
    .int()
    .min(0)
    .describe("Zero-based screenshot index this box belongs to"),
  bbox: BoundingBoxSchema.describe("Normalized box selected for human review"),
  label: z.string().describe("Short label to draw on the annotated screenshot"),
  sourceType: GeometrySourceTypeSchema.describe("Source of the selected box"),
  sourceConfidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence in this selected box"),
  sourceCandidateId: z
    .string()
    .nullable()
    .describe("Geometry candidate ID when this box was selected from measured candidates"),
  sourceElementId: z
    .string()
    .nullable()
    .describe("Grounding element ID when this box was selected from grounded elements"),
  sourceEvidence: z
    .string()
    .describe("Compact explanation of why this box was selected"),
});
export type ReviewBox = z.infer<typeof ReviewBoxSchema>;

export const BoundingBoxReviewFindingSchema = z.object({
  findingId: z.string().describe("ID of the synthesized finding being boxed"),
  severity: SeveritySchema,
  region: z.string().describe("Region label from the synthesized finding"),
  issue: z.string().describe("Issue text shown to the human reviewer"),
  fix: z.string().describe("Recommended fix shown to the human reviewer"),
  selectedElementRefs: z
    .array(z.string())
    .describe("Grounding elements selected as geometry evidence"),
  selectedCandidateIds: z
    .array(z.string())
    .describe("Measured geometry candidates selected as evidence"),
  boxes: z
    .array(ReviewBoxSchema)
    .describe("One or more boxes to render for this human-review finding"),
  geometryConfidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Overall confidence that the selected boxes represent this issue"),
  humanReviewStatus: HumanReviewStatusSchema.describe("Initial status should be pending"),
  ambiguityNote: z
    .string()
    .describe("Short note describing uncertainty, or 'None' if the geometry is clear"),
});
export type BoundingBoxReviewFinding = z.infer<typeof BoundingBoxReviewFindingSchema>;

export const BoundingBoxReviewOutputSchema = z.object({
  findings: z
    .array(BoundingBoxReviewFindingSchema)
    .describe("Review-ready findings with selected boxes and pending human review status"),
  summary: z.string().describe("Short summary of geometry coverage and unresolved cases"),
  coverageNote: z.string().describe("Notes about candidate quality, fallbacks, and limitations"),
});
export type BoundingBoxReviewOutput = z.infer<typeof BoundingBoxReviewOutputSchema>;