/**
 * examples/streaming.ts
 *
 * Demonstrates streaming responses token-by-token using for-await-of.
 *
 * Run:
 *   GROQ_API_KEY=gsk_... npx tsx examples/streaming.ts
 */

import { AIClient, GROQ_MODELS, type Message } from "../src/index.js";

async function main() {
  // Initialise the universal client for Groq
  const ai = new AIClient({
    provider: "groq",
    apiKey: process.env.GROQ_API_KEY, // Or it auto-reads expected env vars
    model: GROQ_MODELS.LLAMA3_70B,
  });

  const messages: Message[] = [
    {
      role: "system",
      content: "You are a creative storyteller. Keep responses under 50 words.",
    },
    {
      role: "user",
      content: "Tell me a very short story about a robot who learns to paint.",
    },
  ];

  console.log("Streaming response:\n");
  process.stdout.write("Assistant: ");

  let totalChunks = 0;

  for await (const chunk of ai.stream(messages)) {
    // Write each token to stdout as it arrives
    process.stdout.write(chunk.content);
    totalChunks++;

    if (chunk.done) {
      console.log("\n");
      console.log(`--- Stream complete (${totalChunks} chunks) ---`);
    }
  }
}

main().catch(console.error);
