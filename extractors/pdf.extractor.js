import { createRequire } from "node:module";
import {
  buildMetadata,
  countMeaningfulCharacters,
  countWords,
  hasMeaningfulText,
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

  const parsed = await parsePdf(buffer);
  if (parsed.error) {
    console.error("PDF Parse Error", parsed.error);
  }

  if (hasMeaningfulText(parsed.text, PDF_MIN_TEXT_LENGTH)) {
    return finishExtraction({
      extractedText: normalizeWhitespace(parsed.text),
      pages: parsed.pages,
      parser: "pdf-parse",
      ocrUsed: false,
      parserError: parsed.error?.message || null,
      source: "digital",
      processingTime: Date.now() - startedAt
    });
  }

  const ocr = await runPdfOCR(buffer, parsed.error);
  if (ocr.extractedText) {
    return finishExtraction({
      ...ocr,
      source: parsed.text.trim() ? "hybrid" : "ocr",
      processingTime: Date.now() - startedAt
    });
  }

  console.error("Extraction failed", {
    pages: ocr.pages || 0,
    parserError: ocr.parserError || parsed.error?.message || null
  });

  return {
    extractedText: "",
    pages: ocr.pages || 0,
    metadata: buildMetadata({
      pages: ocr.pages || 0,
      ocrUsed: true,
      parser: "failed",
      wordCount: 0,
      parserError: ocr.parserError || parsed.error?.message || null,
      source: parsed.text.trim() ? "hybrid" : "ocr",
      processingTime: Date.now() - startedAt
    })
  };
}

async function parsePdf(buffer) {
  try {
    const result = await pdfParse(buffer);
    const text = normalizeWhitespace(result?.text || "");
    const pages = result?.numpages || 0;

    console.log("Parser succeeded", { pages });
    console.log("Characters extracted", { characters: countMeaningfulCharacters(text) });

    return {
      text,
      pages,
      error: null
    };
  } catch (error) {
    return {
      text: "",
      pages: 0,
      error
    };
  }
}

async function runPdfOCR(buffer, parserError) {
  let pdfDocument;

  try {
    pdfDocument = await loadPdfDocument(buffer);
  } catch (error) {
    console.error("OCR failed", error);
    return {
      extractedText: "",
      pages: 0,
      parser: "ocr",
      ocrUsed: true,
      wordCount: 0,
      parserError: parserError?.message || error.message || null,
      source: "ocr"
    };
  }

  try {
    const pageCount = pdfDocument.numPages || 0;
    console.log("OCR started", { pages: pageCount });

    const pageNumbers = Array.from({ length: pageCount }, (_value, index) => index + 1);
    const pageTexts = await withConcurrencyLimit(pageNumbers, OCR_CONCURRENCY, async (pageNumber) => {
      let page = null;

      try {
        page = await pdfDocument.getPage(pageNumber);
        const imageBuffer = await renderPdfPageToPngBuffer(page);
        const text = await ocrService.extractPdfPageText(imageBuffer);
        return normalizeWhitespace(text);
      } catch (error) {
        console.error("OCR page failed", { page: pageNumber, error });
        return "";
      } finally {
        if (page && typeof page.cleanup === "function") {
          try {
            page.cleanup();
          } catch {
            // Ignore cleanup failures.
          }
        }
      }
    });

    const extractedText = normalizeWhitespace(pageTexts.filter(Boolean).join("\n\n"));
    console.log("OCR finished", {
      pages: pageCount,
      characters: countMeaningfulCharacters(extractedText)
    });

    if (!extractedText) {
      return {
        extractedText: "",
        pages: pageCount,
        parser: "ocr",
        ocrUsed: true,
        wordCount: 0,
        parserError: parserError?.message || null,
        source: "ocr"
      };
    }

    return {
      extractedText,
      pages: pageCount,
      parser: "ocr",
      ocrUsed: true,
      wordCount: countWords(extractedText),
      parserError: parserError?.message || null,
      source: "ocr"
    };
  } catch (error) {
    console.error("OCR failed", error);
    return {
      extractedText: "",
      pages: pdfDocument.numPages || 0,
      parser: "ocr",
      ocrUsed: true,
      wordCount: 0,
      parserError: parserError?.message || error.message || null,
      source: "ocr"
    };
  } finally {
    if (typeof pdfDocument.destroy === "function") {
      try {
        await pdfDocument.destroy();
      } catch {
        // Ignore cleanup failures.
      }
    }
  }
}

function finishExtraction(result) {
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
