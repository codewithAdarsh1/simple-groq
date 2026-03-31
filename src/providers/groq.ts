import { OpenAICompatAdapter } from "./base";

export class GroqAdapter extends OpenAICompatAdapter {
  readonly baseUrl = "https://api.groq.com/openai/v1";
  readonly defaultModel = "llama-3.3-70b-versatile";
  readonly contextLimit = 131_072;
}
