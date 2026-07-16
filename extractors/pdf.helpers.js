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
  processingTime
}) {
  return {
    pages: pages || 0,
    ocrUsed: Boolean(ocrUsed),
    parser,
    wordCount: wordCount || 0,
    parserError,
    source,
    processingTime
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
