import { openRouterConfig, getModel, getApiKey } from "../config/openrouter.js";
import { chatPrompt } from "../prompts/chat.prompt.js";
import { summaryPrompt } from "../prompts/summary.prompt.js";
import { quizPrompt } from "../prompts/quiz.prompt.js";
import { visionPrompt } from "../prompts/vision.prompt.js";

class AIService {
  async callOpenRouter(model, messages, options = {}) {
    const startTime = Date.now();

    const response = await fetch(`${openRouterConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "EduAI"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? openRouterConfig.defaults.temperature,
        max_tokens: options.maxTokens ?? openRouterConfig.defaults.maxTokens
      })
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const tokens = data.usage?.total_tokens || 0;

    return { content, tokens, latency, model };
  }

  async chat(input) {
    const prompt = chatPrompt(input);
    const result = await this.callOpenRouter(getModel("text"), [{ role: "user", content: prompt }]);
    return result;
  }

  async summarize(input) {
    const prompt = summaryPrompt(input);
    const result = await this.callOpenRouter(getModel("text"), [{ role: "user", content: prompt }]);
    return result;
  }

  async quiz(input) {
    const prompt = quizPrompt(input);
    const result = await this.callOpenRouter(getModel("text"), [{ role: "user", content: prompt }]);
    return result;
  }

  async vision(input) {
    const prompt = visionPrompt(input);
    const result = await this.callOpenRouter(getModel("vision"), [{ role: "user", content: prompt }]);
    return result;
  }

  async audio(input) {
    const result = await this.callOpenRouter(getModel("audio"), [{ role: "user", content: input }]);
    return result;
  }

  async video(input) {
    const result = await this.callOpenRouter(getModel("video"), [{ role: "user", content: input }]);
    return result;
  }
}

export const aiService = new AIService();