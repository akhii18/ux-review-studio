/**
 * run.ts
 * -------
 * Entry point. Loads sample images, runs the 7-agent graph,
 * and prints the findings to the console.
 *
 * Agents: Grounding → [6 UX Review Agents] in parallel
 *
 * HOW TO USE:
 * 1. Set REVIEW_IMAGE_PATHS with comma-separated local file paths.
 * 2. Optionally set REVIEW_CONTEXT, REVIEW_SELECTED_AGENTS, REVIEW_SELECTED_PRINCIPLES_JSON.
 * 3. Run: npm start
 */

import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config();
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { buildGraph, type ReviewAgentName } from "./graph.js";
import type { GraphStateType, SelectedPrinciples } from "./state.js";
import {
  getScreenMetadata,
  writeHumanReviewArtifacts,
  writeAnnotatedScreenshots,
  type ScreenMetadata,
} from "./annotations.js";
import { extractGeometryFromScreens } from "./geometry/providers.js";
import { createLocalImageGeometryProvider } from "./geometry/localImage.js";
import type { 
  NielsenOutput, 
  AccessibilityOutput,
  CognitiveInteractionOutput,
  ContentMicrocopyOutput,
  GestaltOutput,
  VisualDesignOutput,
  SynthesisOutput,
} from "./schemas.js";

const REVIEW_AGENT_NAMES: ReviewAgentName[] = [
  "usability",
  "accessibility",
  "cognitiveInteraction",
  "contentMicrocopy",
  "gestalt",
  "visualDesign",
];

function parseCsv(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSelectedAgents(value?: string): ReviewAgentName[] {
  const requested = parseCsv(value);
  if (requested.length === 0) {
    return REVIEW_AGENT_NAMES;
  }

  return requested.filter((agent): agent is ReviewAgentName =>
    REVIEW_AGENT_NAMES.includes(agent as ReviewAgentName)
  );
}

function parseSelectedPrinciples(value?: string): SelectedPrinciples | null {
  if (!value?.trim()) return null;

  try {
    return JSON.parse(value) as SelectedPrinciples;
  } catch {
    throw new Error("Invalid REVIEW_SELECTED_PRINCIPLES_JSON. Provide valid JSON.");
  }
}

// ─── Your Sample Images ───────────────────────────────────────────────────
// Paths are relative to the project root (where you run `npm start`)
// Supported: .png, .jpg, .jpeg, .webp

const IMAGE_PATHS = parseCsv(process.env.REVIEW_IMAGE_PATHS);

if (IMAGE_PATHS.length === 0) {
  throw new Error("Missing REVIEW_IMAGE_PATHS. Provide comma-separated local image paths.");
}

// ─── Your Context ──────────────────────────────────────────────────────────
// Tell the agents what they are reviewing. The more specific, the better.

const REVIEW_CONTEXT = (process.env.REVIEW_CONTEXT ?? "").trim() ||
  "Analyze the uploaded UI assets against selected UX and accessibility principles.";

// ─── Agent Selection ───────────────────────────────────────────────────────
// Pick a subset to run only those reviewers, or include all 6 for a full review.

const SELECTED_REVIEW_AGENTS: ReviewAgentName[] = parseSelectedAgents(process.env.REVIEW_SELECTED_AGENTS);

// Optional principle filter for synthesis.
// - null: all principle families are available (backward-compatible default)
// - set a family to true: allow the full family
// - set a family to a string[]: allow only those named principles
const SELECTED_PRINCIPLES: SelectedPrinciples | null = parseSelectedPrinciples(
  process.env.REVIEW_SELECTED_PRINCIPLES_JSON
);

// ─── Run Output ──────────────────────────────────────────────────────────────
// Each run writes a timestamped JSON file here for later comparison / analysis.

const OUTPUT_DIR = "outputs";
const OUTPUT_SCHEMA_VERSION = "2.0.0";

// ─── Image Loader ──────────────────────────────────────────────────────────

function loadImage(filePath: string): string {
  if (!existsSync(filePath)) {
    throw new Error(
      `Image not found: "${filePath}"\n` +
      `Place your screenshots in the samples/ folder and check the IMAGE_PATHS array in run.ts`
    );
  }

  const ext = filePath.split(".").pop()?.toLowerCase() ?? "png";
  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };
  const mime = mimeMap[ext] ?? "image/png";
  const base64 = readFileSync(filePath).toString("base64");

  return `data:${mime};base64,${base64}`;
}

// ─── Output Saver ────────────────────────────────────────────────────────────

