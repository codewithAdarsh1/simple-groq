import {
  ProviderAdapter,
  Message,
  CompletionOptions,
  StreamChunk,
  AIError,
  parseSSE,
} from "./base";

type GeminiRole = "user" | "model";
interface GeminiPart {
  text: string;
}
interface GeminiContent {
  role: GeminiRole;
  parts: GeminiPart[];
}

function toGeminiContents(messages: Message[]): {
  systemInstruction?: { parts: GeminiPart[] };
  contents: GeminiContent[];
} {
  const systemMsg = messages.find((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");

  const contents: GeminiContent[] = rest.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  return {
    systemInstruction: systemMsg
      ? { parts: [{ text: systemMsg.content }] }
      : undefined,
    contents,
  };
}

export class GeminiAdapter implements ProviderAdapter {
  readonly defaultModel = "gemini-2.0-flash";
  readonly contextLimit = 1_048_576;

  private endpoint(model: string, stream: boolean, apiKey: string): string {
    const action = stream ? "streamGenerateContent" : "generateContent";
    const base = "https://generativelanguage.googleapis.com/v1beta/models";
    const sse = stream ? "&alt=sse" : "";
    return `${base}/${model}:${action}?key=${apiKey}${sse}`;
  }

  private buildBody(
    messages: Message[],
    opts: CompletionOptions | undefined
  ): Record<string, unknown> {
    const { systemInstruction, contents } = toGeminiContents(messages);
    const body: Record<string, unknown> = { contents };
    if (systemInstruction) body["systemInstruction"] = systemInstruction;

    const genConfig: Record<string, unknown> = {};
    if (opts?.temperature !== undefined)
      genConfig["temperature"] = opts.temperature;
    if (opts?.maxTokens !== undefined)
      genConfig["maxOutputTokens"] = opts.maxTokens;
    if (opts?.topP !== undefined) genConfig["topP"] = opts.topP;
    if (opts?.stop !== undefined)
      genConfig["stopSequences"] = Array.isArray(opts.stop)
        ? opts.stop
        : [opts.stop];
    if (opts?.responseFormat?.type === "json_object")
      genConfig["responseMimeType"] = "application/json";

    if (Object.keys(genConfig).length > 0) body["generationConfig"] = genConfig;
    return body;
  }

  async chat(
    messages: Message[],
    opts: CompletionOptions | undefined,
    apiKey: string
  ): Promise<string> {
    const model = opts?.model ?? this.defaultModel;
    const res = await fetch(this.endpoint(model, false, apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.buildBody(messages, opts)),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      throw new AIError(
        body.error?.message ?? `Gemini API error ${res.status}`,
        {
          status: res.status,
        }
      );
    }

    const data = (await res.json()) as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };
    return (
      data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? ""
    );
  }

  async *stream(
    messages: Message[],
    opts: CompletionOptions | undefined,
    apiKey: string,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const model = opts?.model ?? this.defaultModel;
    const res = await fetch(this.endpoint(model, true, apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.buildBody(messages, opts)),
      signal,
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      throw new AIError(
        body.error?.message ?? `Gemini API error ${res.status}`,
        {
          status: res.status,
        }
      );
    }
    if (!res.body) throw new AIError("Response body is null");

    for await (const raw of parseSSE(res.body, signal)) {
      try {
        const json = JSON.parse(raw) as {
          candidates: Array<{
            content: { parts: Array<{ text: string }> };
            finishReason?: string;
          }>;
        };
        const cand = json.candidates?.[0];
        if (!cand) continue;
        const text = cand.content?.parts?.map((p) => p.text).join("") ?? "";
        yield {
          content: text,
          done: !!cand.finishReason,
          finishReason: cand.finishReason ?? null,
        };
      } catch {}
    }
  }
}
