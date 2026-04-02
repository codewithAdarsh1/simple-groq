/**
 * simple-ai-sdk v2.0.0
 * Universal multi-provider AI SDK — zero dependencies, pure fetch.
 * Supports 17 providers: Groq, OpenAI, Gemini, Claude, Grok, Qwen,
 * Nvidia, Ollama, Mistral, DeepSeek, Cohere, Together, Perplexity,
 * Fireworks, Cerebras, Azure OpenAI, Moonshot/Kimi.
 */

// ─── Re-export core types ─────────────────────────────────────────────────────
export type { Role, Message, CompletionOptions, StreamChunk, ProviderAdapter } from "./providers/base";
export { AIError, sleep, stripMarkdownText } from "./providers/base";

import type { Message, CompletionOptions, StreamChunk, ProviderAdapter } from "./providers/base";
import { AIError, sleep, stripMarkdownText } from "./providers/base";

// ─── Provider adapters ────────────────────────────────────────────────────────
import { GroqAdapter }        from "./providers/groq";
import { OpenAIAdapter }      from "./providers/openai";
import { GeminiAdapter }      from "./providers/gemini";
import { AnthropicAdapter }   from "./providers/anthropic";
import { GrokAdapter }        from "./providers/grok";
import { QwenAdapter }        from "./providers/qwen";
import { NvidiaAdapter }      from "./providers/nvidia";
import { OllamaAdapter }      from "./providers/ollama";
import { MistralAdapter }     from "./providers/mistral";
import { DeepSeekAdapter }    from "./providers/deepseek";
import { CohereAdapter }      from "./providers/cohere";
import { TogetherAdapter }    from "./providers/together";
import { PerplexityAdapter }  from "./providers/perplexity";
import { FireworksAdapter }   from "./providers/fireworks";
import { CerebrasAdapter }    from "./providers/cerebras";
import { AzureAdapter }       from "./providers/azure";
import { MoonshotAdapter }    from "./providers/moonshot";

// ─── Provider name union ──────────────────────────────────────────────────────
export type ProviderName =
  | "groq" | "openai" | "gemini" | "anthropic" | "grok"
  | "qwen" | "nvidia" | "ollama" | "mistral" | "deepseek"
  | "cohere" | "together" | "perplexity" | "fireworks"
  | "cerebras" | "azure" | "moonshot";

// ─── Model constants ──────────────────────────────────────────────────────────
export const GROQ_MODELS = {
  LLAMA3_70B: "llama-3.3-70b-versatile",
  LLAMA3_8B:  "llama-3.1-8b-instant",
  LLAMA3_70B_TOOL: "llama3-groq-70b-8192-tool-use-preview",
  MIXTRAL_8X7B: "mixtral-8x7b-32768",
  GEMMA2_9B: "gemma2-9b-it",
  LLAMA_GUARD: "llama-guard-3-8b",
  WHISPER_LARGE_V3: "whisper-large-v3",
} as const;

export const OPENAI_MODELS = {
  GPT4O: "gpt-4o",
  GPT4O_MINI: "gpt-4o-mini",
  O1: "o1",
  O1_MINI: "o1-mini",
  O3_MINI: "o3-mini",
  GPT4_TURBO: "gpt-4-turbo",
  GPT35_TURBO: "gpt-3.5-turbo",
} as const;

export const GEMINI_MODELS = {
  GEMINI_2_FLASH:   "gemini-2.0-flash",
  GEMINI_2_PRO:     "gemini-2.0-pro-exp",
  GEMINI_15_FLASH:  "gemini-1.5-flash",
  GEMINI_15_PRO:    "gemini-1.5-pro",
  GEMINI_15_FLASH_8B: "gemini-1.5-flash-8b",
} as const;

export const CLAUDE_MODELS = {
  CLAUDE_35_SONNET: "claude-3-5-sonnet-20241022",
  CLAUDE_35_HAIKU:  "claude-3-5-haiku-latest",
  CLAUDE_3_OPUS:    "claude-3-opus-20240229",
  CLAUDE_3_HAIKU:   "claude-3-haiku-20240307",
} as const;

