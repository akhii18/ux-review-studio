import OpenAI, { AzureOpenAI } from "openai";
import { randomUUID } from "node:crypto";
import { prisma } from "../../config/prisma";
import {
  INPUT_UNDERSTANDING_PROMPT,
  USABILITY_REVIEW_PROMPT,
  ACCESSIBILITY_REVIEW_PROMPT,
  CONTENT_UX_PROMPT,
  CONSISTENCY_PROMPT,
  BASIS_MAPPING_PROMPT,
  PRIORITIZATION_PROMPT,
  REPORT_GENERATION_PROMPT,
} from "./prompts";

// ── Tool definitions ──────────────────────────────────────────────────────────

const extractContextTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "extractContext",
    description: "Extract review context from inputs",
    parameters: {
      type: "object",
      properties: {
        screenNames:    { type: "array", items: { type: "string" } },
        inputTypes:     { type: "array", items: { type: "string" } },
        productSummary: { type: "string" },
        missingContext: { type: "array", items: { type: "string" } },
      },
      required: ["screenNames", "inputTypes", "productSummary", "missingContext"],
    },
  },
};

const findingSchema = {
  type: "object",
  properties: {
    title:           { type: "string" },
    category:        { type: "string" },
    observation:     { type: "string" },
    why:             { type: "string" },
    recommendation:  { type: "string" },
    business_impact: { type: "string" },
    a11y_impact:     { type: "string" },
    severity:        { type: "string", enum: ["critical", "high", "medium", "low"] },
    priority:        { type: "string", enum: ["P0", "P1", "P2"] },
    screen:          { type: "string" },
    principle:       { type: "string" },
    confidence:      { type: "number" },
  },
  required: ["title", "category", "observation", "why", "recommendation", "severity", "screen"],
};

const findingsListTool = (name: string): OpenAI.ChatCompletionTool => ({
  type: "function",
  function: {
    name,
    description: "Return a list of UX findings",
    parameters: {
      type: "object",
      properties: { findings: { type: "array", items: findingSchema } },
      required: ["findings"],
    },
  },
});

const basisMappingTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "basisMapping",
    description: "Map findings to review basis items",
    parameters: {
      type: "object",
      properties: {
        mappings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              findingIndex: { type: "number" },
              basis: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type:        { type: "string" },
                    name:        { type: "string" },
                    explanation: { type: "string" },
                  },
                  required: ["type", "name", "explanation"],
                },
              },
            },
            required: ["findingIndex", "basis"],
          },
        },
      },
      required: ["mappings"],
    },
  },
};

const prioritizationTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "prioritization",
    description: "Return deduplicated, prioritized finding IDs and UX score",
    parameters: {
      type: "object",
      properties: {
        uxScore: { type: "number", minimum: 0, maximum: 100 },
        prioritized: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id:          { type: "string" },
              priority:    { type: "string", enum: ["P0", "P1", "P2"] },
              severity:    { type: "string", enum: ["critical", "high", "medium", "low"] },
              isDuplicate: { type: "boolean" },
              duplicateOf: { type: "string" },
            },
            required: ["id", "priority", "severity", "isDuplicate"],
          },
        },
      },
      required: ["uxScore", "prioritized"],
    },
  },
};

const reportGenerationTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "reportGeneration",
    description: "Generate the full Markdown review report",
    parameters: {
      type: "object",
      properties: {
        executiveSummary: { type: "string" },
        contentMd:        { type: "string" },
      },
      required: ["executiveSummary", "contentMd"],
    },
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type TextPart  = { type: "text"; text: string };
type ImageUrlPart = { type: "image_url"; image_url: { url: string } };
type ContentPart = TextPart | ImageUrlPart;

interface RawFinding {
  title: string;
  category: string;
  observation: string;
  why: string;
  recommendation: string;
  business_impact?: string;
  a11y_impact?: string;
  severity?: string;
  priority?: string;
  screen?: string;
  principle?: string;
  confidence?: number;
}

// ── Azure OpenAI client factory ───────────────────────────────────────────────

function resolveAzureConfig(endpoint: string): { mode: "classic" | "v1"; baseUrl: string } {
  const trimmed = endpoint.replace(/\/+$/, "");
  if (/\/openai\/v1$/i.test(trimmed)) return { mode: "v1", baseUrl: trimmed };
  const resourceUrl = trimmed.replace(/\/openai\/?$/i, "");
  return { mode: "classic", baseUrl: resourceUrl };
}

