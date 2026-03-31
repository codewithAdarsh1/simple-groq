import { OpenAICompatAdapter } from "./base";

export class OpenAIAdapter extends OpenAICompatAdapter {
  readonly baseUrl = "https://api.openai.com/v1";
  readonly defaultModel = "gpt-4o-mini";
  readonly contextLimit = 128_000;
}
