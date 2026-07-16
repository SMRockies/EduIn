import { createRequire } from "node:module";
import {
  buildMetadata,
  countWords,
  hasMeaningfulText,
  countMeaningfulCharacters,
  normalizeWhitespace,
  withConcurrencyLimit
} from "./pdf.helpers.js";
import { loadPdfDocument, renderPdfPageToPngBuffer } from "../renderers/pdf.renderer.js";
import { ocrService } from "../services/ocr.service.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
const OCR_CONCURRENCY = 3;
const PDF_MIN_TEXT_LENGTH = Number(process.env.PDF_MIN_TEXT_LENGTH ?? 100);

export async function extractFromPdf(buffer) {
  const startedAt = Date.now();
  console.log("PDF detected", { bytes: buffer?.length || 0 });

  const parsed = await tryParsePdf(buffer);
  if (parsed.error) {
    console.error("PDF Parse Error", parsed.error);
  }

  if (hasMeaningfulText(parsed.text, PDF_MIN_TEXT_LENGTH)) {
    return completeExtraction({
      extractedText: normalizeWhitespace(parsed.text),
      pages: parsed.pages,
      parser: "pdf-parse",
      ocrUsed: false,
      parserError: parsed.error?.message,
      source: "digital",
      processingTime: Date.now() - startedAt
    });
  }

  const ocr = await runPdfOCR(buffer, parsed.pages, parsed.error);
  if (ocr.extractedText) {
    return completeExtraction({
      ...ocr,
      processingTime: Date.now() - startedAt
    });
  }

  console.error("Extraction failed", {
    pages: ocr.pages,
    parserError: ocr.parserError || parsed.error?.message || null
  });

  return {
    extractedText: "",
    pages: ocr.pages || parsed.pages || 0,
    metadata: buildMetadata({
      pages: ocr.pages || parsed.pages || 0,
      ocrUsed: true,
      parser: "failed",
      wordCount: 0,
      parserError: ocr.parserError || parsed.error?.message,
      source: "ocr",
      processingTime: Date.now() - startedAt
    })
  };
}

async function tryParsePdf(buffer) {
  try {
    const result = await pdfParse(buffer);
    const text = normalizeWhitespace(result?.text || "");
    const pages = result?.numpages || 0;

    console.log("Parser succeeded", { pages });
    console.log("Characters extracted", { characters: countMeaningfulCharacters(text) });

    return { text, pages, error: null };
  } catch (error) {
    return { text: "", pages: 0, error };
  }
}

async function runPdfOCR(buffer, fallbackPages, parserError) {
  console.log("OCR started", { pages: fallbackPages || 0 });

  let pdfDocument;
  try {
    pdfDocument = await loadPdfDocument(buffer);
  } catch (error) {
    console.error("OCR failed", error);
    return {
      extractedText: "",
      pages: fallbackPages || 0,
      parser: "ocr",
      ocrUsed: true,
      wordCount: 0,
      parserError: parserError?.message || error.message,
      source: "ocr"
    };
  }

  try {
    const pages = pdfDocument.numPages || fallbackPages || 0;
    const pageNumbers = Array.from({ length: pages }, (_value, index) => index + 1);
    const pageTexts = await withConcurrencyLimit(pageNumbers, OCR_CONCURRENCY, async (pageNumber) => {
      const page = await pdfDocument.getPage(pageNumber);
      try {
        const imageBuffer = await renderPdfPageToPngBuffer(page);
        const text = await ocrService.extractPdfPageText(imageBuffer);
        return normalizeWhitespace(text);
      } finally {
        if (typeof page.cleanup === "function") {
          page.cleanup();
        }
      }
    });

    const extractedText = normalizeWhitespace(pageTexts.filter(Boolean).join("\n\n"));
    console.log("OCR finished", { pages, characters: countMeaningfulCharacters(extractedText) });

    if (!extractedText) {
      return {
        extractedText: "",
        pages,
        parser: "ocr",
        ocrUsed: true,
        wordCount: 0,
        parserError: parserError?.message,
        source: "ocr"
      };
    }

    return {
      extractedText,
      pages,
      parser: "ocr",
      ocrUsed: true,
      wordCount: countWords(extractedText),
      parserError: parserError?.message,
      source: "ocr"
    };
  } catch (error) {
    console.error("OCR failed", error);
    return {
      extractedText: "",
      pages: pdfDocument.numPages || fallbackPages || 0,
      parser: "ocr",
      ocrUsed: true,
      wordCount: 0,
      parserError: parserError?.message || error.message,
      source: "ocr"
    };
  } finally {
    if (typeof pdfDocument.destroy === "function") {
      await pdfDocument.destroy();
    }
  }
}

function completeExtraction(result) {
  console.log("Extraction completed", {
    parser: result.parser,
    pages: result.pages || 0,
    wordCount: result.wordCount || countWords(result.extractedText || ""),
    source: result.source || "digital"
  });

  return {
    extractedText: result.extractedText,
    pages: result.pages || 0,
    metadata: buildMetadata({
      pages: result.pages || 0,
      ocrUsed: result.ocrUsed,
      parser: result.parser,
      wordCount: result.wordCount || countWords(result.extractedText || ""),
      parserError: result.parserError,
      source: result.source || "digital",
      processingTime: result.processingTime || 0
    })
  };
}
