import { OpenAICompatAdapter } from "./base";

export class MistralAdapter extends OpenAICompatAdapter {
  readonly baseUrl = "https://api.mistral.ai/v1";
  readonly defaultModel = "mistral-small-latest";
  readonly contextLimit = 32_768;
}
