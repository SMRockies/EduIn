import { createRequire } from "node:module";
import { countCharacters, countWords, mergePageText, normalizeWhitespace } from "../utils/mergeText.js";
import { extractPageText, loadPdfDocument, renderPdfPageToPngBuffer } from "../renderers/pdf.renderer.js";
import { ocrService } from "../services/ocr.service.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

const DIGITAL_WORD_THRESHOLD = 50;
const DIGITAL_CHAR_THRESHOLD = 250;
const PAGE_WORD_THRESHOLD = 20;
const PAGE_CHAR_THRESHOLD = 120;
const OCR_CONCURRENCY = 3;

export async function extractFromPdf(buffer) {
  let pdfParseResult = null;
  let pdfParseError = null;

  try {
    pdfParseResult = await pdfParse(buffer);
  } catch (error) {
    pdfParseError = error;
  }

  const parsedText = normalizeWhitespace(pdfParseResult?.text || "");
  const pages = pdfParseResult?.numpages || 0;
  const metadata = extractPdfMetadata(pdfParseResult, pdfParseError);
  const parsedWordCount = countWords(parsedText);
  const parsedCharCount = countCharacters(parsedText);
  const averageWordsPerPage = pages > 0 ? parsedWordCount / pages : parsedWordCount;

  if (parsedText && parsedWordCount >= DIGITAL_WORD_THRESHOLD && averageWordsPerPage >= PAGE_WORD_THRESHOLD) {
    return {
      extractedText: parsedText,
      pages,
      metadata: {
        ...metadata,
        pages,
        digitalPages: pages,
        ocrPages: 0,
        ocrUsed: false,
        parser: "pdf-parse",
        wordCount: parsedWordCount
      }
    };
  }

  try {
    const pdfDocument = await loadPdfDocument(buffer);
    const totalPages = pdfDocument.numPages || pages || 0;
    const pageResults = await processPdfPages(pdfDocument, totalPages);
    const meaningfulResults = pageResults.filter((page) => page.digitalText.trim().length > 0 || page.ocrText.trim().length > 0);
    const mergedText = normalizeWhitespace(pageResults.map((page) => page.text).join("\n\n"));

    if (typeof pdfDocument.destroy === "function") {
      await pdfDocument.destroy();
    }

    if (meaningfulResults.length > 0 && mergedText) {
      const digitalPages = pageResults.filter((page) => page.digitalText.trim().length > 0).length;
      const ocrPages = pageResults.filter((page) => page.ocrAttempted).length;

      return {
        extractedText: mergedText,
        pages: totalPages,
        metadata: {
          ...metadata,
          pages: totalPages,
          digitalPages,
          ocrPages,
          ocrUsed: ocrPages > 0,
          parser: pdfParseResult ? "pdf-parse+pdfjs+vision" : "pdfjs+vision",
          wordCount: countWords(mergedText)
        }
      };
    }
  } catch (hybridError) {
    if (parsedText) {
      return {
        extractedText: parsedText,
        pages,
        metadata: {
          ...metadata,
          pages,
          digitalPages: pages,
          ocrPages: 0,
          ocrUsed: false,
          parser: "pdf-parse",
          wordCount: parsedWordCount
        }
      };
    }

    try {
      const fallback = await extractPdfViaVisionOnly(buffer);
      if (fallback.extractedText) {
        return fallback;
      }
    } catch {
      // Fall through to the final fallback below.
    }

    return buildReadableFallback(metadata, pages, pdfParseError, hybridError);
  }

  try {
    const fallback = await extractPdfViaVisionOnly(buffer);
    if (fallback.extractedText) {
      return fallback;
    }
  } catch {
    // Final fallback below.
  }

  if (parsedText) {
    return {
      extractedText: parsedText,
      pages,
      metadata: {
        ...metadata,
        pages,
        digitalPages: pages,
        ocrPages: 0,
        ocrUsed: false,
        parser: "pdf-parse",
        wordCount: parsedWordCount
      }
    };
  }

  return buildReadableFallback(metadata, pages, pdfParseError);
}

