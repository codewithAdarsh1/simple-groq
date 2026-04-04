/**
 * simple-ai-sdk — Base provider abstractions, shared types, and utilities.
 * All provider adapters extend from this file.
 */

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type Role = "system" | "user" | "assistant" | "tool";

export interface Message {
  role: Role;
  content: string;
  name?: string;
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

export interface StreamChunk {
  content: string;
  done: boolean;
  finishReason?: string | null;
}

export interface ProviderAdapter {
  readonly defaultModel: string;
  /** Estimated context limit in tokens */
  readonly contextLimit: number;
  chat(
    messages: Message[],
    opts: CompletionOptions | undefined,
    apiKey: string
  ): Promise<string>;
  stream(
    messages: Message[],
    opts: CompletionOptions | undefined,
    apiKey: string,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk, void, unknown>;
}

// ─── Error ────────────────────────────────────────────────────────────────────

export class AIError extends Error {
  readonly status?: number;
  readonly type?: string;
  readonly code?: string | number;
  constructor(
    message: string,
    opts?: { status?: number; type?: string; code?: string | number }
  ) {
    super(message);
    this.name = "AIError";
    this.status = opts?.status;
    this.type = opts?.type;
    this.code = opts?.code;
    Object.setPrototypeOf(this, AIError.prototype);
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Strip markdown formatting from a string. */
export function stripMarkdownText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*\n?/g, "").trim())
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Parse SSE stream and yield raw data payloads. */
export async function* parseSSE(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  try {
    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const t = line.trim();
        if (!t || t === "data: [DONE]") continue;
        if (t.startsWith("data: ")) yield t.slice(6);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── OpenAI-Compatible Base Adapter ───────────────────────────────────────────

export abstract class OpenAICompatAdapter implements ProviderAdapter {
  abstract readonly baseUrl: string;
  abstract readonly defaultModel: string;
  abstract readonly contextLimit: number;

  protected authHeader(apiKey: string): string {
    return `Bearer ${apiKey}`;
  }

  protected buildHeaders(apiKey: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: this.authHeader(apiKey),
    };
  }

  protected buildBody(
    messages: Message[],
    opts: CompletionOptions | undefined,
    stream: boolean
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: opts?.model ?? this.defaultModel,
      messages,
      stream,
    };
    if (opts?.temperature !== undefined) body["temperature"] = opts.temperature;
    if (opts?.maxTokens !== undefined) body["max_tokens"] = opts.maxTokens;
    if (opts?.topP !== undefined) body["top_p"] = opts.topP;
    if (opts?.stop !== undefined) body["stop"] = opts.stop;
    if (opts?.seed !== undefined) body["seed"] = opts.seed;
    if (opts?.responseFormat !== undefined)
      body["response_format"] = opts.responseFormat;
    return body;
  }

  protected endpoint(): string {
    return `${this.baseUrl}/chat/completions`;
  }

  protected async throwIfError(res: Response): Promise<void> {
    if (!res.ok) {
      let body: {
        error?: { message?: string; type?: string; code?: string | number };
      } = {};
      try {
        body = await res.json();
      } catch {}
      throw new AIError(body.error?.message ?? `API error ${res.status}`, {
        status: res.status,
        type: body.error?.type,
        code: body.error?.code,
      });
    }
  }

  async chat(
    messages: Message[],
    opts: CompletionOptions | undefined,
    apiKey: string
  ): Promise<string> {
    const res = await fetch(this.endpoint(), {
      method: "POST",
      headers: this.buildHeaders(apiKey),
      body: JSON.stringify(this.buildBody(messages, opts, false)),
    });
    await this.throwIfError(res);
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message?.content ?? "";
  }

  async *stream(
    messages: Message[],
    opts: CompletionOptions | undefined,
    apiKey: string,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const res = await fetch(this.endpoint(), {
      method: "POST",
      headers: this.buildHeaders(apiKey),
      body: JSON.stringify(this.buildBody(messages, opts, true)),
      signal,
    });
    await this.throwIfError(res);
    if (!res.body) throw new AIError("Response body is null");

    for await (const raw of parseSSE(res.body, signal)) {
      try {
        const json = JSON.parse(raw) as {
          choices: Array<{
            delta: { content?: string };
            finish_reason?: string | null;
          }>;
        };
        const choice = json.choices?.[0];
        if (!choice) continue;
        yield {
          content: choice.delta?.content ?? "",
          done: choice.finish_reason != null,
          finishReason: choice.finish_reason,
        };
      } catch {}
    }
  }
}
