import pdfParse from "pdf-parse";

export async function extractFromPdf(buffer) {
  try {
    const data = await pdfParse(buffer);

    return {
      extractedText: data.text || "",
      pages: data.numpages || 0,
      metadata: {
        info: data.info || {},
        metadata: data.metadata || {}
      }
    };
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}