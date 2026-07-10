import path from "path";
import dotenv from "dotenv";

const repoRoot = path.resolve(__dirname, "../../../../");
dotenv.config({ path: path.join(repoRoot, ".env") });
dotenv.config({ path: path.join(repoRoot, "apps/api/.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const jwtSecret = process.env.JWT_SECRET ?? (nodeEnv === "development" ? "local-dev-jwt-secret-change-me" : required("JWT_SECRET"));

export const config = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  nodeEnv,
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  webAppUrl: process.env.WEB_APP_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:3000",
  smtpHost: process.env.SMTP_HOST,
  smtpPort: parseInt(process.env.SMTP_PORT ?? "587", 10),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM,
  azureCommunicationEmailConnectionString: process.env.AZURE_COMMUNICATION_EMAIL_CONNECTION_STRING,
  azureCommunicationEmailSenderAddress: process.env.AZURE_COMMUNICATION_EMAIL_SENDER_ADDRESS,
  jwtSecret,
  jwtExpiresInSeconds: parseInt(process.env.JWT_EXPIRES_IN_SECONDS ?? "604800", 10),
  databaseUrl: required("DATABASE_URL"),
  directUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  azureOpenAiEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAiKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAiApiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-12-01-preview",
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "ux-review-assets",
  supabaseStorageSignedUrlTtlSeconds: parseInt(
    process.env.SUPABASE_STORAGE_SIGNED_URL_TTL_SECONDS ?? "3600",
    10,
  ),
} as const;
