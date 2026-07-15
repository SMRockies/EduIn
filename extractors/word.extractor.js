import fs from "fs";
import mammoth from "mammoth";

export async function extractFromWord(filePath) {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return {
    extractedText: result.value,
    pages: undefined,
    metadata: {
      warnings: result.messages
    }
  };
}