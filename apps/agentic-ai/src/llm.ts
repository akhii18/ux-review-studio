import path from "path";
import dotenv from "dotenv";
import { AzureChatOpenAI } from "@langchain/openai";
import { fileURLToPath } from "url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(moduleDir, "../../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config();

if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
  throw new Error(
    "AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT is not set.\n" +
    "Add them in your .env file"
  );
}

export type ReviewDepth = "quick" | "standard" | "deep";

const REVIEW_DEPTH_MODELS: Record<ReviewDepth, string> = {
  quick: "gpt-4.1-mini",
  standard: "DeepSeek-V4-Pro",
  deep: "gpt-5.5",
};

export function normalizeReviewDepth(reviewDepth?: string | null): ReviewDepth {
  switch (reviewDepth?.trim().toLowerCase()) {
    case "quick":
      return "quick";
    case "deep":
      return "deep";
    case "standard":
    default:
      return "standard";
  }
}

export function resolveReviewModel(reviewDepth?: string | null): string {
  return REVIEW_DEPTH_MODELS[normalizeReviewDepth(reviewDepth)];
}

export function getDeploymentNameForDepth(reviewDepth?: string | null): string {
  return resolveReviewModel(reviewDepth);
}

export function createLlmForReviewDepth(reviewDepth?: string | null): AzureChatOpenAI {
  const model = resolveReviewModel(reviewDepth);

  return new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiDeploymentName: model,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-12-01-preview",
  });
}

export function createLlm(reviewDepth?: string | null): AzureChatOpenAI {
  return createLlmForReviewDepth(reviewDepth);
}