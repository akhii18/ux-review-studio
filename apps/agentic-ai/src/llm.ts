import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";

if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_DEPLOYMENT) {
  throw new Error(
    "AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, or AZURE_OPENAI_DEPLOYMENT is not set.\n" +
    "Add them in your .env file"
  );
}

export const llm = new ChatOpenAI({
  model: process.env.AZURE_OPENAI_DEPLOYMENT, // deployment/model name
  temperature: 0.1,
  apiKey: process.env.AZURE_OPENAI_API_KEY, // if this gives TS issue, use openAIApiKey instead
  configuration: {
    baseURL: process.env.AZURE_OPENAI_ENDPOINT,
  },
});