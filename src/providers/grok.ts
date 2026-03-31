import { OpenAICompatAdapter } from "./base";

export class GrokAdapter extends OpenAICompatAdapter {
  readonly baseUrl = "https://api.x.ai/v1";
  readonly defaultModel = "grok-2-latest";
  readonly contextLimit = 131_072;
}
