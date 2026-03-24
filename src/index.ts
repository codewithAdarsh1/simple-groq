/**
 * groq-client — A lightweight, zero-config Groq API wrapper for Node.js/TypeScript.
 * @module groq-client
 */

// ─────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────

/** Available role values for a chat message. */
export type Role = "system" | "user" | "assistant" | "tool";

/** A single chat message. */
export interface Message {
  role: Role;
  content: string;
  name?: string;
}

/** Options accepted when constructing a {@link GroqClient}. */
export interface GroqClientOptions {
  /** Your Groq API key. Falls back to `process.env.GROQ_API_KEY`. */
  apiKey?: string;
  /** Override the default model. Defaults to `llama-3.3-70b-versatile`. */
  model?: string;
  /** Base URL for the Groq API. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 30 000. */
  timeout?: number;
}

/** Per-request inference options forwarded to the Groq API. */
export interface CompletionOptions {
  /** Model to use for this request only. */
  model?: string;
  /** Sampling temperature (0–2). */
  temperature?: number;
  /** Maximum tokens to generate. */
  maxTokens?: number;
  /** Top-p probability mass. */
  topP?: number;
  /** Stop sequences. */
  stop?: string | string[];
  /** Seed for reproducibility. */
  seed?: number;
  /** Response format. */
  responseFormat?: { type: "json_object" | "text" };
}

/** A single token chunk yielded during streaming. */
export interface StreamChunk {
  /** The text delta for this chunk. */
  content: string;
  /** Whether this is the final chunk. */
  done: boolean;
  /** Finish reason if done. */
  finishReason?: string | null;
}

/** Chat history helper returned by {@link GroqClient.createHistory}. */
export interface ChatHistory {
  /** All messages in the history. */
  readonly messages: Message[];
  /**
   * Add a message to the history.
   * @param role - Message role.
   * @param content - Message content.
   */
  add(role: Role, content: string): void;
  /** Clear all messages. */
  clear(): void;
}

/** Groq API error response shape. */
interface GroqApiErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: string | number;
  };
}

// ─────────────────────────────────────────────
// Model Constants
// ─────────────────────────────────────────────

/**
 * Curated list of currently available Groq-hosted models.
 * Use these identifiers in `model` options or the `GroqClientOptions` constructor.
 *
 * @example
 * ```ts
 * import { GROQ_MODELS } from "groq-client";
 * const client = new GroqClient({ model: GROQ_MODELS.LLAMA3_70B });
 * ```
 */
export const GROQ_MODELS = {
  // Llama family
  LLAMA3_70B: "llama-3.3-70b-versatile",
  LLAMA3_8B: "llama-3.1-8b-instant",
  LLAMA3_70B_TOOL_USE: "llama3-groq-70b-8192-tool-use-preview",
  LLAMA3_8B_TOOL_USE: "llama3-groq-8b-8192-tool-use-preview",
  LLAMA3_70B_8192: "llama3-70b-8192",
  LLAMA3_8B_8192: "llama3-8b-8192",
  LLAMA_GUARD: "llama-guard-3-8b",
  // Mixtral family
  MIXTRAL_8X7B: "mixtral-8x7b-32768",
  // Gemma family
  GEMMA2_9B: "gemma2-9b-it",
  GEMMA_7B: "gemma-7b-it",
  // Whisper (audio — for reference)
  WHISPER_LARGE_V3: "whisper-large-v3",
  WHISPER_LARGE_V3_TURBO: "whisper-large-v3-turbo",
  DISTIL_WHISPER: "distil-whisper-large-v3-en",
} as const;

/** Union of all model string literals in {@link GROQ_MODELS}. */
export type GroqModel = (typeof GROQ_MODELS)[keyof typeof GROQ_MODELS];

// ─────────────────────────────────────────────
// Custom Error Class
// ─────────────────────────────────────────────

/**
 * Error thrown for Groq API failures.
 */
export class GroqError extends Error {
  /** HTTP status code, if available. */
  readonly status?: number;
  /** Groq error type string. */
  readonly type?: string;
  /** Groq error code. */
  readonly code?: string | number;

  constructor(
    message: string,
    options?: { status?: number; type?: string; code?: string | number }
  ) {
    super(message);
    this.name = "GroqError";
    this.status = options?.status;
    this.type = options?.type;
    this.code = options?.code;
    // Fix prototype chain for transpiled classes
    Object.setPrototypeOf(this, GroqError.prototype);
  }
}

// ─────────────────────────────────────────────
// GroqClient
// ─────────────────────────────────────────────

const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = GROQ_MODELS.LLAMA3_70B;
const DEFAULT_TIMEOUT = 30_000;

/**
 * Lightweight Groq API client.
 *
 * @example
 * ```ts
 * import { GroqClient } from "groq-client";
 *
 * const groq = new GroqClient({ apiKey: "gsk_..." });
 * const reply = await groq.ask("What is the capital of France?");
 * console.log(reply); // "Paris"
 * ```
 */
