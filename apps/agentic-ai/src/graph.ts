/**
 * graph.ts
 * ---------
 * Wires the agents into a LangGraph graph and compiles it.
 *
 * Flow:
 *   START → grounding → usability               \
 *                       → accessibility            \
 *                       → consistency (cognitive)   ├→ synthesis → END
 *                       → contentUX (microcopy)    /
 *                       → risk (gestalt)           /
 *                       → recommendations (visual)/
 *
 *   All 6 UX review agents run in parallel after grounding,
 *   then fan-in to synthesis which deduplicates and merges.
 *
 * Note: Internal node names are unchanged for backward compatibility.
 * New display names: cognitiveInteraction=Consistency, contentMicrocopy=Content UX,
 * gestalt=Risk, visualDesign=Recommendations.
 */

import { StateGraph, START, END } from "@langchain/langgraph";
import { GraphState } from "./state.js";
import { groundingAgent } from "./agents/grounding.js";
import { usabilityAgent } from "./agents/usability.js";
import { accessibilityAgent } from "./agents/accessibility.js";
import { cognitiveInteractionAgent } from "./agents/cognitiveInteraction.js";
import { contentMicrocopyAgent } from "./agents/contentMicrocopy.js";
import { gestaltAgent } from "./agents/gestalt.js";
import { visualDesignAgent } from "./agents/visualDesign.js";
import { synthesisAgent } from "./agents/synthesis.js";
import { outputEnrichmentAgent } from "./agents/outputEnrichment.js";
import { flowDiscoveryAgent } from "./agents/flowDiscovery.js";

export const REVIEW_AGENT_NAMES = [
  "usability",
  "accessibility",
  "cognitiveInteraction",
  "contentMicrocopy",
  "gestalt",
  "visualDesign",
] as const;

export type ReviewAgentName = typeof REVIEW_AGENT_NAMES[number];

// ─── Build & Compile ───────────────────────────────────────────────────────

export function buildGraph(options?: { selectedAgents?: ReviewAgentName[]; keyFlowsOnly?: boolean }) {
  const requested = options?.selectedAgents ?? [...REVIEW_AGENT_NAMES];
  const enabledAgents = REVIEW_AGENT_NAMES.filter((name) => requested.includes(name));
  const keyFlowsOnly = options?.keyFlowsOnly === true;

  const graph = new StateGraph(GraphState)
    // Register always-on nodes.
    .addNode("grounding",            groundingAgent)
    .addNode("synthesis",            synthesisAgent)
    .addNode("outputEnrichment",      outputEnrichmentAgent);

  // LangGraph's compile-time node-name inference is strict for dynamic graphs.
  // We build edges dynamically at runtime based on user selection.
  const g = graph as any;

  // Wire edges:
  if (keyFlowsOnly) {
    g.addNode("flowDiscovery", flowDiscoveryAgent);
    g.addEdge(START, "flowDiscovery");
    g.addEdge("flowDiscovery", "grounding");
  } else {
    g.addEdge(START, "grounding");
  }

  // Register and wire only selected reviewer nodes.
  if (enabledAgents.includes("usability")) {
    g.addNode("usability", usabilityAgent);
    g.addEdge("grounding", "usability");
    g.addEdge("usability", "synthesis");
  }

  if (enabledAgents.includes("accessibility")) {
    g.addNode("accessibility", accessibilityAgent);
    g.addEdge("grounding", "accessibility");
    g.addEdge("accessibility", "synthesis");
  }

  if (enabledAgents.includes("cognitiveInteraction")) {
    g.addNode("cognitiveInteraction", cognitiveInteractionAgent);
    g.addEdge("grounding", "cognitiveInteraction");
    g.addEdge("cognitiveInteraction", "synthesis");
  }

  if (enabledAgents.includes("contentMicrocopy")) {
    g.addNode("contentMicrocopy", contentMicrocopyAgent);
    g.addEdge("grounding", "contentMicrocopy");
    g.addEdge("contentMicrocopy", "synthesis");
  }

  if (enabledAgents.includes("gestalt")) {
    g.addNode("gestalt", gestaltAgent);
    g.addEdge("grounding", "gestalt");
    g.addEdge("gestalt", "synthesis");
  }

  if (enabledAgents.includes("visualDesign")) {
    g.addNode("visualDesign", visualDesignAgent);
    g.addEdge("grounding", "visualDesign");
    g.addEdge("visualDesign", "synthesis");
  }

  // If no reviewer is selected, still run synthesis to return a valid empty output.
  if (enabledAgents.length === 0) {
    g.addEdge("grounding", "synthesis");
  }

  g.addEdge("synthesis", "outputEnrichment");
  g.addEdge("outputEnrichment", END);

  return g.compile();
}

// ─── Visualizer ────────────────────────────────────────────────────────────

async function printGraph() {
  const compiled = buildGraph();
  
  // 1. Await the underlying graph structure using the new async method
  const drawableGraph = await compiled.getGraphAsync();
  
  // 2. Draw the Mermaid string from that resolved graph
  const mermaid = drawableGraph.drawMermaid();

  console.log("\n╔════════════════════════════════════════╗");
  console.log("║    UXM Demo — 6-Agent Graph (Mermaid)  ║");
  console.log("╚════════════════════════════════════════╝\n");
  console.log(mermaid);
  console.log("\n→ Paste the above at https://mermaid.live to render it\n");
}

// Run when called directly via `npm run graph`
// printGraph();