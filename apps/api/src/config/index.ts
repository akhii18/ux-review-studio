import dotenv from "dotenv";
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
  // Azure OpenAI — validated at pipeline start, not at boot (allows the app to run without AI config)
  azureOpenAiEndpoint:   process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAiKey:        process.env.AZURE_OPENAI_API_KEY,
  azureOpenAiDeployment: process.env.AZURE_OPENAI_DEPLOYMENT,
  azureOpenAiApiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-12-01-preview",
} as const;
