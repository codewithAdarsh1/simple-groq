/**
 * examples/streaming.ts
 *
 * Demonstrates streaming responses token-by-token using for-await-of.
 *
 * Run:
 *   GROQ_API_KEY=gsk_... npx tsx examples/streaming.ts
 */

import { GroqClient, GROQ_MODELS, type Message } from "../src/index.js";

async function main() {
  const groq = new GroqClient({
    model: GROQ_MODELS.LLAMA3_70B,
  });

  const messages: Message[] = [
    {
      role: "system",
      content: "You are a creative storyteller. Keep responses under 150 words.",
    },
    {
      role: "user",
      content: "Tell me a very short story about a robot who learns to paint.",
    },
  ];

  console.log("Streaming response:\n");
  process.stdout.write("Assistant: ");

  let totalChunks = 0;

  for await (const chunk of groq.stream(messages)) {
    // Write each token to stdout as it arrives
    process.stdout.write(chunk.content);
    totalChunks++;

    if (chunk.done) {
      console.log("\n");
      console.log(`--- Stream complete (${totalChunks} chunks, finish reason: ${chunk.finishReason}) ---`);
    }
  }
}

main().catch(console.error);
