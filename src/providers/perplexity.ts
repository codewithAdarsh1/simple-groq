import { OpenAICompatAdapter } from "./base";

export class PerplexityAdapter extends OpenAICompatAdapter {
  readonly baseUrl = "https://api.perplexity.ai";
  readonly defaultModel = "sonar";
  readonly contextLimit = 127_072;
}
