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
  azureOpenAiEndpoint: required("AZURE_OPENAI_ENDPOINT"),
  azureOpenAiKey: required("AZURE_OPENAI_API_KEY"),
  azureOpenAiDeployment: required("AZURE_OPENAI_DEPLOYMENT"),
  azureOpenAiApiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-12-01-preview",
  azureStorageConnectionString: required("AZURE_STORAGE_CONNECTION_STRING"),
  azureStorageContainerName: required("AZURE_STORAGE_CONTAINER_NAME"),
} as const;