function saveFinalState(params: {
  finalState: GraphStateType;
  runStamp: string;
  imagePaths: string[];
  screenMetadata: ScreenMetadata[];
  annotatedImagePaths: string[];
  issueReviewJsonPath: string;
}): string {
  const { finalState, runStamp, imagePaths, screenMetadata, annotatedImagePaths, issueReviewJsonPath } = params;
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const outputPath = `${OUTPUT_DIR}/final-state-${runStamp}.json`;
  const output = {
    metadata: {
      savedAt: new Date().toISOString(),
      schemaVersion: OUTPUT_SCHEMA_VERSION,
      imagePaths,
      imageCount: imagePaths.length,
      screenMetadata,
      annotatedImagePaths,
      issueReviewJsonPath,
      selectedAgents: SELECTED_REVIEW_AGENTS,
      selectedPrinciples: SELECTED_PRINCIPLES,
    },
    finalState: {
      ...finalState,
      screenshots: imagePaths,
    },
  };

  writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
  return outputPath;
}

// ─── Universal Report Printer ──────────────────────────────────────────────
// Handles output from all 6 agents smoothly since they share the same base schema

function printAgentReport(title: string, output: any) {
  if (!output || !output.findings) {
    console.error(`\nNo output returned for ${title} — check logs for errors.`);
    return;
  }

  const P0 = output.findings.filter((f: any) => f.severity === "P0");
  const P1 = output.findings.filter((f: any) => f.severity === "P1");
  const P2 = output.findings.filter((f: any) => f.severity === "P2");

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log(`║   ${title.padEnd(50)} ║`);
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`\nSummary: ${output.summary}\n`);
  console.log(`Findings: ${output.findings.length} total  |  P0: ${P0.length}  P1: ${P1.length}  P2: ${P2.length}`);
  console.log("─".repeat(56));

  // Print in P0 → P1 → P2 order so blockers are always at the top
  [...P0, ...P1, ...P2].forEach((f: any) => {
    const badge = f.severity === "P0" ? "🔴 P0" : f.severity === "P1" ? "🟡 P1" : "🟢 P2";
    const wcag = f.wcagCriteria ? `  [WCAG ${f.wcagCriteria}]` : "";
    
    console.log(`\n${badge}  [${f.id}] ${f.region}${wcag}`);
    console.log(`   Principle : ${f.principle}`);
    console.log(`   Issue     : ${f.issue}`);
    console.log(`   Why       : ${f.why}`);
    console.log(`   Fix       : ${f.fix}`);
    console.log(`   Elements  : ${f.elementRefs.join(", ")}`);
    if (f.bboxRefs.length > 0) {
      console.log(`   Boxes     : ${f.bboxRefs.length} issue-level box(es)`);
    }
    console.log(`   Confidence: ${Math.round(f.confidence * 100)}%`);
  });

  console.log("\n" + "─".repeat(4));
  console.log(`Coverage note: ${output.coverageNote}`);
  console.log("");
}

// ─── Synthesis Report Printer ────────────────────────────────────────────────────

