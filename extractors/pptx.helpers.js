import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({ ignoreAttributes: false });

export function sortSlideFiles(slideFiles) {
  return [...slideFiles].sort((a, b) => {
    const numA = extractSlideNumber(a);
    const numB = extractSlideNumber(b);
    return numA - numB;
  });
}

export function extractSlideNumber(fileName) {
  const match = fileName.match(/slide(\d+)\.xml$/i);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

export function extractSlideTextFromXml(xml) {
  const tokens = [];
  const pattern = /<(?:a:br|a:tab)\b[^>]*\/?>|<a:t\b[^>]*>([\s\S]*?)<\/a:t>/gi;

  let match;
  while ((match = pattern.exec(xml)) !== null) {
    const token = match[0];

    if (/^<a:br\b/i.test(token)) {
      tokens.push("\n");
      continue;
    }

    if (/^<a:tab\b/i.test(token)) {
      tokens.push("\t");
      continue;
    }

    const rawText = match[1] ?? "";
    const decoded = decodeXmlEntities(rawText);
    if (decoded.trim().length === 0) {
      continue;
    }
    tokens.push(decoded);
  }

  let merged = "";
  for (const token of tokens) {
    if (token === "\n" || token === "\t") {
      merged += token;
      continue;
    }

    if (needsTextSeparator(merged, token)) {
      merged += " ";
    }

    merged += token;
  }

  return normalizeWhitespace(merged);
}

export function countWords(text) {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function countCharacters(text) {
  return text ? text.replace(/\s+/g, " ").trim().length : 0;
}

export function cleanLineList(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function dedupeLines(lines) {
  const seen = new Set();
  const unique = [];

  for (const line of lines) {
    const normalized = normalizeDedupKey(line);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(line);
  }

  return unique;
}

export function mergeSlideText({ slideNumber, xmlText, ocrText }) {
  const sections = [`Slide ${slideNumber}`];
  const xmlLines = cleanLineList(xmlText);
  const ocrLines = cleanLineList(ocrText);

  if (xmlLines.length > 0) {
    sections.push("(XML)", ...xmlLines);
  }

  if (ocrLines.length > 0) {
    sections.push("(OCR)", ...ocrLines);
  }

  return dedupeLines(sections).join("\n").trim();
}

export function decodeXmlEntities(text) {
  if (!text) return "";

  return text.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (_match, entity) => {
    switch (entity) {
      case "amp":
        return "&";
      case "lt":
        return "<";
      case "gt":
        return ">";
      case "quot":
        return "\"";
      case "apos":
        return "'";
      default:
        if (entity.startsWith("#x") || entity.startsWith("#X")) {
          const codePoint = Number.parseInt(entity.slice(2), 16);
          return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _match;
        }
        if (entity.startsWith("#")) {
          const codePoint = Number.parseInt(entity.slice(1), 10);
          return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _match;
        }
        return _match;
    }
  });
}

export function normalizeWhitespace(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeDedupKey(line) {
  return line.replace(/\s+/g, " ").trim().toLowerCase();
}

function needsTextSeparator(currentText, nextText) {
  if (!currentText) return false;
  if (/\s$/.test(currentText)) return false;
  if (/^[\s,.;:!?)}\]]/.test(nextText)) return false;

  const currentTail = currentText[currentText.length - 1];
  const nextHead = nextText[0];

  return /[\p{L}\p{N}]$/u.test(currentTail) && /[\p{L}\p{N}]/u.test(nextHead);
}

export async function extractPptxMetadata(zip, parser = xmlParser) {
  const metadata = {};

  try {
    if (zip.files["docProps/core.xml"]) {
      const coreXml = await zip.files["docProps/core.xml"].async("text");
      const core = parser.parse(coreXml);
      metadata.title = findTextByLocalName(core, "title");
      metadata.author = findTextByLocalName(core, "creator");
      metadata.subject = findTextByLocalName(core, "subject");
    }
  } catch {
    // Metadata is best-effort.
  }

  try {
    if (zip.files["docProps/app.xml"]) {
      const appXml = await zip.files["docProps/app.xml"].async("text");
      const app = parser.parse(appXml);
      metadata.company = findTextByLocalName(app, "Company");
    }
  } catch {
    // Metadata is best-effort.
  }

  return metadata;
}

function findTextByLocalName(obj, localName) {
  if (typeof obj !== "object" || obj === null) return undefined;

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("@_")) continue;

    const name = key.includes(":") ? key.split(":")[1] : key;
    if (name === localName && typeof value === "string") {
      return value.trim();
    }

    const result = findTextByLocalName(value, localName);
    if (result !== undefined) return result;
  }

  return undefined;
}
