/**
 * groq-client — A lightweight, zero-config Groq API wrapper for Node.js/TypeScript.
 * @module groq-client
 */

export type Role = "system" | "user" | "assistant" | "tool";

export interface Message {
  role: Role;
  content: string;
  name?: string;
}

export interface GroqClientOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string | string[];
  seed?: number;
  responseFormat?: { type: "json_object" | "text" };
}

export interface ChatOptions extends CompletionOptions {
  systemPrompt?: string;
}

export interface StreamOptions extends CompletionOptions {
  systemPrompt?: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  finishReason?: string | null;
}

export interface ChatHistory {
  readonly messages: Message[];
  add(role: Role, content: string): void;
  clear(): void;
}

interface GroqApiErrorBody {
  error?: { message?: string; type?: string; code?: string | number };
}

export const GROQ_MODELS = {
  LLAMA3_70B: "llama-3.3-70b-versatile",
  LLAMA3_8B: "llama-3.1-8b-instant",
  LLAMA3_70B_TOOL_USE: "llama3-groq-70b-8192-tool-use-preview",
  LLAMA3_8B_TOOL_USE: "llama3-groq-8b-8192-tool-use-preview",
  LLAMA3_70B_8192: "llama3-70b-8192",
  LLAMA3_8B_8192: "llama3-8b-8192",
  LLAMA_GUARD: "llama-guard-3-8b",
  MIXTRAL_8X7B: "mixtral-8x7b-32768",
  GEMMA2_9B: "gemma2-9b-it",
  GEMMA_7B: "gemma-7b-it",
  WHISPER_LARGE_V3: "whisper-large-v3",
  WHISPER_LARGE_V3_TURBO: "whisper-large-v3-turbo",
  DISTIL_WHISPER: "distil-whisper-large-v3-en",
} as const;

export type GroqModel = (typeof GROQ_MODELS)[keyof typeof GROQ_MODELS];

export class GroqError extends Error {
  readonly status?: number;
  readonly type?: string;
  readonly code?: string | number;

  constructor(message: string, options?: { status?: number; type?: string; code?: string | number }) {
    super(message);
    this.name = "GroqError";
    this.status = options?.status;
    this.type = options?.type;
    this.code = options?.code;
    Object.setPrototypeOf(this, GroqError.prototype);
  }
}

const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = GROQ_MODELS.LLAMA3_70B;
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 1;
const RETRYABLE_STATUSES = new Set([429, 503]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GroqClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(options: GroqClientOptions = {}) {
    const key =
      options.apiKey ??
      (typeof process !== "undefined" ? process.env["GROQ_API_KEY"] : undefined);

    if (!key) {
      throw new GroqError(
        "No API key provided. Pass `apiKey` in options or set the GROQ_API_KEY environment variable."
      );
    }

    this.apiKey = key;
    this.model = options.model ?? DEFAULT_MODEL;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private resolveModel(opts?: CompletionOptions): string {
    return opts?.model ?? this.model;
  }

  private buildBody(messages: Message[], opts: CompletionOptions | undefined, stream: boolean): string {
    const body: Record<string, unknown> = {
      model: this.resolveModel(opts),
      messages,
      stream,
    };
    if (opts?.temperature !== undefined) body["temperature"] = opts.temperature;
    if (opts?.maxTokens !== undefined) body["max_tokens"] = opts.maxTokens;
    if (opts?.topP !== undefined) body["top_p"] = opts.topP;
    if (opts?.stop !== undefined) body["stop"] = opts.stop;
    if (opts?.seed !== undefined) body["seed"] = opts.seed;
    if (opts?.responseFormat !== undefined) body["response_format"] = opts.responseFormat;
    return JSON.stringify(body);
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new GroqError(`Request timed out after ${this.timeout}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private async fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
    let lastError: GroqError | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) await sleep(1000 * 2 ** (attempt - 1));
      const res = await this.fetchWithTimeout(url, init);
      if (!RETRYABLE_STATUSES.has(res.status)) return res;
      lastError = await this.buildApiError(res);
      if (attempt === this.maxRetries) break;
    }
    throw lastError ?? new GroqError("Request failed after retries");
  }

  private async buildApiError(res: Response): Promise<GroqError> {
    let body: GroqApiErrorBody = {};
    try { body = (await res.json()) as GroqApiErrorBody; } catch {}
    return new GroqError(
      body.error?.message ?? `Groq API error: HTTP ${res.status}`,
      { status: res.status, type: body.error?.type, code: body.error?.code }
    );
  }

  private async throwIfError(res: Response): Promise<void> {
    if (!res.ok) throw await this.buildApiError(res);
  }

  /**
   * Send a multi-turn conversation and receive a single string response.
   * @example
   * ```ts
   * const reply = await groq.chat([{ role: "user", content: "Hello!" }]);
   * ```
   */
  async chat(messages: Message[], options?: CompletionOptions): Promise<string> {
    const res = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: this.buildBody(messages, options, false),
    });
    await this.throwIfError(res);
    const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content ?? "";
  }

  /**
   * Stream a response token-by-token. Works with `for await...of`.
   * @example
   * ```ts
   * for await (const chunk of groq.stream([{ role: "user", content: "Hi" }])) {
   *   process.stdout.write(chunk.content);
   * }
   * ```
   */
  async *stream(
    messages: Message[],
    options?: StreamOptions,
    onChunk?: (chunk: StreamChunk) => void
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const res = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: this.buildBody(messages, options, true),
    });
    await this.throwIfError(res);
    if (!res.body) throw new GroqError("Response body is null");

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const json = JSON.parse(trimmed.slice(6)) as {
            choices: Array<{ delta: { content?: string }; finish_reason?: string | null }>;
          };
          const choice = json.choices[0];
          if (!choice) continue;
          const chunk: StreamChunk = {
            content: choice.delta?.content ?? "",
            done: choice.finish_reason != null,
            finishReason: choice.finish_reason,
          };
          onChunk?.(chunk);
          yield chunk;
        } catch {}
      }
    }
  }

  /**
   * Shorthand: send a single user prompt and get the reply.
   * @example
   * ```ts
   * const answer = await groq.ask("What is 2 + 2?");
   * const answer = await groq.ask("Hello!", { systemPrompt: "You are a pirate." });
   * ```
   */
  async ask(prompt: string, options?: ChatOptions): Promise<string> {
    const messages: Message[] = [];
    if (options?.systemPrompt) messages.push({ role: "system", content: options.systemPrompt });
    messages.push({ role: "user", content: prompt });
    return this.chat(messages, options);
  }

  /**
   * Create a stateful chat history helper for multi-turn conversations.
   * @example
   * ```ts
   * const history = groq.createHistory();
   * history.add("user", "My name is Alice.");
   * const reply = await groq.chat(history.messages);
   * history.add("assistant", reply);
   * ```
   */
  createHistory(): ChatHistory {
    const _messages: Message[] = [];
    return {
      get messages(): Message[] { return [..._messages]; },
      add(role: Role, content: string): void { _messages.push({ role, content }); },
      clear(): void { _messages.length = 0; },
    };
  }
}