export const GROK_MODELS = {
  GROK_2:       "grok-2-latest",
  GROK_2_MINI:  "grok-2-mini",
  GROK_VISION:  "grok-2-vision-1212",
} as const;

export const MISTRAL_MODELS = {
  LARGE:        "mistral-large-latest",
  SMALL:        "mistral-small-latest",
  CODESTRAL:    "codestral-latest",
  NEMO:         "open-mistral-nemo",
} as const;

export const DEEPSEEK_MODELS = {
  CHAT:       "deepseek-chat",
  REASONER:   "deepseek-reasoner",
  CODER:      "deepseek-coder",
} as const;

export const QWEN_MODELS = {
  MAX:        "qwen-max",
  PLUS:       "qwen-plus",
  TURBO:      "qwen-turbo",
  CODER:      "qwen-coder-plus",
} as const;

export const COHERE_MODELS = {
  COMMAND_R_PLUS: "command-r-plus-08-2024",
  COMMAND_R:      "command-r-08-2024",
  COMMAND_LIGHT:  "command-light",
} as const;

export const NVIDIA_MODELS = {
  LLAMA3_70B: "meta/llama-3.1-70b-instruct",
  LLAMA3_8B:  "meta/llama-3.1-8b-instruct",
  MISTRAL:    "mistralai/mistral-7b-instruct-v0.3",
  NEMOTRON:   "nvidia/nemotron-4-340b-instruct",
} as const;

export const PERPLEXITY_MODELS = {
  SONAR:       "sonar",
  SONAR_PRO:   "sonar-pro",
  SONAR_REASONING: "sonar-reasoning",
} as const;

export const MOONSHOT_MODELS = {
  V1_8K:   "moonshot-v1-8k",
  V1_32K:  "moonshot-v1-32k",
  V1_128K: "moonshot-v1-128k",
} as const;

// ─── Cost table (USD per 1M tokens) ──────────────────────────────────────────
const COST_TABLE: Record<string, { input: number; output: number }> = {
  // Groq
  "llama-3.3-70b-versatile": { input: 0.59,  output: 0.79  },
  "llama-3.1-8b-instant":    { input: 0.05,  output: 0.08  },
  "mixtral-8x7b-32768":      { input: 0.24,  output: 0.24  },
  // OpenAI
  "gpt-4o":       { input: 5.00,  output: 15.00 },
  "gpt-4o-mini":  { input: 0.15,  output: 0.60  },
  "o1":           { input: 15.00, output: 60.00 },
  "o1-mini":      { input: 1.10,  output: 4.40  },
  "o3-mini":      { input: 1.10,  output: 4.40  },
  // Gemini
  "gemini-2.0-flash":  { input: 0.10,  output: 0.40  },
  "gemini-1.5-flash":  { input: 0.075, output: 0.30  },
  "gemini-1.5-pro":    { input: 3.50,  output: 10.50 },
  // Claude
  "claude-3-5-sonnet-20241022": { input: 3.00,  output: 15.00 },
  "claude-3-5-haiku-latest":    { input: 0.80,  output: 4.00  },
  "claude-3-opus-20240229":     { input: 15.00, output: 75.00 },
  // Grok
  "grok-2-latest": { input: 2.00, output: 10.00 },
  // DeepSeek
  "deepseek-chat":     { input: 0.27, output: 1.10 },
  "deepseek-reasoner": { input: 0.55, output: 2.19 },
  // Mistral
  "mistral-large-latest": { input: 2.00, output: 6.00 },
  "mistral-small-latest": { input: 0.20, output: 0.60 },
  // Cohere
  "command-r-plus-08-2024": { input: 2.50, output: 10.00 },
  "command-r-08-2024":      { input: 0.15, output: 0.60  },
  // Perplexity
  "sonar":     { input: 1.00, output: 1.00 },
  "sonar-pro": { input: 3.00, output: 15.00 },
};

