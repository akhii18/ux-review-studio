import {
  SUBCATEGORY_KEYS,
  SUBCATEGORY_PROMPTS,
  SUBCATEGORY_DISPLAY_NAMES,
  SUBCATEGORY_CATEGORIES,
  type SubcategoryKey,
} from "../../principles.js";
import type { SelectedPrinciples } from "../../state.js";

/**
 * Returns the list of active subcategory keys from the user's selection.
 * Falls back to ALL subcategory keys if nothing is selected.
 */
function resolveSelectedSubcategories(selectedPrinciples?: SelectedPrinciples | null): SubcategoryKey[] {
  if (!selectedPrinciples || Object.keys(selectedPrinciples).length === 0) {
    return [...SUBCATEGORY_KEYS];
  }

  const active = SUBCATEGORY_KEYS.filter((k) => selectedPrinciples[k] === true);
  return active.length > 0 ? active : [...SUBCATEGORY_KEYS];
}

export function resolveAllowedPrincipleNames(
  selectedPrinciples?: SelectedPrinciples | null
): string[] | null {
  // With SubcategoryKey-based selection, all principles in selected subcategories are allowed.
  // Return null to mean "no restriction" when nothing is selected.
  if (!selectedPrinciples || Object.keys(selectedPrinciples).length === 0) {
    return null;
  }
  // When specific subcategories are chosen, the principle names are embedded in the
  // subcategory prompts. We return null here to indicate no strict name filter — the
  // synthesis agent simply uses whatever principles appear in the selected blocks.
  return null;
}

function buildSelectedPrincipleBlocks(selectedPrinciples?: SelectedPrinciples | null): string {
  const active = resolveSelectedSubcategories(selectedPrinciples);
  return active.map((k) => SUBCATEGORY_PROMPTS[k]).join("\n\n");
}

export function buildSynthesisSystemPrompt(params?: {
  selectedPrinciples?: SelectedPrinciples | null;
}): string {
  const selectedPrinciples = params?.selectedPrinciples ?? null;
  const principleBlocks = buildSelectedPrincipleBlocks(selectedPrinciples);

  return `You are the Synthesis & Deduplication agent in a multi-agent UX audit system.
Six specialist agents have independently reviewed the same UI screenshot(s).
Each produced findings using their own lens (usability, accessibility, consistency, content UX, risk, recommendations).
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
  Example: Usability flags "Visibility of system status" for a missing loader;
  Risk flags "Destructive Action Safety" for the same button with no feedback.
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
  • sources:       List all agent names that contributed, e.g. ["usability", "risk"]
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
  } = params;

  const active = resolveSelectedSubcategories(selectedPrinciples);
  // Group active subcategories by category for the summary line
  const categoryGroups = new Map<string, string[]>();
  for (const k of active) {
    const cat = SUBCATEGORY_CATEGORIES[k];
    if (!categoryGroups.has(cat)) categoryGroups.set(cat, []);
    categoryGroups.get(cat)!.push(SUBCATEGORY_DISPLAY_NAMES[k]);
  }
  const selectedSummary = Array.from(categoryGroups.entries())
    .map(([cat, names]) => `${cat} (${names.join(", ")})`)
    .join("; ");

  return `
  You have received ${totalRawFindings} raw UX findings from ${activeAgentCount} specialist agents.
Apply all deduplication rules and return a single merged, prioritized list.
Selected subcategories for this run: ${selectedSummary}.

════════════════════════════════════════
RAW FINDINGS (all agents combined)
════════════════════════════════════════

${findingsBlock}

════════════════════════════════════════
VALID GROUNDED ELEMENT REFERENCES
════════════════════════════════════════

${groundingElementBlock}

════════════════════════════════════════
Now synthesize these into the cleanest possible finding list.
Remember: quality over quantity. One clear finding beats three overlapping ones.
    `.trim();
}
