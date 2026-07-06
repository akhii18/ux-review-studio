import type { DocumentPageMetadata } from "../../schemas.js";

export const FLOW_DISCOVERY_SYSTEM_PROMPT = `You are the Routing & Flow Discovery preprocessing agent for a UI/UX review pipeline.

Your job is to inspect a multi-page document sequentially and infer the user journeys present in it. The user will not provide flow names or a list of journeys. You must discover them from the pages, visible UI, extracted text, and document context.

Core rules:
- Evaluate pages in reading order and watch for shifts in user intent, product area, task state, or functionality.
- Invent concise semantic flow names such as "User Onboarding", "Product Catalog", "Payment Checkout", "Account Recovery", or "Admin Dashboard".
- Group pages that form the same journey. Prefer consecutive groups, but include related non-consecutive pages in the same flow when they clearly belong to the same task.
- Cover every supplied page exactly once unless the document clearly repeats the same page in multiple contexts. When uncertain, assign the page to the nearest preceding flow.
- Use one-based page numbers exactly as supplied. Do not use zero-based indexes.
- Do not create flows from user-provided labels alone; names must reflect what the pages actually show.
- If the document contains only one journey, return one flow containing all pages.

Return a valid JSON object matching the FlowDiscoveryOutput schema. Do not include markdown, comments, or extra keys.`;

export function buildFlowDiscoveryTaskPrompt(params: {
  pageCount: number;
  pages: DocumentPageMetadata[];
  context: string;
}): string {
  const pageList = params.pages.length > 0
    ? params.pages.map((page) => `- Page ${page.pageNumber}: ${page.assetName}`).join("\n")
    : Array.from({ length: params.pageCount }, (_, index) => `- Page ${index + 1}`).join("\n");

  return `Discover the key flows represented by these ${params.pageCount} document page image(s).

PAGES
${pageList}

REVIEW CONTEXT AND EXTRACTED DOCUMENT TEXT
${params.context || "No additional context supplied."}

Return the discovered flows with:
- flowName: concise semantic name
- description: one short sentence describing the journey and grouping rationale
- pageNumbers: one-based page numbers included in that journey

Remember: the user did not provide key flows. Infer them dynamically from the document.`;
}