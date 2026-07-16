const MIME_MAP = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx"
};

const EXT_MAP = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
};

export function isSupported(mimeType, extension) {
  return !!MIME_MAP[mimeType] || !!EXT_MAP[extension?.toLowerCase()];
}

export function getSupportedTypes() {
  return Object.keys(MIME_MAP);
}

export async function getExtractor(mimeType, extension) {
  const key = MIME_MAP[mimeType] || EXT_MAP[extension?.toLowerCase()];
  if (!key) return null;

  switch (key) {
    case "pdf":
      return (await import("./pdf.extractor.js")).extractFromPdf;
    case "docx":
      return (await import("./word.extractor.js")).extractFromWord;
    case "xlsx":
      return (await import("./excel.extractor.js")).extractFromExcel;
    case "pptx":
      return (await import("./pptx.extractor.js")).extractFromPptx;
    default:
      return null;
  }
}