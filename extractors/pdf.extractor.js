import fs from "fs";

export async function extractFromPdf(filePath) {
  const { PDFParse } = await import("pdf-parse");
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ verbosity: 0 });
  await parser.load(buffer);
  const text = await parser.getText();
  const info = await parser.getInfo();
  parser.destroy();
  return {
    extractedText: text || "",
    pages: info?.pages || info?.numPages || undefined,
    metadata: {
      author: info?.author || null,
      title: info?.title || null,
      subject: info?.subject || null,
      keywords: info?.keywords || null
    }
  };
}