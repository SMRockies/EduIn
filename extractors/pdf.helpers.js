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

export function countMeaningfulCharacters(text) {
  return normalizeWhitespace(text).replace(/\s+/g, "").length;
}

export function hasMeaningfulText(text, minLength = 100) {
  return countMeaningfulCharacters(text) > minLength;
}

export function buildMetadata({
  pages,
  ocrUsed,
  parser,
  wordCount,
  parserError,
  source,
  processingTime,
  pdfInfo,
  pdfMetadata
}) {
  return {
    pages: pages || 0,
    ocrUsed: Boolean(ocrUsed),
    parser,
    wordCount: wordCount || 0,
    parserError,
    source,
    processingTime,
    pdfInfo,
    pdfMetadata
  };
}

export function withConcurrencyLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });

  return Promise.all(runners).then(() => results);
}

export function splitVisibleLines(text) {
  return normalizeWhitespace(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function dedupeLines(lines) {
  const seen = new Set();
  const result = [];

  for (const line of lines) {
    const normalized = normalizeLine(line);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(line.trim());
  }

  return result;
}

export function mergePageBlocks(pageBlocks) {
  return pageBlocks
    .map((block) => formatPageBlock(block))
    .filter(Boolean)
    .join("\n\n");
}

function formatPageBlock({ pageNumber, digitalText = "", ocrText = "" }) {
  const lines = [`Page ${pageNumber}`];
  const digitalLines = splitVisibleLines(digitalText);
  const ocrLines = splitVisibleLines(ocrText);

  if (digitalLines.length > 0) {
    lines.push(...digitalLines);
  }

  if (ocrLines.length > 0) {
    if (digitalLines.length > 0) {
      lines.push("(OCR)");
    }
    lines.push(...ocrLines);
  }

  const merged = dedupeLines(lines);
  return merged.length > 1 ? merged.join("\n") : "";
}

function normalizeLine(line) {
  return String(line || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
