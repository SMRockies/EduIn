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
const pdfParseModule = require("pdf-parse");
const PdfParseClass = pdfParseModule.PDFParse || null;

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
      parser: parsed.parser,
      ocrUsed: false,
      parserError: parsed.error?.message,
      source: "digital",
      processingTime: Date.now() - startedAt
    });
  }

  const ocr = await runPdfOCR(buffer, parsed);
  if (ocr.extractedText) {
    return finishExtraction({
      ...ocr,
      source: parsed.text.trim() ? "hybrid" : "ocr",
      processingTime: Date.now() - startedAt
    });
  }

  console.error("Extraction failed", {
    pages: parsed.pages || ocr.pages || 0,
    parserError: ocr.parserError || parsed.error?.message || null
  });

  return {
    extractedText: "",
    pages: parsed.pages || ocr.pages || 0,
    metadata: buildMetadata({
      pages: parsed.pages || ocr.pages || 0,
      ocrUsed: true,
      parser: "failed",
      wordCount: 0,
      parserError: ocr.parserError || parsed.error?.message,
      source: parsed.text.trim() ? "hybrid" : "ocr",
      processingTime: Date.now() - startedAt
    })
  };
}

async function parsePdf(buffer) {
  if (PdfParseClass) {
    return parsePdfWithModernApi(buffer);
  }

  return parsePdfWithLegacyApi(buffer);
}

async function parsePdfWithModernApi(buffer) {
  const parser = new PdfParseClass({ data: buffer });

  try {
    const [textResult, infoResult] = await Promise.all([
      parser.getText(),
      parser.getInfo().catch(() => null)
    ]);

    const text = normalizeWhitespace(textResult?.text || "");
    const pages = infoResult?.total || textResult?.total || 0;

    console.log("Parser succeeded", { pages });
    console.log("Characters extracted", { characters: countMeaningfulCharacters(text) });

    await destroyParser(parser);

    return {
      text,
      pages,
      parser: "pdf-parse-v2",
      parserHandle: null,
      error: null
    };
  } catch (error) {
    return {
      text: "",
      pages: 0,
      parser: "pdf-parse-v2",
      parserHandle: parser,
      error
    };
  }
}

async function parsePdfWithLegacyApi(buffer) {
  try {
    const result = await pdfParseModule(buffer);
    const text = normalizeWhitespace(result?.text || "");
    const pages = result?.numpages || 0;

    console.log("Parser succeeded", { pages });
    console.log("Characters extracted", { characters: countMeaningfulCharacters(text) });

    return {
      text,
      pages,
      parser: "pdf-parse-v1",
      parserHandle: null,
      error: null
    };
  } catch (error) {
    return {
      text: "",
      pages: 0,
      parser: "pdf-parse-v1",
      parserHandle: null,
      error
    };
  }
}

async function runPdfOCR(buffer, parsed) {
  console.log("OCR started", { pages: parsed.pages || 0 });

  try {
    const pageCount = await getPageCount(buffer, parsed);
    const pageNumbers = Array.from({ length: pageCount }, (_value, index) => index + 1);
    const pageTexts = await withConcurrencyLimit(pageNumbers, OCR_CONCURRENCY, async (pageNumber) => {
      try {
        const imageBuffer = await renderPdfPageImage(buffer, parsed, pageNumber);
        const text = await ocrService.extractPdfPageText(imageBuffer);
        return normalizeWhitespace(text);
      } catch (error) {
        console.error("OCR page failed", { page: pageNumber, error });
        return "";
      }
    });

    const extractedText = normalizeWhitespace(pageTexts.filter(Boolean).join("\n\n"));
    console.log("OCR finished", { pages: pageCount, characters: countMeaningfulCharacters(extractedText) });

    if (!extractedText) {
      return {
        extractedText: "",
        pages: pageCount,
        parser: "ocr",
        ocrUsed: true,
        wordCount: 0,
        parserError: parsed.error?.message || null,
        source: "ocr"
      };
    }

    return {
      extractedText,
      pages: pageCount,
      parser: "ocr",
      ocrUsed: true,
      wordCount: countWords(extractedText),
      parserError: parsed.error?.message || null,
      source: "ocr"
    };
  } finally {
    await destroyParser(parsed.parserHandle);
  }
}

async function getPageCount(buffer, parsed) {
  if (parsed.pages && parsed.pages > 0) {
    return parsed.pages;
  }

  if (!parsed.parserHandle?.getInfo) {
    return 0;
  }

  try {
    const info = await parsed.parserHandle.getInfo().catch(() => null);
    return info?.total || 0;
  } catch {
    return 0;
  }
}

async function renderPdfPageImage(buffer, parsed, pageNumber) {
  if (parsed.parserHandle?.getScreenshot) {
    const result = await parsed.parserHandle.getScreenshot({
      partial: [pageNumber],
      imageBuffer: true,
      imageDataUrl: false
    });

    const page = result?.pages?.[0];
    const data = page?.data || page?.imageBuffer || page?.buffer;
    if (data) {
      return Buffer.isBuffer(data) ? data : Buffer.from(data);
    }
  }

  const pdfDocument = await loadPdfDocument(buffer);
  try {
    const page = await pdfDocument.getPage(pageNumber);
    return await renderPdfPageToPngBuffer(page);
  } finally {
    if (typeof pdfDocument.destroy === "function") {
      await pdfDocument.destroy();
    }
  }
}

async function destroyParser(parserHandle) {
  if (parserHandle && typeof parserHandle.destroy === "function") {
    try {
      await parserHandle.destroy();
    } catch {
      // Ignore cleanup failures.
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
