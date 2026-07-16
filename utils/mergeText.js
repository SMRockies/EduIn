export function normalizeWhitespace(text) {
  return (text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function countWords(text) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

export function countCharacters(text) {
  return normalizeWhitespace(text).replace(/\s+/g, " ").trim().length;
}

export function dedupeLines(lines) {
  const seen = new Set();
  const result = [];

  for (const line of lines) {
    const normalized = normalizeLine(line);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(line.trim());
  }

  return result;
}

export function mergeTextBlocks(blocks) {
  const lines = [];

  for (const block of blocks) {
    const normalized = normalizeWhitespace(block);
    if (!normalized) continue;
    lines.push(...normalized.split("\n"));
  }

  return normalizeWhitespace(dedupeLines(lines).join("\n"));
}

export function mergePageText(pageNumber, digitalText, ocrText) {
  const lines = [`Page ${pageNumber}`];
  const digitalLines = splitVisibleLines(digitalText);
  const ocrLines = splitVisibleLines(ocrText);

  if (digitalLines.length > 0) {
    lines.push("(Digital)", ...digitalLines);
  }

  if (ocrLines.length > 0) {
    lines.push("(OCR)", ...ocrLines);
  }

  return mergeTextBlocks(lines);
}

export function splitVisibleLines(text) {
  return normalizeWhitespace(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeLine(line) {
  return String(line || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
