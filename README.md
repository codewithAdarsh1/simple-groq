# simple-groq

[![npm version](https://img.shields.io/npm/v/simple-groq?color=brightgreen&style=flat-square)](https://www.npmjs.com/package/simple-groq)
[![bundle size](https://img.shields.io/bundlephobia/minzip/simple-groq?style=flat-square&label=minzipped)](https://bundlephobia.com/package/simple-groq)
[![license](https://img.shields.io/npm/l/simple-groq?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

> A lightweight, zero-config Groq API wrapper for Node.js & browsers. Simpler and smaller than the official SDK.

---

## Features

- ⚡ **Zero dependencies** — uses native `fetch` only
- 🔒 **Full TypeScript** — complete types and JSDoc
- 🌊 **Streaming first** — works with `for await...of`
- 💬 **Chat history** — built-in multi-turn helper
- 📦 **Dual ESM + CJS** — works everywhere
- 🪶 **< 5 KB** minified + gzipped

---

## Install

```bash
npm install simple-groq
# or
yarn add simple-groq
# or
pnpm add simple-groq
```

---

## Quick Start

```ts
import { GroqClient } from "simple-groq";

const groq = new GroqClient({ apiKey: "gsk_..." });
const answer = await groq.ask("What is the capital of France?");
console.log(answer); // "Paris"
```

> **Note:** The above example uses ES Modules (`import`). Ensure you have `"type": "module"` in your `package.json`. If you are using CommonJS, use `const { GroqClient } = require("simple-groq");` and wrap your `await` in an async function.

---

## Environment Variable

Set `GROQ_API_KEY` in your environment and skip the `apiKey` option entirely:

```bash
export GROQ_API_KEY=gsk_your_key_here
```

```ts
const groq = new GroqClient(); // reads GROQ_API_KEY automatically
```

---

## API Reference

### `new GroqClient(options?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `process.env.GROQ_API_KEY` | Your Groq API key |
| `model` | `string` | `llama-3.3-70b-versatile` | Default model |
| `baseUrl` | `string` | Groq API URL | Override base URL |
| `timeout` | `number` | `30000` | Request timeout (ms) |

---

### `.ask(prompt, options?)` → `Promise<string>`

Single-prompt shorthand. Creates a one-message `user` conversation.

```ts
const reply = await groq.ask("Explain black holes in one sentence.");
```

---

### `.chat(messages, options?)` → `Promise<string>`

Send a full array of messages; returns the assistant reply as a string.

```ts
const reply = await groq.chat([
  { role: "system", content: "You are a pirate. Speak accordingly." },
  { role: "user",   content: "Describe the ocean." },
]);
```

---

### `.stream(messages, options?, onChunk?)` → `AsyncGenerator<StreamChunk>`

Stream tokens as they are generated. Compatible with `for await...of`.

```ts
for await (const chunk of groq.stream([{ role: "user", content: "Tell me a story." }])) {
  process.stdout.write(chunk.content);
  if (chunk.done) console.log("\n--- done ---");
}
```

`onChunk` is an optional callback invoked for every chunk (useful in environments that prefer callbacks):

```ts
groq.stream(messages, {}, (chunk) => process.stdout.write(chunk.content));
```

---

### `.createHistory()` → `ChatHistory`

Returns a stateful helper for multi-turn conversations.

```ts
const history = groq.createHistory();

history.add("system", "You are a helpful assistant.");
history.add("user", "My name is Alice.");

const reply1 = await groq.chat(history.messages);
history.add("assistant", reply1);

history.add("user", "What is my name?");
const reply2 = await groq.chat(history.messages);
console.log(reply2); // "Your name is Alice."

history.clear(); // reset
```

| Property / Method | Description |
|---|---|
| `.messages` | Returns a copy of the current message array |
| `.add(role, content)` | Appends a message |
| `.clear()` | Removes all messages |

---

### `CompletionOptions`

All request methods accept an optional `CompletionOptions` object:

| Field | Type | Description |
|---|---|---|
| `model` | `string` | Override model for this request |
| `temperature` | `number` | Sampling temperature (0–2) |
| `maxTokens` | `number` | Max tokens to generate |
| `topP` | `number` | Top-p probability mass |
| `stop` | `string \| string[]` | Stop sequences |
| `seed` | `number` | Reproducibility seed |
| `responseFormat` | `{ type: "json_object" \| "text" }` | Output format |

---

## Available Models

```ts
import { GROQ_MODELS } from "simple-groq";
```

| Constant | Model ID |
|---|---|
| `GROQ_MODELS.LLAMA3_70B` | `llama-3.3-70b-versatile` |
| `GROQ_MODELS.LLAMA3_8B` | `llama-3.1-8b-instant` |
| `GROQ_MODELS.LLAMA3_70B_TOOL_USE` | `llama3-groq-70b-8192-tool-use-preview` |
| `GROQ_MODELS.LLAMA3_8B_TOOL_USE` | `llama3-groq-8b-8192-tool-use-preview` |
| `GROQ_MODELS.LLAMA3_70B_8192` | `llama3-70b-8192` |
| `GROQ_MODELS.LLAMA3_8B_8192` | `llama3-8b-8192` |
| `GROQ_MODELS.MIXTRAL_8X7B` | `mixtral-8x7b-32768` |
| `GROQ_MODELS.GEMMA2_9B` | `gemma2-9b-it` |
| `GROQ_MODELS.GEMMA_7B` | `gemma-7b-it` |
| `GROQ_MODELS.LLAMA_GUARD` | `llama-guard-3-8b` |
| `GROQ_MODELS.WHISPER_LARGE_V3` | `whisper-large-v3` |
| `GROQ_MODELS.WHISPER_LARGE_V3_TURBO` | `whisper-large-v3-turbo` |
| `GROQ_MODELS.DISTIL_WHISPER` | `distil-whisper-large-v3-en` |

---

## Error Handling

All API errors throw a `GroqError` with helpful metadata:

```ts
import { GroqClient, GroqError } from "simple-groq";

try {
  const reply = await groq.ask("Hello");
} catch (err) {
  if (err instanceof GroqError) {
    console.error(err.message);  // human-readable message
    console.error(err.status);   // HTTP status code
    console.error(err.type);     // Groq error type
    console.error(err.code);     // Groq error code
  }
}
```

---

## Streaming Example

```ts
import { GroqClient } from "simple-groq";

const groq = new GroqClient({ apiKey: process.env.GROQ_API_KEY });

const messages = [{ role: "user" as const, content: "Write a haiku about TypeScript." }];

process.stdout.write("Assistant: ");
for await (const chunk of groq.stream(messages)) {
  process.stdout.write(chunk.content);
}
console.log();
```

---

## Chat History Example

```ts
import { GroqClient } from "simple-groq";

const groq = new GroqClient();
const history = groq.createHistory();

history.add("system", "You are a concise assistant.");
history.add("user", "Remember: my lucky number is 42.");

const r1 = await groq.chat(history.messages);
history.add("assistant", r1);

history.add("user", "What is my lucky number?");
const r2 = await groq.chat(history.messages);
console.log(r2); // "Your lucky number is 42."
```

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the repo
2. Create your feature branch (`git checkout -b feat/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feat/my-feature`)
5. Open a Pull Request

---

## License

[MIT](./LICENSE) © simple-groq contributors
