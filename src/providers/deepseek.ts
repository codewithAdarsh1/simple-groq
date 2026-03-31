import { OpenAICompatAdapter } from "./base";

export class DeepSeekAdapter extends OpenAICompatAdapter {
  readonly baseUrl = "https://api.deepseek.com/v1";
  readonly defaultModel = "deepseek-chat";
  readonly contextLimit = 65_536;
}
