import {
  ProviderAdapter,
  Message,
  CompletionOptions,
  StreamChunk,
  AIError,
} from "./base";

export class AnthropicAdapter implements ProviderAdapter {
  readonly defaultModel = "claude-3-5-haiku-latest";
  readonly contextLimit = 200_000;
  private readonly baseUrl = "https://api.anthropic.com/v1";

  private buildHeaders(apiKey: string) {
    return {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };
  }

  private buildBody(
    messages: Message[],
    opts: CompletionOptions | undefined,
    stream: boolean
  ): Record<string, unknown> {
    // Anthropic separates system from messages array
    const systemMsg = messages.find((m) => m.role === "system");
    const rest = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const body: Record<string, unknown> = {
      model: opts?.model ?? this.defaultModel,
      max_tokens: opts?.maxTokens ?? 1024,
      messages: rest,
      stream,
    };
    if (systemMsg) body["system"] = systemMsg.content;
    if (opts?.temperature !== undefined) body["temperature"] = opts.temperature;
    if (opts?.topP !== undefined) body["top_p"] = opts.topP;
    if (opts?.stop !== undefined)
      body["stop_sequences"] = Array.isArray(opts.stop) ? opts.stop : [opts.stop];

    return body;
  }

  private async throwIfError(res: Response): Promise<void> {
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as {
        error?: { message?: string; type?: string };
      };
      throw new AIError(body.error?.message ?? `Anthropic API error ${res.status}`, {
        status: res.status,
        type: body.error?.type,
      });
    }
  }

  async chat(
    messages: Message[],
    opts: CompletionOptions | undefined,
    apiKey: string
  ): Promise<string> {
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: this.buildHeaders(apiKey),
      body: JSON.stringify(this.buildBody(messages, opts, false)),
    });
    await this.throwIfError(res);

    const data = (await res.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    return data.content?.find((b) => b.type === "text")?.text ?? "";
  }

  async *stream(
    messages: Message[],
    opts: CompletionOptions | undefined,
    apiKey: string,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: this.buildHeaders(apiKey),
      body: JSON.stringify(this.buildBody(messages, opts, true)),
      signal,
    });
    await this.throwIfError(res);
    if (!res.body) throw new AIError("Response body is null");

    const reader = res.body.getReader();
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

        let eventType = "";
        for (const line of lines) {
          const t = line.trim();
          if (t.startsWith("event: ")) {
            eventType = t.slice(7).trim();
            continue;
          }
          if (!t.startsWith("data: ")) continue;
          const raw = t.slice(6);
          if (raw === "[DONE]") return;

          try {
            const json = JSON.parse(raw) as {
              type: string;
              delta?: { type: string; text?: string };
              message?: { stop_reason?: string };
            };

            if (eventType === "content_block_delta" && json.delta?.type === "text_delta") {
              yield {
                content: json.delta.text ?? "",
                done: false,
                finishReason: null,
              };
            } else if (eventType === "message_delta" && json.delta) {
              yield { content: "", done: true, finishReason: "stop" };
            }
          } catch {}
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
