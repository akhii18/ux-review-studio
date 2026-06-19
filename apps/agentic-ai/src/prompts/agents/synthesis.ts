import {
  PRINCIPLE_FAMILY_KEYS,
  PRINCIPLE_FAMILY_PROMPTS,
  PRINCIPLE_FAMILY_DISPLAY_NAMES,
  extractPrincipleNames,
  type PrincipleFamilyKey,
} from "../../principles.js";
import type { SelectedPrinciples } from "../../state.js";

function normalizeSelectionValue(value: true | string[] | undefined): true | string[] | null {
  if (value === true) return true;
  if (!Array.isArray(value)) return null;

  const cleaned = value
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (cleaned.length === 0) return null;
  return Array.from(new Set(cleaned));
}

function resolveSelectedFamilies(selectedPrinciples?: SelectedPrinciples | null): PrincipleFamilyKey[] {
  if (!selectedPrinciples || Object.keys(selectedPrinciples).length === 0) {
    return [...PRINCIPLE_FAMILY_KEYS];
  }

  const selectedFamilies = PRINCIPLE_FAMILY_KEYS.filter((family) =>
    normalizeSelectionValue(selectedPrinciples[family]) !== null
  );

  return selectedFamilies.length > 0 ? selectedFamilies : [...PRINCIPLE_FAMILY_KEYS];
}

export function resolveAllowedPrincipleNames(
  selectedPrinciples?: SelectedPrinciples | null
): string[] | null {
  if (!selectedPrinciples || Object.keys(selectedPrinciples).length === 0) {
    return null;
  }

  const selectedFamilies = resolveSelectedFamilies(selectedPrinciples);
  const allowed = new Set<string>();

  for (const family of selectedFamilies) {
    const value = normalizeSelectionValue(selectedPrinciples[family]);
    if (value === true) {
      for (const name of extractPrincipleNames(PRINCIPLE_FAMILY_PROMPTS[family])) {
        allowed.add(name);
      }
      continue;
    }

    if (Array.isArray(value)) {
      for (const name of value) {
        allowed.add(name);
      }
    }
  }

  return allowed.size > 0 ? Array.from(allowed) : null;
}

function buildSelectedPrincipleBlocks(selectedPrinciples?: SelectedPrinciples | null): string {
  const selectedFamilies = resolveSelectedFamilies(selectedPrinciples);
  return selectedFamilies.map((family) => PRINCIPLE_FAMILY_PROMPTS[family]).join("\n\n");
}

export function buildSynthesisSystemPrompt(params?: {
  selectedPrinciples?: SelectedPrinciples | null;
}): string {
  const selectedPrinciples = params?.selectedPrinciples ?? null;
  const principleBlocks = buildSelectedPrincipleBlocks(selectedPrinciples);

  return `You are the Synthesis & Deduplication agent in a multi-agent UX audit system.
Six specialist agents have independently reviewed the same UI screenshot(s).
Each produced findings using their own lens (usability, accessibility, cognitive, content, gestalt, visual design).
Your job is to collapse their overlapping observations into a single, clean, authoritative finding list.

${principleBlocks}

═══════════════════════════════════════════════════════════
DEDUPLICATION RULES  (apply in order)
═══════════════════════════════════════════════════════════

RULE 1 — GROUPING
  Two findings are duplicates if they describe the SAME ROOT PROBLEM
  on the SAME GROUNDED ELEMENT(S) or highly overlapping issue-level bounding boxes,
  even when they cite different principles.
  If elementRefs are sparse, use same-region matching as a fallback.
  Example: Nielsen flags "Aesthetic and Minimalist Design" for a crowded
  sidebar; Gestalt flags "Proximity" for the same crowded sidebar.
  → Merge into one finding.

  Two findings are NOT duplicates when:
  • They occur in clearly different regions (e.g. top nav vs. footer)
  • They describe different root problems that happen to share a region
    (e.g. low contrast AND missing alt text are separate issues)

RULE 2 — MERGING
  When merging a group of duplicates into one canonical finding:
  • id:            Assign a new canonical ID: "synth-001", "synth-002", …
  • region:        Use the most specific region name from the group
  • elementRefs:   Union all grounded element IDs from the merged findings; remove duplicates
  • bboxRefs:      Keep issue-level boxes when present; deduplicate exact matches
  • issue:         Write the most complete, precise issue description
  • principle:     Use the most directly applicable principle name
  • why:           Write one clear sentence combining the group's reasoning
  • fix:           Use the most actionable fix from the group
  • confidence:    Average the group's confidence values, then add +0.05
                   for each additional source beyond the first (cap at 0.97)
  • sources:       List all agent names that contributed, e.g. ["nielsen", "gestalt"]
  • mergedFrom:    List all original finding IDs that were collapsed, e.g. ["nielsen-002", "gestalt-001"]
  • agreementCount: Number of agents that flagged this root problem

RULE 3 — SEVERITY ESCALATION
  • If agreementCount >= 3: escalate severity one level (P2→P1, P1→P0, P0 stays P0)
  • Otherwise:             keep the highest severity from the group

RULE 4 — QUALITY FILTER
  Drop any finding with confidence < 0.60 AFTER merging.
  A finding surviving from only one agent with confidence < 0.65 should
  be scrutinized — include it only if the issue is clear and concrete.

RULE 5 — OUTPUT ORDER
  Sort the final list: P0 first, then P1, then P2.
  Within each severity tier, sort by agreementCount descending (most-agreed first).

═══════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════
Return a valid JSON object matching the SynthesisOutput schema.
Every field is required. Do not invent findings — only work from what was provided.`;
}

export function buildSynthesisTaskPrompt(params: {
  totalRawFindings: number;
  activeAgentCount: number;
  findingsBlock: string;
  groundingElementBlock: string;
  selectedPrinciples?: SelectedPrinciples | null;
  allowedPrincipleNames?: string[] | null;
}): string {
  const {
    totalRawFindings,
    activeAgentCount,
    findingsBlock,
    groundingElementBlock,
    selectedPrinciples,
    allowedPrincipleNames,
  } = params;

  const selectedFamilies = resolveSelectedFamilies(selectedPrinciples);
  const selectedFamiliesSummary = selectedFamilies
    .map((family) => PRINCIPLE_FAMILY_DISPLAY_NAMES[family])
    .join(", ");

  const allowedPrinciplesSection = allowedPrincipleNames && allowedPrincipleNames.length > 0
    ? `
════════════════════════════════════════
ALLOWED PRINCIPLES (STRICT)
════════════════════════════════════════

Only use principle values from this list in the final output:
${allowedPrincipleNames.map((name) => `- ${name}`).join("\n")}
`
    : "";

  return `
  You have received ${totalRawFindings} raw UX findings from ${activeAgentCount} specialist agents.
Apply all deduplication rules and return a single merged, prioritized list.
Selected principle families for this run: ${selectedFamiliesSummary}.

════════════════════════════════════════
RAW FINDINGS (all agents combined)
════════════════════════════════════════

${findingsBlock}

════════════════════════════════════════
VALID GROUNDED ELEMENT REFERENCES
════════════════════════════════════════

${groundingElementBlock}
${allowedPrinciplesSection}

════════════════════════════════════════
Now synthesize these into the cleanest possible finding list.
Remember: quality over quantity. One clear finding beats three overlapping ones.
    `.trim();
}
