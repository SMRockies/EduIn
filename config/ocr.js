export const ocrConfig = {
  provider: process.env.OCR_PROVIDER || "openrouter",
  model: process.env.OCR_MODEL || process.env.VISION_MODEL || "openai/gpt-4o-mini"
};

export function getOcrProvider() {
  return ocrConfig.provider;
}

export function getOcrModel() {
  return ocrConfig.model;
}
