import { OpenAICompatAdapter } from "./base";

export class QwenAdapter extends OpenAICompatAdapter {
  readonly baseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1";
  readonly defaultModel = "qwen-max";
  readonly contextLimit = 30_720;
}
