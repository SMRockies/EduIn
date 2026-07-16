import { openRouterConfig, getApiKey, getModel } from "../config/openrouter.js";

const OCR_PROMPT = [
  "Extract ALL readable text from this presentation slide.",
  "Requirements:",
  "- Preserve headings.",
  "- Preserve bullet lists.",
  "- Preserve table contents.",
  "- Read labels on charts.",
  "- Read legends.",
  "- Read captions.",
  "- Ignore decorative graphics.",
  "- Do not summarize.",
  "Return only the extracted text."
].join("\n");

export async function extractSlideTextWithVision(imageBuffer) {
  const response = await fetch(`${openRouterConfig.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "EduAI"
    },
    body: JSON.stringify({
      model: getModel("vision"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: OCR_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${imageBuffer.toString("base64")}`
              }
            }
          ]
        }
      ],
      temperature: 0,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vision OCR failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  return content.trim();
}
