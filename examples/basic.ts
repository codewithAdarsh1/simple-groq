/**
 * examples/basic.ts
 *
 * Demonstrates the simplest possible usage: import, initialise, and call .ask()
 *
 * Run:
 *   GROQ_API_KEY=gsk_... npx tsx examples/basic.ts
 */

import { AIClient, GROQ_MODELS, GEMINI_MODELS } from "../src/index.js";

async function main() {
  // 1. Initialise the standard Groq client
  const groq = new AIClient({
    provider: "groq",
    apiKey: process.env.GROQ_API_KEY,
    model: GROQ_MODELS.LLAMA3_70B,
  });

  const groqRes = await groq.ask("Explain the concept of recursion in one short paragraph.");
  console.log("Groq Response:\n", groqRes, "\n");

  // 2. We can use the exact same client for Gemini or Claude
  if (process.env.GEMINI_API_KEY) {
    const gemini = new AIClient({
      provider: "gemini",
      apiKey: process.env.GEMINI_API_KEY,
      model: GEMINI_MODELS.GEMINI_2_FLASH,
    });

    const geminiRes = await gemini.ask("Explain the concept of recursion in one short paragraph.");
    console.log("Gemini Response:\n", geminiRes);
  }
}

main().catch(console.error);
