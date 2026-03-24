/**
 * examples/basic.ts
 *
 * Demonstrates the simplest possible usage: import, initialise, and call .ask()
 *
 * Run:
 *   GROQ_API_KEY=gsk_... npx tsx examples/basic.ts
 */

import { GroqClient, GROQ_MODELS } from "../src/index.js";

async function main() {
  // Initialise the client — reads GROQ_API_KEY from the environment automatically
  const groq = new GroqClient({
    model: GROQ_MODELS.LLAMA3_70B, // optional; this is already the default
  });

  // Ask a single question
  const response = await groq.ask(
    "Explain the concept of recursion in one short paragraph."
  );

  console.log("Response:", response);
}

main().catch(console.error);
