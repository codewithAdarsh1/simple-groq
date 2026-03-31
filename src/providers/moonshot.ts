import { OpenAICompatAdapter } from "./base";

export class MoonshotAdapter extends OpenAICompatAdapter {
  readonly baseUrl = "https://api.moonshot.cn/v1";
  readonly defaultModel = "moonshot-v1-8k";
  readonly contextLimit = 8_192;
}
