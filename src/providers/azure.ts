import { OpenAICompatAdapter } from "./base";
import type { CompletionOptions, Message } from "./base";

export class AzureAdapter extends OpenAICompatAdapter {
  readonly baseUrl: string;
  readonly defaultModel: string;
  readonly contextLimit = 128_000;
  private readonly apiVersion: string;

  constructor(opts: { baseUrl: string; model?: string; apiVersion?: string }) {
    super();
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.defaultModel = opts.model ?? "gpt-4o-mini";
    this.apiVersion = opts.apiVersion ?? "2024-02-01";
  }

  protected override endpoint(): string {
    const model = this.defaultModel;
    return `${this.baseUrl}/openai/deployments/${model}/chat/completions?api-version=${this.apiVersion}`;
  }

  protected override buildHeaders(apiKey: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "api-key": apiKey,
    };
  }

  // Azure endpoint already encodes the model — remove it from body
  protected override buildBody(
    messages: Message[],
    opts: CompletionOptions | undefined,
    stream: boolean
  ): Record<string, unknown> {
    const body = super.buildBody(messages, opts, stream);
    delete body["model"];
    return body;
  }
}
