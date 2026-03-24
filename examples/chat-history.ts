/**
 * examples/chat-history.ts
 *
 * Demonstrates multi-turn conversations using the built-in ChatHistory helper.
 *
 * Run:
 *   GROQ_API_KEY=gsk_... npx tsx examples/chat-history.ts
 */

import { GroqClient, GROQ_MODELS } from "../src/index.js";

async function main() {
  const groq = new GroqClient({
    model: GROQ_MODELS.LLAMA3_8B, // faster model — great for chat
  });

  // Create a stateful history object
  const history = groq.createHistory();

  // Set an optional system prompt
  history.add("system", "You are a helpful assistant with a great memory. Keep answers brief.");

  // ── Turn 1 ────────────────────────────────────────────────────────────────
  const userMsg1 = "My favourite programming language is TypeScript and my lucky number is 7.";
  console.log(`User: ${userMsg1}`);
  history.add("user", userMsg1);

  const reply1 = await groq.chat(history.messages);
  history.add("assistant", reply1);
  console.log(`Assistant: ${reply1}\n`);

  // ── Turn 2 ────────────────────────────────────────────────────────────────
  const userMsg2 = "What is my favourite language, and what is my lucky number?";
  console.log(`User: ${userMsg2}`);
  history.add("user", userMsg2);

  const reply2 = await groq.chat(history.messages);
  history.add("assistant", reply2);
  console.log(`Assistant: ${reply2}\n`);

  // ── Turn 3 ────────────────────────────────────────────────────────────────
  const userMsg3 = "Multiply my lucky number by 6.";
  console.log(`User: ${userMsg3}`);
  history.add("user", userMsg3);

  const reply3 = await groq.chat(history.messages);
  history.add("assistant", reply3);
  console.log(`Assistant: ${reply3}\n`);

  // ── Inspect and clear ─────────────────────────────────────────────────────
  console.log(`Total messages in history: ${history.messages.length}`);
  history.clear();
  console.log(`History cleared. Messages remaining: ${history.messages.length}`);
}

main().catch(console.error);
