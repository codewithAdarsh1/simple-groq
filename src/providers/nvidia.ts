import { OpenAICompatAdapter } from "./base";

export class NvidiaAdapter extends OpenAICompatAdapter {
  readonly baseUrl = "https://integrate.api.nvidia.com/v1";
  readonly defaultModel = "meta/llama-3.1-70b-instruct";
  readonly contextLimit = 128_000;
}
