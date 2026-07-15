export async function extractFromWord(buffer) {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return {
    extractedText: result.value,
    pages: undefined,
    metadata: {
      warnings: result.messages
    }
  };
}