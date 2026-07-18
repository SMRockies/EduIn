import { buildMetadata, countWords, normalizeWhitespace } from "./pdf.helpers.js";
import { ocrService } from "../services/ocr.service.js";

export async function extractFromImage(buffer) {
  const startedAt = Date.now();

  try {
    const text = normalizeWhitespace(await ocrService.extractImageText(buffer));
    return {
      extractedText: text,
      pages: 1,
      metadata: buildMetadata({
        pages: 1,
        ocrUsed: true,
        parser: "tesseract",
        wordCount: countWords(text),
        parserError: null,
        source: "image",
        processingTime: Date.now() - startedAt
      })
    };
  } catch (error) {
    console.error("Image extraction failed", error);
    return {
      extractedText: "",
      pages: 1,
      metadata: buildMetadata({
        pages: 1,
        ocrUsed: false,
        parser: "tesseract",
        wordCount: 0,
        parserError: error?.message || "Image OCR failed",
        source: "image",
        processingTime: Date.now() - startedAt
      })
    };
  }
}
