import {
  ProviderAdapter,
  Message,
  CompletionOptions,
  StreamChunk,
  AIError,
} from "./base";

export class CohereAdapter implements ProviderAdapter {
  readonly defaultModel = "command-r-plus-08-2024";
  readonly contextLimit = 128_000;
  private readonly baseUrl = "https://api.cohere.com/v2";

  private buildHeaders(apiKey: string) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
  }

  private buildBody(
    messages: Message[],
    opts: CompletionOptions | undefined,
    stream: boolean
  ): Record<string, unknown> {
    // Cohere v2 uses the same role names as OpenAI
    const body: Record<string, unknown> = {
      model: opts?.model ?? this.defaultModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream,
    };
    if (opts?.temperature !== undefined) body["temperature"] = opts.temperature;
    if (opts?.maxTokens !== undefined) body["max_tokens"] = opts.maxTokens;
    if (opts?.topP !== undefined) body["p"] = opts.topP;
    if (opts?.stop !== undefined)
      body["stop_sequences"] = Array.isArray(opts.stop) ? opts.stop : [opts.stop];
    return body;
  }

  private async throwIfError(res: Response): Promise<void> {
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string };
      throw new AIError(body.message ?? `Cohere API error ${res.status}`, {
        status: res.status,
      });
    }
  }

  async chat(
    messages: Message[],
    opts: CompletionOptions | undefined,
    apiKey: string
  ): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: this.buildHeaders(apiKey),
      body: JSON.stringify(this.buildBody(messages, opts, false)),
    });
    await this.throwIfError(res);

    const data = (await res.json()) as {
      message?: { content?: Array<{ type: string; text: string }> };
    };
    return (
      data.message?.content?.find((b) => b.type === "text")?.text ?? ""
    );
  }

  async *stream(
    messages: Message[],
    opts: CompletionOptions | undefined,
    apiKey: string,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const res = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: this.buildHeaders(apiKey),
      body: JSON.stringify(this.buildBody(messages, opts, true)),
      signal,
    });
    await this.throwIfError(res);
    if (!res.body) throw new AIError("Response body is null");

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buf = "";

    try {
      while (true) {
        if (signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          const t = line.trim();
          if (!t) continue;
          try {
            const json = JSON.parse(t) as {
              type: string;
              delta?: { message?: { content?: { text?: string } } };
              finish_reason?: string;
            };
            if (json.type === "content-delta") {
              yield {
                content: json.delta?.message?.content?.text ?? "",
                done: false,
                finishReason: null,
              };
            } else if (json.type === "message-end") {
              yield {
                content: "",
                done: true,
                finishReason: json.finish_reason ?? "stop",
              };
            }
          } catch {}
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
