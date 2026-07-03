import OpenAI, { AzureOpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

function resolveAzureConfig(endpoint: string): { mode: "classic" | "v1"; baseUrl: string } {
  const trimmed = endpoint.replace(/\/+$/, "");
  if (/\/openai\/v1$/i.test(trimmed)) return { mode: "v1", baseUrl: trimmed };
  const resourceUrl = trimmed.replace(/\/openai\/?$/i, "");
  return { mode: "classic", baseUrl: resourceUrl };
}

async function testConnection() {
  const apiKey     = process.env.AZURE_OPENAI_API_KEY;
  const endpoint   = process.env.AZURE_OPENAI_ENDPOINT;
  const model      = "DeepSeek-V4-Pro";
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2024-12-01-preview";

  console.log("Configured Settings:");
  console.log("Endpoint:", endpoint);
  console.log("Test Model:", model);
  console.log("API Version:", apiVersion);
  console.log("API Key Length:", apiKey?.length ?? 0);

  if (!apiKey || !endpoint) {
    console.error("Missing credentials in environment!");
    return;
  }

  const { mode, baseUrl } = resolveAzureConfig(endpoint);
  let client: OpenAI;

  if (mode === "v1") {
    client = new OpenAI({ apiKey, baseURL: baseUrl, defaultHeaders: { "api-key": apiKey } });
  } else {
    client = new AzureOpenAI({ apiKey, endpoint: baseUrl, deployment: model, apiVersion });
  }

  console.log("\nAttempting connection...");
  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "Extract context using the tool." },
        { role: "user", content: "Test input" }
      ],
      tools: [{
        type: "function",
        function: {
          name: "extractContext",
          description: "Extract context",
          parameters: {
            type: "object",
            properties: {
              screenNames: { type: "array", items: { type: "string" } },
            },
            required: ["screenNames"]
          }
        }
      }],
      tool_choice: { type: "function", function: { name: "extractContext" } }
    });
    console.log("SUCCESS! Response received:", JSON.stringify(response, null, 2));
  } catch (error: any) {
    console.error("FAILED! Error details:");
    console.error("Status:", error?.status);
    console.error("Message:", error?.message);
    console.error("Headers:", error?.headers);
    console.error("Raw Error:", error);
  }
}

testConnection();
