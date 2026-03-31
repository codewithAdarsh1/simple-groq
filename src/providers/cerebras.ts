import { OpenAICompatAdapter } from "./base";

export class CerebrasAdapter extends OpenAICompatAdapter {
  readonly baseUrl = "https://api.cerebras.ai/v1";
  readonly defaultModel = "llama-3.3-70b";
  readonly contextLimit = 131_072;
}