export class GroqClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(options: GroqClientOptions = {}) {
    const key =
      options.apiKey ??
      (typeof process !== "undefined" ? process.env.GROQ_API_KEY : undefined);

    if (!key) {
      throw new GroqError(
        "No API key provided. Pass `apiKey` in options or set the GROQ_API_KEY environment variable."
      );
    }

    this.apiKey = key;
    this.model = options.model ?? DEFAULT_MODEL;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  // ── Private helpers ───────────────────────

  /** Build request headers. */
  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  /** Resolve the model for a request. */
  private resolveModel(opts?: CompletionOptions): string {
    return opts?.model ?? this.model;
  }

  /** Build the request body shared by chat & stream. */
  private buildBody(
    messages: Message[],
    opts: CompletionOptions | undefined,
    stream: boolean
  ): string {
    const body: Record<string, unknown> = {
      model: this.resolveModel(opts),
      messages,
      stream,
    };

    if (opts?.temperature !== undefined) body.temperature = opts.temperature;
    if (opts?.maxTokens !== undefined) body.max_tokens = opts.maxTokens;
    if (opts?.topP !== undefined) body.top_p = opts.topP;
    if (opts?.stop !== undefined) body.stop = opts.stop;
    if (opts?.seed !== undefined) body.seed = opts.seed;
    if (opts?.responseFormat !== undefined)
      body.response_format = opts.responseFormat;

    return JSON.stringify(body);
  }

  /** Fetch with a timeout signal. */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      return res;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new GroqError(`Request timed out after ${this.timeout}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Parse and throw a GroqError from a non-OK response. */
  private async throwApiError(res: Response): Promise<never> {
    let body: GroqApiErrorBody = {};
    try {
      body = (await res.json()) as GroqApiErrorBody;
    } catch {
      // ignore JSON parse failures
    }
    const msg =
      body.error?.message ?? `Groq API error: HTTP ${res.status}`;
    throw new GroqError(msg, {
      status: res.status,
      type: body.error?.type,
      code: body.error?.code,
    });
  }

  // ── Public API ────────────────────────────

  /**
   * Send a multi-turn conversation and receive a single string response.
   *
   * @param messages - Array of chat messages.
   * @param options - Optional inference parameters.
   * @returns The assistant's reply as a plain string.
   *
   * @example
   * ```ts
   * const reply = await groq.chat([
   *   { role: "user", content: "Hello!" }
   * ]);
   * ```
   */
  async chat(
    messages: Message[],
    options?: CompletionOptions
  ): Promise<string> {
    const res = await this.fetchWithTimeout(
      `${this.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: this.headers(),
        body: this.buildBody(messages, options, false),
      }
    );

    if (!res.ok) await this.throwApiError(res);

    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    return data.choices[0]?.message?.content ?? "";
  }

  /**
   * Stream a response token-by-token using an async generator.
   * Works with `for await...of` loops.
   *
   * @param messages - Array of chat messages.
   * @param options - Optional inference parameters.
   * @param onChunk - Optional callback invoked for every chunk.
   * @yields {@link StreamChunk} objects containing content deltas.
   *
   * @example
   * ```ts
   * for await (const chunk of groq.stream([{ role: "user", content: "Hi" }])) {
   *   process.stdout.write(chunk.content);
   * }
   * ```
   */
  async *stream(
    messages: Message[],
    options?: CompletionOptions,
    onChunk?: (chunk: StreamChunk) => void
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const res = await this.fetchWithTimeout(
      `${this.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: this.headers(),
        body: this.buildBody(messages, options, true),
      }
    );

    if (!res.ok) await this.throwApiError(res);
    if (!res.body) throw new GroqError("Response body is null");

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last (potentially incomplete) line in buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(trimmed.slice(6)) as {
            choices: Array<{
              delta: { content?: string };
              finish_reason?: string | null;
            }>;
          };

          const choice = json.choices[0];
          if (!choice) continue;

          const content = choice.delta?.content ?? "";
          const isDone = choice.finish_reason != null;

          const chunk: StreamChunk = {
            content,
            done: isDone,
            finishReason: choice.finish_reason,
          };

          onChunk?.(chunk);
          yield chunk;
        } catch {
          // skip malformed SSE lines
        }
      }
    }
  }

  /**
   * Convenience shorthand: send a single user prompt and get the reply.
   *
   * @param prompt - Plain text prompt.
   * @param options - Optional inference parameters.
   * @returns The assistant's reply as a plain string.
   *
   * @example
   * ```ts
   * const answer = await groq.ask("What is 2 + 2?");
   * ```
   */
  async ask(prompt: string, options?: CompletionOptions): Promise<string> {
    return this.chat([{ role: "user", content: prompt }], options);
  }

  /**
   * Create a stateful {@link ChatHistory} helper for multi-turn conversations.
   *
   * @returns A new, empty `ChatHistory` object.
   *
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
      get messages(): Message[] {
        return [..._messages];
      },
      add(role: Role, content: string): void {
        _messages.push({ role, content });
      },
      clear(): void {
        _messages.length = 0;
      },
    };
  }
}

