import { extractFromPdf } from "./pdf.extractor.js";
import { extractFromWord } from "./word.extractor.js";
import { extractFromExcel } from "./excel.extractor.js";

const MIME_MAP = {
  "application/pdf": { ext: "pdf", extractor: extractFromPdf },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: "docx", extractor: extractFromWord },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { ext: "xlsx", extractor: extractFromExcel }
};

const EXT_MAP = {
  pdf: { mime: "application/pdf", extractor: extractFromPdf },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extractor: extractFromWord },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extractor: extractFromExcel }
};

export function getExtractor(mimeType, extension) {
  const byMime = MIME_MAP[mimeType];
  if (byMime) return byMime.extractor;

  const byExt = EXT_MAP[extension?.toLowerCase()];
  if (byExt) return byExt.extractor;

  return null;
}

export function getSupportedTypes() {
  return Object.keys(MIME_MAP);
}

export function isSupported(mimeType, extension) {
  return getExtractor(mimeType, extension) !== null;
}