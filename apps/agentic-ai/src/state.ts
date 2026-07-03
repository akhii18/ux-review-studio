/**
 * state.ts
 * ---------
 * The shared state object that flows through the graph.
 *
 * How LangGraph state works:
 * - Every node receives the FULL state and returns a PARTIAL update
 * - The reducer decides how each field is merged
 * - `replace` means the new value simply overwrites the old one
 * - Each node only writes to its own fields — no conflicts
 *
 * Data flow in our 7-agent graph:
 *
 * run.ts sets:              screenshots, context, selectedPrinciples
 * grounding writes:         groundingOutput
 * * [The following 6 run in PARALLEL after grounding completes]
 * usability reads:          screenshots + groundingOutput  →  writes nielsenOutput
 * accessibility reads:      screenshots + groundingOutput  →  writes accessibilityOutput
 * consistency (cognitive):  screenshots + groundingOutput  →  writes cognitiveInteractionOutput
 * contentUX (microcopy):    screenshots + groundingOutput  →  writes contentMicrocopyOutput
 * risk (gestalt):           screenshots + groundingOutput  →  writes gestaltOutput
 * recommendations (visual): screenshots + groundingOutput  →  writes visualDesignOutput
 */

import { Annotation } from "@langchain/langgraph";
import type { ReviewDepth } from "./llm.js";
import type { SubcategoryKey } from "./principles.js";
import type { 
  GroundingOutput, 
  NielsenOutput, 
  AccessibilityOutput,
  CognitiveInteractionOutput,
  ContentMicrocopyOutput,
  GestaltOutput,
  VisualDesignOutput,
  SynthesisOutput,
  ScreenMetadata,
  GeometryOutput,
} from "./schemas.js";

// replace = new value always overwrites; safe because each field has one writer
const replace = <T>(_old: T, incoming: T): T => incoming;

/**
 * Maps each subcategory key to a boolean indicating whether the user
 * has selected it for the current review. Agents use this to determine
 * which principle blocks to inject into their system prompts.
 */
export type SelectedPrinciples = Partial<Record<SubcategoryKey, boolean>>;

export type FindingOutputOptionKey =
  | "recommendationsWithAcceptanceCriteria"
  | "linkedPrinciple"
  | "requirementTraceability"
  | "accessibilityImpactWcag"
  | "businessImpactEstimate";

export const GraphState = Annotation.Root({
  // ── Set once by run.ts, never changed ──────────────────────────────────────
  screenshots: Annotation<string[]>({
    reducer: replace,
    default: () => [],
  }),
  reviewDepth: Annotation<ReviewDepth>({
    reducer: replace,
    default: () => "standard",
  }),
  context: Annotation<string>({
    reducer: replace,
    default: () => "",
  }),
  selectedPrinciples: Annotation<SelectedPrinciples | null>({
    reducer: replace,
    default: () => null,
  }),
  findingMetadataOptions: Annotation<FindingOutputOptionKey[] | null>({
    reducer: replace,
    default: () => null,
  }),
  imagePaths: Annotation<string[]>({
    reducer: replace,
    default: () => [],
  }),
  screenMetadata: Annotation<ScreenMetadata[]>({
    reducer: replace,
    default: () => [],
  }),
  geometryOutput: Annotation<GeometryOutput | null>({
    reducer: replace,
    default: () => null,
  }),

  // ── Written by grounding agent, read by all review agents ──────────────────
  groundingOutput: Annotation<GroundingOutput | null>({
    reducer: replace,
    default: () => null,
  }),

  // ── Written by usability agent, read at the end ────────────────────────────
  nielsenOutput: Annotation<NielsenOutput | null>({
    reducer: replace,
    default: () => null,
  }),

  // ── Written by accessibility agent, read at the end ────────────────────────
  accessibilityOutput: Annotation<AccessibilityOutput | null>({
    reducer: replace,
    default: () => null,
  }),

  // ── Written by cognitiveInteraction agent, read at the end ─────────────────
  cognitiveInteractionOutput: Annotation<CognitiveInteractionOutput | null>({
    reducer: replace,
    default: () => null,
  }),

  // ── Written by contentMicrocopy agent, read at the end ─────────────────────
  contentMicrocopyOutput: Annotation<ContentMicrocopyOutput | null>({
    reducer: replace,
    default: () => null,
  }),

  // ── Written by gestalt agent, read at the end ──────────────────────────────
  gestaltOutput: Annotation<GestaltOutput | null>({
    reducer: replace,
    default: () => null,
  }),

  // ── Written by visualDesign agent, read at the end ─────────────────────────
  visualDesignOutput: Annotation<VisualDesignOutput | null>({
    reducer: replace,
    default: () => null,
  }),

  // ── Written by synthesis agent ───────────────────────────────────────
  // The clean, deduplicated output that all downstream steps should consume.
  // Raw per-agent outputs above are preserved for debugging / audit purposes.
  synthesisOutput: Annotation<SynthesisOutput | null>({
    reducer: replace,
    default: () => null,
  }),
});

export type GraphStateType = typeof GraphState.State;