import { openRouterConfig, getModel, getApiKey } from "../config/openrouter.js";
import { chatPrompt } from "../prompts/chat.prompt.js";
import { summaryPrompt } from "../prompts/summary.prompt.js";
import { quizPrompt } from "../prompts/quiz.prompt.js";
import { visionPrompt } from "../prompts/vision.prompt.js";

class AIService {
  async callOpenRouter(model, messages, options = {}) {
    const startTime = Date.now();
    
    console.log("Model:", model);
    const payload = {
      model,
      messages,
      temperature: options.temperature ?? openRouterConfig.defaults.temperature,
      max_tokens: options.maxTokens ?? openRouterConfig.defaults.maxTokens
    };

    if (options.plugins?.length) {
      payload.plugins = options.plugins;
    }

    const response = await fetch(`${openRouterConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "EduAI"
      },
      body: JSON.stringify(payload)
    });

    const latency = Date.now() - startTime;
    const data = await response.json();
    const annotations = data.choices?.[0]?.message?.annotations || data.error?.metadata?.file_annotations || [];

    if (!response.ok) {
      if (options.allowErrorAnnotations && annotations.length > 0) {
        return {
          content: data.choices?.[0]?.message?.content || "",
          tokens: data.usage?.total_tokens || 0,
          latency,
          model,
          annotations,
          raw: data
        };
      }

      const errorText = typeof data === "string" ? data : JSON.stringify(data);
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const content = data.choices?.[0]?.message?.content || "";
    const tokens = data.usage?.total_tokens || 0;

    return { content, tokens, latency, model, annotations, raw: data };
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