function printSynthesisReport(output: SynthesisOutput | null) {
  if (!output) {
    console.error("\nNo synthesis output — check logs for errors.");
    return;
  }

  const P0 = output.findings.filter((f) => f.severity === "P0");
  const P1 = output.findings.filter((f) => f.severity === "P1");
  const P2 = output.findings.filter((f) => f.severity === "P2");

  console.log("\n╔" + "═".repeat(62) + "╗");
  console.log(`║  ✨  SYNTHESIS REPORT — CANONICAL FINDINGS${"".padEnd(20)}║`);
  console.log("╚" + "═".repeat(62) + "╝");

  console.log(`\n  Raw findings in   : ${output.totalRawFindings}`);
  console.log(`  Canonical out     : ${output.findings.length}`);
  console.log(`  Reduction         : ${output.totalRawFindings - output.findings.length} duplicates merged`);
  console.log(`  Severity split    : P0=${P0.length}  P1=${P1.length}  P2=${P2.length}`);
  console.log(`\n  Dedup note: ${output.deduplicationNote}`);
  console.log("\n" + "─".repeat(64));

  // Print in the order the LLM returned (already sorted P0 → P1 → P2 by agreement)
  output.findings.forEach((f) => {
    const badge =
      f.severity === "P0" ? "🔴 P0" :
      f.severity === "P1" ? "🟡 P1" : "🟢 P2";
    const agreed = f.agreementCount > 1
      ? ` (✓ ${f.agreementCount} agents agreed)`
      : "";

    console.log(`\n${badge}  [${f.id}] ${f.region}${agreed}`);
    console.log(`   Principle  : ${f.principle}`);
    console.log(`   Issue      : ${f.issue}`);
    console.log(`   Why        : ${f.why}`);
    console.log(`   Fix        : ${f.fix}`);
    console.log(`   Elements   : ${f.elementRefs.join(", ")}`);
    if (f.bboxRefs.length > 0) {
      console.log(`   Boxes      : ${f.bboxRefs.length} issue-level box(es)`);
    }
    console.log(`   Confidence : ${Math.round(f.confidence * 100)}%`);
    console.log(`   Sources    : ${f.sources.join(" · ")}`);
    console.log(`   Merged IDs : ${f.mergedFrom.join(", ")}`);
  });

  console.log("\n" + "─".repeat(64));
  console.log("");
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║           UXM Co-Pilot — Agentic UX Review            ║");
  console.log("║   Grounding → [Selected Reviewers] → Synthesis        ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  console.log(`\nSelected reviewers: ${SELECTED_REVIEW_AGENTS.join(", ") || "none"}`);

  // Load images
  console.log(`\nLoading ${IMAGE_PATHS.length} screenshots...`);
  const screenshots = IMAGE_PATHS.map((p) => {
    const img = loadImage(p);
    console.log(`  ✓ ${p}`);
    return img;
  });

  const screenMetadata = await getScreenMetadata(IMAGE_PATHS);

  console.log(`\nExtracting screenshot geometry candidates...`);
  const geometryOutput = await extractGeometryFromScreens({
    screenMetadata,
    providers: [createLocalImageGeometryProvider()],
  });
  console.log(`  ✓ ${geometryOutput.candidates.length} geometry candidates`);
  geometryOutput.providerNotes.forEach((note) => console.log(`  • ${note}`));

  // Run the graph
  console.log(`\nRunning agents (${SELECTED_REVIEW_AGENTS.length} reviewer LLM calls in parallel)...`);
  const graph = buildGraph({ selectedAgents: SELECTED_REVIEW_AGENTS });

  const finalState = await graph.invoke({
    screenshots,
    imagePaths: IMAGE_PATHS,
    screenMetadata,
    geometryOutput,
    context: REVIEW_CONTEXT,
    selectedPrinciples: SELECTED_PRINCIPLES,
  });

  const runStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const annotationResult = await writeAnnotatedScreenshots({
    runStamp,
    outputRootDir: OUTPUT_DIR,
    imagePaths: IMAGE_PATHS,
    state: finalState,
    screenMetadata,
  });
  const reviewArtifacts = writeHumanReviewArtifacts({
    runStamp,
    outputRootDir: OUTPUT_DIR,
    imagePaths: IMAGE_PATHS,
    state: finalState,
    screenMetadata,
  });

  const outputPath = saveFinalState({
    finalState,
    runStamp,
    imagePaths: IMAGE_PATHS,
    screenMetadata,
    annotatedImagePaths: annotationResult.annotatedImagePaths,
    issueReviewJsonPath: reviewArtifacts.issueReviewJsonPath,
  });
  console.log(`\nSaved final state JSON: ${outputPath}`);
  console.log(`Saved review issues JSON: ${reviewArtifacts.issueReviewJsonPath}`);
  console.log(`Saved annotated images: ${annotationResult.annotatedImagePaths.length}`);
  annotationResult.annotatedImagePaths.forEach((path) => {
    console.log(`  ✓ ${path}`);
  });

  // Print grounding summary
  if (finalState.groundingOutput) {
    const g = finalState.groundingOutput;
    console.log(`\n[Grounding result]`);
    console.log(`  Screen type : ${g.screenType}`);
    console.log(`  Elements    : ${g.elements.length}`);
    console.log(`  Interactive : ${g.elements.filter((e: { interactive: boolean }) => e.interactive).length}`);
  }

  // Print raw per-agent findings (useful for debugging / audit)
  if (SELECTED_REVIEW_AGENTS.includes("usability")) {
    printAgentReport("Nielsen Usability Review", finalState.nielsenOutput);
  }
  if (SELECTED_REVIEW_AGENTS.includes("accessibility")) {
    printAgentReport("Accessibility Review (WCAG POUR)", finalState.accessibilityOutput);
  }
  if (SELECTED_REVIEW_AGENTS.includes("cognitiveInteraction")) {
    printAgentReport("Cognitive Interaction Review", finalState.cognitiveInteractionOutput);
  }
  if (SELECTED_REVIEW_AGENTS.includes("contentMicrocopy")) {
    printAgentReport("Content & Microcopy Review", finalState.contentMicrocopyOutput);
  }
  if (SELECTED_REVIEW_AGENTS.includes("gestalt")) {
    printAgentReport("Gestalt & Layout Logic Review", finalState.gestaltOutput);
  }
  if (SELECTED_REVIEW_AGENTS.includes("visualDesign")) {
    printAgentReport("Visual Design Review", finalState.visualDesignOutput);
  }

  // Print the clean canonical output from the synthesis agent
  printSynthesisReport(finalState.synthesisOutput);
}



main().catch((err) => {
  console.error("\nFatal error:", err.message ?? err);
  process.exit(1);
});