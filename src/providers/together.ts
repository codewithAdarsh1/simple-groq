import { OpenAICompatAdapter } from "./base";

export class TogetherAdapter extends OpenAICompatAdapter {
  readonly baseUrl = "https://api.together.xyz/v1";
  readonly defaultModel = "meta-llama/Llama-3.3-70B-Instruct-Turbo";
  readonly contextLimit = 128_000;
}
