import fs from "fs";

export async function extractFromWord(filePath) {
  const mammoth = await import("mammoth");
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