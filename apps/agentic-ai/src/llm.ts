import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { AzureChatOpenAI } from "@langchain/openai";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(moduleDir, "../../../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config();

if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
  throw new Error(
    "AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT is not set.\n" +
    "Add them in your .env file"
  );
}

export const REVIEW_DEPTHS = ["quick", "standard", "deep"] as const;

export type ReviewDepth = typeof REVIEW_DEPTHS[number];

type StateWithReviewDepth = {
  reviewDepth?: string;
};

const DEPLOYMENT_ENV_BY_DEPTH: Record<ReviewDepth, string> = {
  quick: "AZURE_OPENAI_DEPLOYMENT_QUICK",
  standard: "AZURE_OPENAI_DEPLOYMENT_STANDARD",
  deep: "AZURE_OPENAI_DEPLOYMENT_DEEP",
};

export function normalizeReviewDepth(depth?: string | null): ReviewDepth {
  if (depth === "quick" || depth === "standard" || depth === "deep") {
    return depth;
  }

  return "standard";
}

export function getDeploymentNameForDepth(depth?: string | null): string {
  const normalizedDepth = normalizeReviewDepth(depth);
  const deployment = process.env[DEPLOYMENT_ENV_BY_DEPTH[normalizedDepth]]
    ?? (normalizedDepth === "deep" ? process.env.AZURE_OPENAI_DEPLOYMENT : undefined)
    ?? process.env.AZURE_OPENAI_DEPLOYMENT;

  if (!deployment) {
    throw new Error(
      `Missing Azure deployment mapping for review depth \"${normalizedDepth}\". ` +
      `Set ${DEPLOYMENT_ENV_BY_DEPTH[normalizedDepth]} in your .env file.`
    );
  }

  return deployment;
}

export function createLlm(reviewDepth?: string | null): AzureChatOpenAI {
  const deployment = getDeploymentNameForDepth(reviewDepth);

  return new AzureChatOpenAI({
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiDeploymentName: deployment,
    azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-12-01-preview",
    model: deployment,
  });
}

export function getLlmForState(state: StateWithReviewDepth): AzureChatOpenAI {
  return createLlm(state.reviewDepth);
}