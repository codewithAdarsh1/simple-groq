<div align="center">

# ❖ simple-ai-sdk

**The Universal, Zero-Dependency Mega-Wrapper for 18 Generative AI APIs.**

[![npm version](https://img.shields.io/npm/v/simple-ai-sdk?color=000000&style=for-the-badge&logo=npm)](https://www.npmjs.com/package/simple-ai-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-READY-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](./LICENSE)

<p align="center">
  Tired of juggling the official <code>openai</code>, <code>@anthropic-ai/sdk</code>, and <code>@google/generative-ai</code> packages? <br/>
  <b>simple-ai-sdk</b> unifies all major AI providers into one tiny, universal package using pure <code>fetch()</code>.
</p>

</div>

---

## ✨ Why simple-ai-sdk?

1. **One API To Rule Them All**: Write your app once. Swap between OpenAI, Gemini, Claude, and Groq by changing a single string constructor.
2. **Zero Dependencies**: Pure native `fetch`. It works flawlessly in Node.js, Deno, Bun, Cloudflare Workers, and all modern browsers. `< 10KB` minified.
3. **Production-Ready DX**: Built-in JSON repair, auto-fallbacks, multi-key rate-limit rotation, and context window truncation. Features you normally have to build yourself are entirely native.
4. **Built-In Chat Widget**: Drop an AI assistant on any webpage in two lines of JavaScript. 

---

## 📋 Table of Contents

- [Supported Providers](#-supported-providers)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Core API Methods](#-core-api-methods)
- [Advanced Features (The "Killer" List)](#-advanced-features)
  - [Auto Fallbacks](#1-auto-fallbacks-provider-routing)
  - [Multi-Key Rotation](#2-multi-key-rotation)
  - [JSON Repair & Validation](#3-json-repair--structured-schemas)
  - [Auto-Truncation Guard](#4-context-window-guard)
  - [Cancel Streams Mid-Generation](#5-cancel-streams)
  - [Internal Cost Tracking](#6-token-cost-tracker)
- [Embeddable Chat Widget](#-embeddable-chat-widget)
- [Token Budgeting](#-token-budgeting)
- [API Response Caching](#-api-optimizer)
- [Migrating from simple-groq](#-migrating-from-simple-groq)

---

## 🌐 Supported Providers

| Provider | Init String | Internal Constants |
|:---|:---:|:---|
| **Groq** | `"groq"` | `GROQ_MODELS` |
| **OpenAI** | `"openai"` | `OPENAI_MODELS` |
| **Anthropic Claude** | `"anthropic"` | `CLAUDE_MODELS` |
| **Google Gemini** | `"gemini"` | `GEMINI_MODELS` |
| **xAI Grok** | `"grok"` | `GROK_MODELS` |
| **Mistral AI** | `"mistral"` | `MISTRAL_MODELS` |
| **DeepSeek** | `"deepseek"` | `DEEPSEEK_MODELS` |
| **Cohere** | `"cohere"` | `COHERE_MODELS` |
| **Qwen (Alibaba)** | `"qwen"` | `QWEN_MODELS` |
| **Nvidia NIM** | `"nvidia"` | `NVIDIA_MODELS` |
| **Together AI** | `"together"` | N/A |
| **Perplexity AI** | `"perplexity"` | `PERPLEXITY_MODELS` |
| **Fireworks AI** | `"fireworks"` | N/A |
| **Cerebras** | `"cerebras"` | N/A |
| **Moonshot (Kimi)** | `"moonshot"` | `MOONSHOT_MODELS` |
| **Azure OpenAI** | `"azure"` | *Pass custom `baseUrl`* |
| **Ollama (local)** | `"ollama"` | *Requires no API key* |

---

## 📦 Installation

```bash
npm install simple-ai-sdk
```

*(Also fully compatible with `yarn add`, `pnpm add`, and `bun add`)*

---

## 🚀 Quick Start

The core philosophy is **1 API, Any Provider**.

```ts
import { AIClient, GROQ_MODELS, GEMINI_MODELS } from "simple-ai-sdk";

// 1. Initialise Groq (Llama 3)
const groq = new AIClient({ provider: "groq", apiKey: "gsk_..." });
const res1 = await groq.ask("What is a compiler?");

// 2. Simply switch the configuration to Google Gemini
const gemini = new AIClient({ provider: "gemini", apiKey: "AIzaSy..." });
const res2 = await gemini.ask("What is a compiler?");

// 3. Develop locally with Ollama (No API Key Required!)
const local = new AIClient({ provider: "ollama", model: "llama3.2" });
const res3 = await local.ask("What is a compiler?");
```

---

## 🔧 Core API Methods

Every initialized `AIClient` provides these primary methods regardless of the underlying LLM provider.

### `.ask(prompt)`
Send a one-off string prompt. Returns a plaintext string.
```ts
const reply = await ai.ask("Write a haiku about TypeScript.");
```

### `.chat(messages)`
Standard multi-turn message array payload.
```ts
const reply = await ai.chat([
  { role: "system", content: "You are a witty pirate." },
  { role: "user", content: "Explain React hooks." }
]);
```

### `.stream(messages)`
Generates an `AbortableStream` chunk generator for real-time text UI updates.
```ts
for await (const chunk of ai.stream(messages)) {
  process.stdout.write(chunk.content);
}
```

### `.createHistory()`
Creates a stateful memory bucket to manage multi-turn conversations cleanly.
```ts
const history = ai.createHistory();
history.add("system", "You are an assistant.");
history.add("user", "My name is John.");

const reply = await ai.chat(history.messages);
history.add("assistant", reply);
```

---

## 🔥 Advanced Features

### 1. Auto Fallbacks (Provider Routing)
If an API goes down or rate-limits you heavily, seamlessly route to a different provider without the user ever noticing an application crash.

```ts
const ai = new AIClient({
  provider: "openai",
  apiKey: "sk-...",
  fallback: [
    { provider: "groq", apiKey: "gsk_...", model: "llama-3.3-70b-versatile" },
    { provider: "gemini", apiKey: "AIzaSy..." }
  ]
});
```

### 2. Multi-Key Rotation
Got rate-limited? Feed the client an array of keys instead of a single key. It load-balances them round-robin and automatically penalizes specific keys for 60s when a `429 Too Many Requests` is hit.

```ts
const ai = new AIClient({
  provider: "groq",
  apiKeys: ["key1...", "key2...", "key3..."]
});
```

### 3. JSON Repair & Structured Schemas
LLMs famously break JSON logic by adding trailing commas, missing brackets, or writing ` ```json ` fences.

```ts
// Safely repairs broken payloads and strips markdown automatically
const data = await ai.askJSON<{ title: string }>("Extract the movie title...");

// Force an exact TS object shape, injecting the rules into the prompt
const result = await ai.askStructured<{ name: string, age: number }>(
  "Parse this: John is 25", 
  { name: "string", age: "number" }
);
```

### 4. Context Window Guard
Say goodbye to "context length exceeded" 400 errors.
```ts
const ai = new AIClient({
  provider: "claude",
  apiKey: "sk-ant...",
  contextWindowSafe: true // that's it!
});
```
*How it works*: Prior to fetch execution, `AIClient` estimates your token count. If it exceeds the provider's known maximum cap, it safely unshifts the oldest message objects out of the array (permanently preserving your `system` instruction).

### 5. Cancel Streams
Streaming a giant 4000-word essay but the user clicks "Stop" or navigates away? 
```ts
const stream = ai.stream([{ role: "user", content: "Tell me a huge story" }]);

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
  if (chunk.content.includes("The End")) {
    stream.cancel(); // Aborts the HTTP fetch connection instantly saving bandwidth!
  }
}
```

### 6. Token Cost Tracker
Bake-in accurate USD pricing mapping for major models.
```ts
const ai = new AIClient({ provider: "openai", costTracker: true });
await ai.ask("Write an essay...");

console.log(ai.cost.summary);
// { totalUSD: "$0.024510", requests: 1 }
```

---

## 💬 Embeddable Chat Widget

Drop a fully customizable, themeable AI chatbot onto **any webpage** in 2 lines. It automatically scrapes the page's DOM elements and uses the text as AI context — no custom backend or RAG required.

```html
<script type="module">
  import { embedChat } from "simple-ai-sdk";
  
  const cleanup = embedChat({
    provider: "gemini",
    apiKey: "AIzaSy...",
    
    // ── Assistant identity ─────────
    assistantName: "Aria Support",
    assistantAvatar: "✨",
    welcomeMessage: "Hi! How can I help you today?",
    
    // ── AI Behaviour ─────────
    model: "gemini-2.5-flash",
    behavior: {
      personality: "friendly and professional",
      allowTopics: ["pricing", "support"],
      replyLength: "short"
    },
    
    // ── Page Integration ─────────
    autoContext: true, // Auto-reads your website DOM!
    contextSelector: "main",
    
    // ── UX & Form ───────────
    theme: {
      primaryColor: "#0ea5e9",
      darkMode: false,
    },
    controls: {
      modelSwitcher: true, // In-widget dropdown
      allowCopy: true
    }
  });
</script>
```

### Widget Configuration Options

| Option Category | Key Attributes | What it does |
|---|---|---|
| **Identity** | `assistantName`, `assistantAvatar`, `title`, `welcomeMessage`, `suggestedQuestions` | Brands the visual header of the widget and seeds clickable fast-prompts. |
| **Logic** | `allowTopics`, `blockTopics`, `personality`, `rules`, `replyLength` | Instructs the agent precisely on how to behave, what to say, and what to refuse. |
| **Theme** | `primaryColor`, `panelBackground`, `userBubbleColor`, `darkMode`, `shadow` | Modifies the exact CSS aesthetics of the widget to match your website UI. |
| **Controls** | `modelSwitcher`, `temperatureControl`, `maxTokensControl`, `allowClear`, `allowCopy` | Enables/Disables advanced UI toggles gear functions for your end users. |

---

## 💸 Token Budgeting

Restrict total API usage directly at the client level to prevent accidental cost overruns in production endpoints.

```ts
import { AIClient, TokenBudget } from "simple-ai-sdk";

const ai = new AIClient({ provider: "openai", apiKey: "sk-..." });
const budget = new TokenBudget({
  maxTokensPerRequest: 512,
  maxTokensPerSession: 5000,
  warnThreshold: 500,
  onWarn: (remaining) => console.warn(`⚠️ Low budget: ${remaining} tokens left`),
  onExhausted: () => console.error("Session budget exhausted!"),
});

const opts = budget.clamp({ temperature: 0.7 });
const reply = await ai.chat(messages, opts);

budget.record(promptTokens, completionTokens);
console.log(budget.usage);
// { sessionUsed: 320, sessionRemaining: 4680, requests: [...] }
```

---

## 🗄️ API Cache Optimizer

Collapse redundant network requests instantly. Saves API costs and load times for duplicate prompt executions.

```ts
import { AIClient } from "simple-ai-sdk";

const ai = new AIClient({ provider: "gemini", apiKey: "AIza..." });
const optimizer = ai.withOptimizer({ 
  cacheTtl: 60_000, // Duration in ms
  dedupeRequests: true // Prevents identical parallel requests
});

const reply1 = await optimizer.chat(messages);
const reply2 = await optimizer.chat(messages); // Instant cache hit 🔥

console.log(optimizer.stats);
// { hits: 1, misses: 1, size: 1, hitRate: "50%" }
```

---

## 🔙 Migrating from `simple-groq`

If you are upgrading from `simple-groq` v1.x.x, **your existing codebase will not break**. `simple-ai-sdk` internally exports `GroqClient` and `GroqError` as strict legacy aliases to the new unified models with default configs intact.

```ts
// Perfectly backward compatible
import { GroqClient } from "simple-ai-sdk"; 

const client = new GroqClient({ apiKey: "gsk_..." }); 
await client.ask("Hello");
```

---

## 📝 License

[MIT License](./LICENSE) © 2026 Adarsh
