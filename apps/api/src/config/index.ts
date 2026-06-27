import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  databaseUrl: required("DATABASE_URL"),
  directUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  azureOpenAiEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAiKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAiDeployment: process.env.AZURE_OPENAI_DEPLOYMENT,
  azureOpenAiApiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-12-01-preview",
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "ux-review-assets",
  supabaseStorageSignedUrlTtlSeconds: parseInt(
    process.env.SUPABASE_STORAGE_SIGNED_URL_TTL_SECONDS ?? "3600",
    10,
  ),
} as const;
