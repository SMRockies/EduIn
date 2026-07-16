import { aiService } from "./ai.service.js";
import { getModel } from "../config/openrouter.js";

const PDF_OCR_PROMPT = [
  "Extract every readable word from this PDF page exactly as written.",
  "Preserve headings, paragraphs, tables, lists, figure labels, equations (if readable), and captions.",
  "Do not summarize.",
  "Return only the extracted text."
].join(" ");

export class OcrService {
  async extractPdfPageText(imageBuffer) {
    const result = await aiService.callOpenRouter(
      getModel("vision"),
      [
        {
          role: "user",
          content: [
            { type: "text", text: PDF_OCR_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${imageBuffer.toString("base64")}`
              }
            }
          ]
        }
      ],
      {
        temperature: 0,
        maxTokens: 2000
      }
    );

    return result.content.trim();
  }
}

export const ocrService = new OcrService();
