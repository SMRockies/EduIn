export const openRouterConfig = {
  apiKey: process.env.OPENROUTER_API_KEY,
  baseUrl: "https://openrouter.ai/api/v1",
  models: {
    text: process.env.TEXT_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free",
    vision: process.env.VISION_MODEL || "openai/gpt-4o-mini",
    audio: process.env.AUDIO_MODEL || "openai/whisper-1",
    video: process.env.VIDEO_MODEL || "google/gemini-1.5-pro"
  },
  defaults: {
    temperature: 0.7,
    maxTokens: 2000
  }
};

export function getModel(type = "text") {
  return openRouterConfig.models[type] || openRouterConfig.models.text;
}

export function getApiKey() {
  if (!openRouterConfig.apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured in .env");
  }
  return openRouterConfig.apiKey;
}