async function processPdfPages(pdfDocument, totalPages) {
  const pageIndexes = Array.from({ length: totalPages }, (_v, index) => index + 1);
  return mapWithConcurrency(pageIndexes, OCR_CONCURRENCY, async (pageNumber) => {
    const page = await pdfDocument.getPage(pageNumber);
    const digitalText = await extractPageText(page).catch(() => "");
    const digitalWordCount = countWords(digitalText);
    const digitalCharCount = countCharacters(digitalText);
    const needsOcr = digitalWordCount < PAGE_WORD_THRESHOLD || digitalCharCount < PAGE_CHAR_THRESHOLD;

    let ocrText = "";
    let ocrAttempted = false;
    let ocrUsed = false;

    if (needsOcr) {
      ocrAttempted = true;
      try {
        const pngBuffer = await renderPdfPageToPngBuffer(page);
        ocrText = await ocrService.extractPdfPageText(pngBuffer);
        ocrUsed = Boolean(ocrText.trim());
      } catch {
        ocrText = "";
      }
    }

    if (typeof page.cleanup === "function") {
      page.cleanup();
    }

    return {
      pageNumber,
      digitalText,
      ocrText,
      ocrAttempted,
      ocrUsed,
      text: mergePageText(pageNumber, digitalText, ocrText)
    };
  });
}

async function extractPdfViaVisionOnly(buffer) {
  const pdfDocument = await loadPdfDocument(buffer);
  const totalPages = pdfDocument.numPages || 0;
  const pageIndexes = Array.from({ length: totalPages }, (_v, index) => index + 1);
  const pageResults = await mapWithConcurrency(pageIndexes, OCR_CONCURRENCY, async (pageNumber) => {
    const page = await pdfDocument.getPage(pageNumber);
    const pngBuffer = await renderPdfPageToPngBuffer(page);
    const ocrText = await ocrService.extractPdfPageText(pngBuffer);

    if (typeof page.cleanup === "function") {
      page.cleanup();
    }

    return {
      pageNumber,
      digitalText: "",
      ocrText,
      ocrAttempted: true,
      ocrUsed: Boolean(ocrText.trim()),
      text: mergePageText(pageNumber, "", ocrText)
    };
  });

  if (typeof pdfDocument.destroy === "function") {
    await pdfDocument.destroy();
  }

  const extractedText = normalizeWhitespace(pageResults.map((page) => page.text).join("\n\n"));
  const meaningfulResults = pageResults.filter((page) => page.digitalText.trim().length > 0 || page.ocrText.trim().length > 0);

  return {
    extractedText: meaningfulResults.length > 0 && extractedText ? extractedText : "Unable to extract readable text.",
      pages: totalPages,
      metadata: {
        pages: totalPages,
        digitalPages: 0,
        ocrPages: pageResults.filter((page) => page.ocrAttempted).length,
        ocrUsed: true,
        parser: "vision-only",
        wordCount: countWords(extractedText)
      }
  };
}

function extractPdfMetadata(pdfParseResult, pdfParseError) {
  const info = pdfParseResult?.info || {};
  const metadata = pdfParseResult?.metadata || {};

  return {
    info,
    metadata,
    parserError: pdfParseError ? pdfParseError.message : undefined
  };
}

function buildReadableFallback(metadata, pages, ...errors) {
  const errorMessage = errors.filter(Boolean).map((error) => error?.message || String(error)).join(" | ");
  return {
    extractedText: "Unable to extract readable text.",
    pages,
    metadata: {
      ...metadata,
      pages,
      digitalPages: 0,
      ocrPages: 0,
      ocrUsed: false,
      parser: "failed",
      wordCount: 0,
      error: errorMessage || "Extraction failed"
    }
  };
}

async function mapWithConcurrency(items, limit, iterator) {
  const results = new Array(items.length);
  let index = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await iterator(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
}