function estimateCostUSD(model: string, inputTokens: number, outputTokens: number): number {
  const rates = COST_TABLE[model];
  if (!rates) return 0;
  return (rates.input * inputTokens + rates.output * outputTokens) / 1_000_000;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.35);
}

// ─── Multi-key rotation ───────────────────────────────────────────────────────
class MultiKeyManager {
  private keys: string[];
  private cooldown = new Map<string, number>();
  private idx = 0;

  constructor(keys: string[]) {
    this.keys = [...keys];
  }

  get(): string {
    const now = Date.now();
    for (let i = 0; i < this.keys.length; i++) {
      const k = this.keys[(this.idx + i) % this.keys.length]!;
      const coolsAt = this.cooldown.get(k) ?? 0;
      if (now >= coolsAt) {
        this.idx = (this.idx + i + 1) % this.keys.length;
        return k;
      }
    }
    // All in cooldown — return least-recently cooled
    return this.keys[this.idx % this.keys.length]!;
  }

  markCooldown(key: string, ms = 60_000): void {
    this.cooldown.set(key, Date.now() + ms);
  }
}

// ─── Context window guard ──────────────────────────────────────────────────────
function trimMessages(messages: Message[], limit: number): Message[] {
  const system = messages.filter((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");
  let tokens = system.reduce((s, m) => s + estimateTokens(m.content), 0);
  const kept: Message[] = [];
  // Walk from newest to oldest
  for (let i = rest.length - 1; i >= 0; i--) {
    const t = estimateTokens(rest[i]!.content);
    if (tokens + t > limit * 0.9) break;
    tokens += t;
    kept.unshift(rest[i]!);
  }
  return [...system, ...kept];
}

// ─── JSON repair ──────────────────────────────────────────────────────────────
function repairJSON(raw: string): string {
  // Strip markdown code fences
  let s = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  // Strip leading/trailing text before first { or [
  const jsonStart = s.search(/[{[]/);
  if (jsonStart > 0) s = s.slice(jsonStart);
  const jsonEnd = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (jsonEnd >= 0 && jsonEnd < s.length - 1) s = s.slice(0, jsonEnd + 1);
  // Fix trailing commas
  s = s.replace(/,\s*([}\]])/g, "$1");
  // Attempt parse — return as-is if successful
  try { JSON.parse(s); return s; } catch {}
  // Last resort: wrap in quotes if it looks like a bare string
  return s;
}

function schemaToPrompt(schema: Record<string, unknown>): string {
  return `Respond with ONLY valid JSON matching this schema:\n${JSON.stringify(schema, null, 2)}\nNo explanation, no markdown, no extra text.`;
}

// ─── Cost tracker ──────────────────────────────────────────────────────────────
export interface CostEntry {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  timestamp: number;
}

export class CostTracker {
  private _entries: CostEntry[] = [];

  record(model: string, input: string | number, output: string | number): CostEntry {
    const inputTokens = typeof input === "number" ? input : estimateTokens(input);
    const outputTokens = typeof output === "number" ? output : estimateTokens(output);
    const costUSD = estimateCostUSD(model, inputTokens, outputTokens);
    const entry: CostEntry = { model, inputTokens, outputTokens, costUSD, timestamp: Date.now() };
    this._entries.push(entry);
    return entry;
  }

  get totalUSD(): number {
    return this._entries.reduce((s, e) => s + e.costUSD, 0);
  }

  get entries(): CostEntry[] {
    return [...this._entries];
  }

  get summary(): { totalUSD: string; requests: number } {
    return { totalUSD: `$${this.totalUSD.toFixed(6)}`, requests: this._entries.length };
  }

  reset(): void { this._entries = []; }
}

// ─── Abortable stream ──────────────────────────────────────────────────────────
export interface AbortableStream extends AsyncIterable<StreamChunk> {
  cancel(): void;
}

// ─── Provider factory ────────────────────────────────────────────────────────
function makeAdapter(
  provider: ProviderName,
  baseUrl?: string,
  azureModel?: string
): ProviderAdapter {
  switch (provider) {
    case "groq":        return new GroqAdapter();
    case "openai":      return new OpenAIAdapter();
    case "gemini":      return new GeminiAdapter();
    case "anthropic":   return new AnthropicAdapter();
    case "grok":        return new GrokAdapter();
    case "qwen":        return new QwenAdapter();
    case "nvidia":      return new NvidiaAdapter();
    case "ollama":      return new OllamaAdapter(baseUrl);
    case "mistral":     return new MistralAdapter();
    case "deepseek":    return new DeepSeekAdapter();
    case "cohere":      return new CohereAdapter();
    case "together":    return new TogetherAdapter();
    case "perplexity":  return new PerplexityAdapter();
    case "fireworks":   return new FireworksAdapter();
    case "cerebras":    return new CerebrasAdapter();
    case "azure":       return new AzureAdapter({ baseUrl: baseUrl ?? "", model: azureModel });
    case "moonshot":    return new MoonshotAdapter();
    default:            throw new AIError(`Unknown provider: ${provider as string}`);
  }
}

// ─── Fallback config ──────────────────────────────────────────────────────────
export interface FallbackConfig {
  provider: ProviderName;
  apiKey?: string;
  apiKeys?: string[];
  model?: string;
}

// ─── AIClient options ─────────────────────────────────────────────────────────
export interface AIClientOptions {
  provider?: ProviderName;
  apiKey?: string;
  /** Multiple keys — rotated round-robin, cooled on 429 */
  apiKeys?: string[];
  model?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  /** Fallback providers tried in order on error */
  fallback?: FallbackConfig[];
  /** Auto-trim messages to stay within context window */
  contextWindowSafe?: boolean;
  /** Enable cost tracking via client.cost */
  costTracker?: boolean;
  /** Strip markdown from all responses */
  stripMarkdown?: boolean;
}

export interface ChatOptions extends CompletionOptions {
  systemPrompt?: string;
}

export interface StreamOptions extends CompletionOptions {
  systemPrompt?: string;
}

// ─── Chat history ─────────────────────────────────────────────────────────────
export interface ChatHistory {
  readonly messages: Message[];
  add(role: import("./providers/base").Role, content: string): void;
  clear(): void;
}

// ─── Main AIClient ────────────────────────────────────────────────────────────
export class AIClient {
  private readonly adapter: ProviderAdapter;
  private readonly keyMgr: MultiKeyManager;
  private readonly provider: ProviderName;
  private readonly defaultModel: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly fallbacks: Array<{ adapter: ProviderAdapter; keyMgr: MultiKeyManager; model?: string }>;
  private readonly contextWindowSafe: boolean;
  private readonly _stripMarkdown: boolean;
  readonly cost: CostTracker | null;

  constructor(opts: AIClientOptions = {}) {
    this.provider = opts.provider ?? "groq";
    this.adapter = makeAdapter(this.provider, opts.baseUrl, opts.model);
    this.defaultModel = opts.model ?? this.adapter.defaultModel;
    this.timeout = opts.timeout ?? 30_000;
    this.maxRetries = opts.maxRetries ?? 1;
    this.contextWindowSafe = opts.contextWindowSafe ?? false;
    this._stripMarkdown = opts.stripMarkdown ?? false;
    this.cost = opts.costTracker ? new CostTracker() : null;

    const keys = opts.apiKeys?.length
      ? opts.apiKeys
      : opts.apiKey
      ? [opts.apiKey]
      : typeof process !== "undefined" && process.env
      ? [process.env[`${this.provider.toUpperCase()}_API_KEY`] ?? process.env["AI_API_KEY"] ?? ""]
      : [""];
    this.keyMgr = new MultiKeyManager(keys);

    this.fallbacks = (opts.fallback ?? []).map((fb) => ({
      adapter: makeAdapter(fb.provider),
      keyMgr: new MultiKeyManager(fb.apiKeys?.length ? fb.apiKeys : fb.apiKey ? [fb.apiKey] : [""]),
      model: fb.model,
    }));
  }

  private resolveModel(opts?: CompletionOptions): string {
    return opts?.model ?? this.defaultModel;
  }

  private prepareMessages(messages: Message[]): Message[] {
    if (!this.contextWindowSafe) return messages;
    return trimMessages(messages, this.adapter.contextLimit);
  }

  private postProcess(text: string): string {
    return this._stripMarkdown ? stripMarkdownText(text) : text;
  }

  private async withRetryAndFallback<T>(
    fn: (adapter: ProviderAdapter, key: string) => Promise<T>
  ): Promise<T> {
    const targets = [
      { adapter: this.adapter, keyMgr: this.keyMgr },
      ...this.fallbacks,
    ];

    let lastErr: unknown;
    for (const target of targets) {
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        if (attempt > 0) await sleep(1000 * 2 ** (attempt - 1));
        const key = target.keyMgr.get();
        try {
          return await fn(target.adapter, key);
        } catch (err) {
          const status = (err as AIError).status;
          if (status === 429) target.keyMgr.markCooldown(key, 60_000);
          lastErr = err;
          if (status && status < 500 && status !== 429) break; // non-retryable
        }
      }
    }
    throw lastErr;
  }

  /** Chat: send messages, get string back. */
  async chat(messages: Message[], opts?: CompletionOptions): Promise<string> {
    const prepared = this.prepareMessages(messages);
    const model = this.resolveModel(opts);
    const result = await this.withRetryAndFallback((ad, key) =>
      ad.chat(prepared, { ...opts, model }, key)
    );
    const text = this.postProcess(result);
    if (this.cost) {
      const inp = prepared.reduce((s, m) => s + estimateTokens(m.content), 0);
      this.cost.record(model, inp, text);
    }
    return text;
  }

  /** Ask: send a single prompt string, get string back. */
  async ask(prompt: string, opts?: ChatOptions): Promise<string> {
    const messages: Message[] = [];
    if (opts?.systemPrompt) messages.push({ role: "system", content: opts.systemPrompt });
    messages.push({ role: "user", content: prompt });
    return this.chat(messages, opts);
  }

  /**
   * Ask and get parsed JSON back.
   * Automatically repairs broken JSON and retries up to 3 times.
   */
  async askJSON<T = unknown>(prompt: string, opts?: ChatOptions): Promise<T> {
    const sysPrefix = "Respond with ONLY valid JSON. No explanation, no markdown fences.";
    const augmented: ChatOptions = {
      ...opts,
      systemPrompt: opts?.systemPrompt ? `${opts.systemPrompt}\n${sysPrefix}` : sysPrefix,
    };
    for (let attempt = 0; attempt < 3; attempt++) {
      const raw = await this.ask(attempt === 0 ? prompt : `${prompt}\n\nReturn ONLY raw JSON, no markdown.`, augmented);
      const repaired = repairJSON(raw);
      try {
        return JSON.parse(repaired) as T;
      } catch {}
    }
    throw new AIError("Failed to get valid JSON after 3 attempts.");
  }

  /**
   * Ask and validate response against a schema.
   * Retries with schema injected into system prompt on failure.
   */
  async askStructured<T = unknown>(
    prompt: string,
    schema: Record<string, unknown>,
    opts?: ChatOptions
  ): Promise<T> {
    const schemaPrompt = schemaToPrompt(schema);
    const augmented: ChatOptions = {
      ...opts,
      systemPrompt: opts?.systemPrompt ? `${opts.systemPrompt}\n${schemaPrompt}` : schemaPrompt,
    };
    for (let attempt = 0; attempt < 3; attempt++) {
      const raw = await this.ask(prompt, augmented);
      const repaired = repairJSON(raw);
      try {
        const parsed = JSON.parse(repaired) as T;
        // Basic schema key validation
        const required = Object.keys(schema).filter(
          (k) => !k.startsWith("$") && k !== "type" && k !== "description"
        );
        if (required.every((k) => k in (parsed as object))) return parsed;
      } catch {}
    }
    throw new AIError("Failed to get structured response matching schema after 3 attempts.");
  }

  /**
   * Stream: returns an AbortableStream you can iterate and cancel.
   * @example
   * const s = client.stream([{ role: "user", content: "Hi" }]);
   * for await (const chunk of s) process.stdout.write(chunk.content);
   * // or: s.cancel()
   */
  stream(messages: Message[], opts?: StreamOptions): AbortableStream {
    const prepared = this.prepareMessages(messages);
    const model = this.resolveModel(opts);
    const controller = new AbortController();
    const self = this;

    const iterable: AbortableStream = {
      cancel() { controller.abort(); },
      [Symbol.asyncIterator](): AsyncIterator<StreamChunk> {
        const targets = [
          { adapter: self.adapter, keyMgr: self.keyMgr },
          ...self.fallbacks,
        ];
        let gen: AsyncGenerator<StreamChunk, void, unknown> | null = null;
        let targetIdx = 0;

        async function* combinedGen(): AsyncGenerator<StreamChunk, void, unknown> {
          while (targetIdx < targets.length) {
            const target = targets[targetIdx]!;
            const key = target.keyMgr.get();
            try {
              gen = target.adapter.stream(prepared, { ...opts, model }, key, controller.signal);
              for await (const chunk of gen) {
                if (controller.signal.aborted) return;
                yield chunk;
              }
              return;
            } catch (err) {
              if (controller.signal.aborted) return;
              targetIdx++;
              if (targetIdx >= targets.length) throw err;
            }
          }
        }
        return combinedGen()[Symbol.asyncIterator]();
      },
    };
    return iterable;
  }

  /** Create a reusable chat history object. */
  createHistory(): ChatHistory {
    const _messages: Message[] = [];
    return {
      get messages(): Message[] { return [..._messages]; },
      add(role, content) { _messages.push({ role, content }); },
      clear() { _messages.length = 0; },
    };
  }

  /** Exposes the resolved default model string (used by embedChat). */
  get resolvedDefaultModel(): string {
    return this.defaultModel;
  }

  /** Wrap with response caching + deduplication. */
  withOptimizer(options?: ApiOptimizerOptions): ApiOptimizer {
    return new ApiOptimizer(this, options);
  }

  /** Create a token budget controller. */
  static createBudget(options?: TokenBudgetOptions): TokenBudget {
    return new TokenBudget(options);
  }
}

// ─── Convenience factory ──────────────────────────────────────────────────────
export function createClient(
  provider: ProviderName,
  apiKey: string,
  opts?: Omit<AIClientOptions, "provider" | "apiKey">
): AIClient {
  return new AIClient({ provider, apiKey, ...opts });
}

// ─── TokenBudget ──────────────────────────────────────────────────────────────
export interface TokenBudgetOptions {
  maxTokensPerRequest?: number;
  maxTokensPerSession?: number;
  warnThreshold?: number;
  onWarn?: (remaining: number) => void;
  onExhausted?: () => void;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  sessionTotal: number;
  sessionRemaining: number;
}

export class TokenBudget {
  private readonly maxPerRequest: number;
  private readonly maxPerSession: number;
  private readonly warnThreshold: number;
  private readonly onWarn?: (remaining: number) => void;
  private readonly onExhausted?: () => void;
  private sessionUsed = 0;
  private requests: TokenUsage[] = [];

  constructor(options: TokenBudgetOptions = {}) {
    this.maxPerRequest  = options.maxTokensPerRequest ?? 1024;
    this.maxPerSession  = options.maxTokensPerSession ?? Infinity;
    this.warnThreshold  = options.warnThreshold ?? 500;
    this.onWarn         = options.onWarn;
    this.onExhausted    = options.onExhausted;
  }

  clamp(opts: CompletionOptions = {}): CompletionOptions {
    const remaining = this.sessionRemaining;
    if (remaining <= 0) { this.onExhausted?.(); throw new AIError("Token session budget exhausted."); }
    const clampedMax = Math.min(opts.maxTokens ?? this.maxPerRequest, remaining, this.maxPerRequest);
    return { ...opts, maxTokens: clampedMax };
  }

  record(promptTokens: number, completionTokens: number): TokenUsage {
    const total = promptTokens + completionTokens;
    this.sessionUsed += total;
    const remaining = this.sessionRemaining;
    if (remaining <= this.warnThreshold && remaining > 0) this.onWarn?.(remaining);
    if (remaining <= 0) this.onExhausted?.();
    const entry: TokenUsage = { promptTokens, completionTokens, totalTokens: total, sessionTotal: this.sessionUsed, sessionRemaining: remaining };
    this.requests.push(entry);
    return entry;
  }

  get sessionRemaining(): number { return Math.max(0, this.maxPerSession - this.sessionUsed); }
  get usage() { return { sessionUsed: this.sessionUsed, sessionRemaining: this.sessionRemaining, requests: [...this.requests] }; }
  static estimate(text: string): number { return Math.ceil(text.split(/\s+/).length * 1.35); }
  reset(): void { this.sessionUsed = 0; this.requests = []; }
}

// ─── ApiOptimizer ─────────────────────────────────────────────────────────────
export interface ApiOptimizerOptions {
  cacheTtl?: number;
  maxCacheSize?: number;
  dedupeRequests?: boolean;
}

interface CacheEntry { value: string; expiresAt: number; }

export class ApiOptimizer {
  private readonly client: AIClient;
  private readonly cacheTtl: number;
  private readonly maxCacheSize: number;
  private readonly dedupeRequests: boolean;
  private cache = new Map<string, CacheEntry>();
  private inFlight = new Map<string, Promise<string>>();
  private hits = 0;
  private misses = 0;

  constructor(client: AIClient, options: ApiOptimizerOptions = {}) {
    this.client = client;
    this.cacheTtl = options.cacheTtl ?? 5 * 60 * 1000;
    this.maxCacheSize = options.maxCacheSize ?? 100;
    this.dedupeRequests = options.dedupeRequests ?? true;
  }

  private key(messages: Message[], opts?: CompletionOptions): string {
    return JSON.stringify({ messages, opts });
  }
  private evictExpired(): void {
    const now = Date.now();
    for (const [k, v] of this.cache) { if (v.expiresAt < now) this.cache.delete(k); }
  }
  private evictOldest(): void {
    const first = this.cache.keys().next().value;
    if (first !== undefined) this.cache.delete(first);
  }

  async chat(messages: Message[], opts?: CompletionOptions): Promise<string> {
    const k = this.key(messages, opts);
    this.evictExpired();
    const cached = this.cache.get(k);
    if (cached && cached.expiresAt > Date.now()) { this.hits++; return cached.value; }
    if (this.dedupeRequests) {
      const existing = this.inFlight.get(k);
      if (existing) return existing;
    }
    this.misses++;
    const req = this.client.chat(messages, opts).then((r) => {
      if (this.cache.size >= this.maxCacheSize) this.evictOldest();
      this.cache.set(k, { value: r, expiresAt: Date.now() + this.cacheTtl });
      this.inFlight.delete(k);
      return r;
    }).catch((e) => { this.inFlight.delete(k); throw e; });
    if (this.dedupeRequests) this.inFlight.set(k, req);
    return req;
  }

  invalidate(messages: Message[], opts?: CompletionOptions): void { this.cache.delete(this.key(messages, opts)); }
  clearCache(): void { this.cache.clear(); }
  get stats() {
    const total = this.hits + this.misses;
    return { hits: this.hits, misses: this.misses, size: this.cache.size, hitRate: total === 0 ? "0%" : `${Math.round((this.hits / total) * 100)}%` };
  }
}


// ─── Backward compatibility ───────────────────────────────────────────────────
/** @deprecated Use AIClient instead */
export class GroqClient extends AIClient {
  constructor(opts: { apiKey?: string; model?: string; baseUrl?: string; timeout?: number; maxRetries?: number } = {}) {
    super({ provider: "groq", ...opts });
  }
}

/** @deprecated Use AIError instead */
export class GroqError extends AIError {}

export type GroqModel = (typeof GROQ_MODELS)[keyof typeof GROQ_MODELS];
