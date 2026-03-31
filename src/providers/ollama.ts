import { OpenAICompatAdapter } from "./base";

export class OllamaAdapter extends OpenAICompatAdapter {
  readonly baseUrl: string;
  readonly defaultModel = "llama3.2";
  readonly contextLimit = 131_072;

  constructor(baseUrl?: string) {
    super();
    this.baseUrl = (baseUrl ?? "http://localhost:11434") + "/v1";
  }

  protected override buildHeaders(_apiKey: string): Record<string, string> {
    return { "Content-Type": "application/json" };
  }
}