function getClient(): { client: OpenAI; deployment: string } {
  const apiKey     = process.env.AZURE_OPENAI_API_KEY;
  const endpoint   = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2024-12-01-preview";

  if (!apiKey)     throw new Error("AZURE_OPENAI_API_KEY not set");
  if (!endpoint)   throw new Error("AZURE_OPENAI_ENDPOINT not set");
  if (!deployment) throw new Error("AZURE_OPENAI_DEPLOYMENT not set");

  const { mode, baseUrl } = resolveAzureConfig(endpoint);

  if (mode === "v1") {
    return {
      client: new OpenAI({ apiKey, baseURL: baseUrl, defaultHeaders: { "api-key": apiKey } }),
      deployment,
    };
  }

  return {
    client: new AzureOpenAI({ apiKey, endpoint: baseUrl, deployment, apiVersion }),
    deployment,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (err?.status === 429 && i < attempts - 1) {
        let waitMs = 30_000;
        try {
          const ra = err?.headers?.["retry-after"];
          if (ra) waitMs = (parseInt(ra, 10) + 2) * 1000;
        } catch {}
        console.warn(`Rate limit — waiting ${waitMs / 1000}s (retry ${i + 2}/${attempts})`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

function extractJson(text: string): any {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (match) { try { return JSON.parse(match[1].trim()); } catch {} }
  try { return JSON.parse(text.trim()); } catch {}
  throw new Error("Could not extract JSON from response: " + text.slice(0, 300));
}

async function callAgent<T>(opts: {
  system: string;
  userContent: ContentPart[];
  tool: OpenAI.ChatCompletionTool;
}): Promise<T> {
  const { client, deployment } = getClient();
  const schemaHint = `\n\nYou MUST respond ONLY with a valid JSON object matching this schema:\n${JSON.stringify(opts.tool.function.parameters, null, 2)}`;

  return withRetry(async () => {
    const response = await client.chat.completions.create({
      model: deployment,
      messages: [
        { role: "system", content: opts.system + schemaHint },
        { role: "user",   content: opts.userContent },
      ],
      tools: [opts.tool],
      tool_choice: { type: "function", function: { name: opts.tool.function.name } },
    });

    const msg = response.choices[0]?.message;
    if (!msg) throw new Error(`Agent ${opts.tool.function.name}: no message`);

    const toolCall = msg.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try { return JSON.parse(toolCall.function.arguments) as T; }
      catch { throw new Error(`Agent ${opts.tool.function.name}: bad tool args: ${toolCall.function.arguments.slice(0, 300)}`); }
    }

    if (msg.content) {
      console.warn(`Agent ${opts.tool.function.name}: falling back to JSON text parse`);
      return extractJson(msg.content) as T;
    }

    throw new Error(`Agent ${opts.tool.function.name}: no tool call and no content`);
  });
}

// Map raw severity/priority strings to Prisma enums
function mapSeverity(s?: string): "P0" | "P1" | "P2" {
  if (s === "critical") return "P0";
  if (s === "high")     return "P1";
  return "P2";
}

async function setStage(reviewId: string, stage: string) {
  await prisma.review.update({ where: { id: reviewId }, data: { stage } });
}

async function insertFindings(reviewId: string, rawFindings: RawFinding[]): Promise<string[]> {
  const ids: string[] = [];
  for (const f of rawFindings) {
    const sev = mapSeverity(f.severity);
    const prio = (f.priority === "P0" || f.priority === "P1" || f.priority === "P2") ? f.priority : "P2";

    // Map category string to ReviewArea enum
    const areaMap: Record<string, "USABILITY" | "ACCESSIBILITY" | "CONSISTENCY" | "CONTENT_UX" | "RISK" | "RECOMMENDATIONS"> = {
      usability:    "USABILITY",
      accessibility: "ACCESSIBILITY",
      "design system": "CONSISTENCY",
      "visual design": "CONSISTENCY",
      consistency:  "CONSISTENCY",
      content:      "CONTENT_UX",
    };
    const area = areaMap[(f.category ?? "").toLowerCase()] ?? "USABILITY";

    const finding = await prisma.finding.create({
      data: {
        id:              `f-${randomUUID().slice(0, 8)}`,
        reviewId,
        title:           f.title,
        severity:        sev,
        area,
        screen:          f.screen ?? "Unknown",
        principle:       f.principle ?? null,
        observation:     f.observation,
        why:             f.why,
        recommendation:  f.recommendation,
        businessImpact:  f.business_impact ?? null,
        a11yImpact:      f.a11y_impact ?? null,
        confidence:      f.confidence ?? 80,
        status:          "PROPOSED",
        isAiGenerated:   true,
      },
    });
    ids.push(finding.id);
  }
  return ids;
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export async function runReviewPipeline(reviewId: string): Promise<void> {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error(`Review ${reviewId} not found`);

  const assets = await prisma.asset.findMany({ where: { reviewId } });
  const assetParts: ContentPart[] = assets.map((a) => {
    if (a.mimeType.startsWith("image/") && a.base64Data) {
      return {
        type: "image_url" as const,
        image_url: {
          url: `data:${a.mimeType};base64,${a.base64Data}`,
        },
      };
    }
    return {
      type: "text" as const,
      text: a.contentText
        ? `\n--- ${a.name} ---\n${a.contentText}\n`
        : `[Uploaded file: ${a.name} (${a.mimeType})]`,
    };
  });

  const contextPart: ContentPart = {
    type: "text",
    text: `Review: "${review.name}"\nProduct: ${review.product}\nDomain: ${review.domain}\nType: ${review.reviewType}\nDepth: ${review.depth}\nCriteria: ${review.criteria.join(", ")}`,
  };
  const userContent: ContentPart[] = [
    contextPart,
    ...(assetParts.length > 0 ? assetParts : [{ type: "text" as const, text: "No visual assets uploaded. Review from text context only." }]),
  ];

  try {
    // Stage 0: Input Understanding
    await setStage(reviewId, "reading_inputs");
    const ctx = await callAgent<{ screenNames: string[]; productSummary: string }>({
      system: INPUT_UNDERSTANDING_PROMPT,
      userContent,
      tool: extractContextTool,
    });

    const fullUserContent: ContentPart[] = [
      ...userContent,
      {
        type: "text",
        text: `\nScreens identified: ${ctx.screenNames?.join(", ") ?? "unknown"}\nProduct context: ${ctx.productSummary}`,
      },
    ];

    // Stage 1: Usability
    await setStage(reviewId, "analyzing_screens");
    const usability = await callAgent<{ findings: RawFinding[] }>({
      system: USABILITY_REVIEW_PROMPT,
      userContent: fullUserContent,
      tool: findingsListTool("usabilityFindings"),
    });
    await insertFindings(reviewId, usability.findings ?? []);

    // Stage 2: Accessibility
    await setStage(reviewId, "checking_accessibility");
    const a11y = await callAgent<{ findings: RawFinding[] }>({
      system: ACCESSIBILITY_REVIEW_PROMPT,
      userContent: fullUserContent,
      tool: findingsListTool("accessibilityFindings"),
    });
    await insertFindings(reviewId, a11y.findings ?? []);

    // Stage 3: Content
    await setStage(reviewId, "reviewing_content");
    const content = await callAgent<{ findings: RawFinding[] }>({
      system: CONTENT_UX_PROMPT,
      userContent: fullUserContent,
      tool: findingsListTool("contentFindings"),
    });
    await insertFindings(reviewId, content.findings ?? []);

    // Stage 4: Consistency
    await setStage(reviewId, "checking_consistency");
    const consistency = await callAgent<{ findings: RawFinding[] }>({
      system: CONSISTENCY_PROMPT,
      userContent: fullUserContent,
      tool: findingsListTool("consistencyFindings"),
    });
    await insertFindings(reviewId, consistency.findings ?? []);

    // Stage 5: Basis Mapping
    await setStage(reviewId, "mapping_review_basis");
    const allFindings = await prisma.finding.findMany({ where: { reviewId } });
    const findingsSummary = allFindings.map((f, i) => ({
      index: i, id: f.id, title: f.title,
      category: f.area, observation: f.observation, severity: f.severity,
    }));

    const basisResult = await callAgent<{
      mappings: Array<{ findingIndex: number; basis: Array<{ type: string; name: string; explanation: string }> }>;
    }>({
      system: BASIS_MAPPING_PROMPT,
      userContent: [{ type: "text", text: JSON.stringify(findingsSummary) }],
      tool: basisMappingTool,
    });

    const basisItemsData = [];
    for (const mapping of basisResult.mappings ?? []) {
      const finding = allFindings[mapping.findingIndex];
      if (!finding) continue;
      for (const b of mapping.basis ?? []) {
        basisItemsData.push({
          id:          randomUUID(),
          findingId:   finding.id,
          type:        b.type,
          name:        b.name,
          explanation: b.explanation,
        });
      }
    }
    if (basisItemsData.length > 0) {
      await prisma.reviewBasisItem.createMany({
        data: basisItemsData,
      });
    }

    // Stage 6: Prioritization
    await setStage(reviewId, "prioritizing_findings");
    const prioResult = await callAgent<{
      uxScore: number;
      prioritized: Array<{ id: string; priority: string; severity: string; isDuplicate: boolean; duplicateOf?: string }>;
    }>({
      system: PRIORITIZATION_PROMPT,
      userContent: [{ type: "text", text: JSON.stringify(findingsSummary) }],
      tool: prioritizationTool,
    });

    const existingIds = new Set(allFindings.map(f => f.id));
    const updates = [];
    for (const p of prioResult.prioritized ?? []) {
      let targetId = p.id;
      
      // If the model returned an index or a slightly different string instead of the exact DB ID
      if (!existingIds.has(targetId)) {
        // Try parsing as integer index
        const idx = parseInt(targetId, 10);
        if (!isNaN(idx) && allFindings[idx]) {
          targetId = allFindings[idx].id;
        } else {
          // Try to match by finding title or look it up case-insensitively
          const matched = allFindings.find(f => f.id.toLowerCase() === targetId.toLowerCase() || f.title.toLowerCase() === targetId.toLowerCase());
          if (matched) {
            targetId = matched.id;
          } else {
            console.warn(`Prioritization: Finding ID "${p.id}" not found in database. Skipping.`);
            continue;
          }
        }
      }
      
      const prio = (p.priority === "P0" || p.priority === "P1" || p.priority === "P2") ? p.priority as "P0" | "P1" | "P2" : "P2";
      const isDup = p.isDuplicate && !!p.duplicateOf;
      
      updates.push(prisma.finding.update({
        where: { id: targetId },
        data: { severity: prio, status: isDup ? "DISMISSED" : "PROPOSED" },
      }));
    }
    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }
    await prisma.review.update({
      where: { id: reviewId },
      data: { uxScore: prioResult.uxScore ?? 70 },
    });

    // Stage 7: Report Generation
    await setStage(reviewId, "generating_report");
    const finalFindings = await prisma.finding.findMany({ where: { reviewId } });
    const reportInput = {
      reviewName: review.name, product: review.product,
      domain: review.domain,  uxScore: prioResult.uxScore ?? 70,
      findings: finalFindings.map((f) => ({
        id: f.id, title: f.title, category: f.area,
        severity: f.severity, screen: f.screen,
        observation: f.observation, why: f.why,
        recommendation: f.recommendation,
        businessImpact: f.businessImpact, a11yImpact: f.a11yImpact,
        confidence: f.confidence,
      })),
    };

    const reportResult = await callAgent<{ executiveSummary: string; contentMd: string }>({
      system: REPORT_GENERATION_PROMPT,
      userContent: [{ type: "text", text: JSON.stringify(reportInput) }],
      tool: reportGenerationTool,
    });

    await prisma.report.create({
      data: {
        id:               `rep-${randomUUID().slice(0, 8)}`,
        reviewId,
        name:             `${review.name} — UX Review Report`,
        template:         review.reviewType,
        executiveSummary: reportResult.executiveSummary ?? "",
        contentMd:        reportResult.contentMd ?? "",
        status:           "ai_draft",
        createdBy:        review.owner,
      },
    });

    // Complete
    await prisma.review.update({
      where: { id: reviewId },
      data: { status: "completed", stage: "completed" },
    });
  } catch (err: any) {
    console.error("=== Review Pipeline Error ===", { reviewId, message: err?.message, status: err?.status });
    await prisma.review.update({
      where: { id: reviewId },
      data: { status: "failed", stage: "failed" },
    });
    throw err;
  }
}
