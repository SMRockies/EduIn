const MIME_MAP = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "image/bmp": "image",
  "image/tiff": "image"
};

const EXT_MAP = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff"
};

export function isSupported(mimeType, extension) {
  return Boolean(MIME_MAP[mimeType] || EXT_MAP[extension?.toLowerCase()] || mimeType?.startsWith("image/"));
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
    case "image":
      return (await import("./image.extractor.js")).extractFromImage;
    default:
      return null;
  }
}
