import { OpenAICompatAdapter } from "./base";

export class FireworksAdapter extends OpenAICompatAdapter {
  readonly baseUrl = "https://api.fireworks.ai/inference/v1";
  readonly defaultModel = "accounts/fireworks/models/llama-v3p3-70b-instruct";
  readonly contextLimit = 131_072;
}
