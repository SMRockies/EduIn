import {
  buildMetadata,
  countMeaningfulCharacters,
  countWords,
  mergePageBlocks,
  normalizeWhitespace,
  withConcurrencyLimit
} from "./pdf.helpers.js";
import { loadPdfDocument, renderPdfPageToPngBuffer, extractPageText } from "../renderers/pdf.renderer.js";
import { ocrService } from "../services/ocr.service.js";

const OCR_CONCURRENCY = 3;
const PDF_MIN_TEXT_LENGTH = Number(process.env.PDF_MIN_TEXT_LENGTH ?? 100);

export async function extractFromPdf(buffer) {
  const startedAt = Date.now();
  const pdfBytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  console.log("PDF detected", { bytes: pdfBytes?.length || 0 });

  let pdfDocument = null;
  try {
    pdfDocument = await loadPdfDocument(pdfBytes);
    console.log("PDF loaded");
  } catch (error) {
    console.error("Extraction failed", { stage: "load", error });
    return emptyResult(error?.message || "Failed to load PDF", startedAt);
  }

  try {
    const pageCount = pdfDocument.numPages || 0;
    console.log("Pages detected", { pages: pageCount });

    const pdfMeta = await readPdfMetadata(pdfDocument);
    const pageRecords = await extractPageRecords(pdfDocument, pageCount);
    const digitalText = mergePageBlocks(
      pageRecords.map((page) => ({
        pageNumber: page.pageNumber,
        digitalText: page.digitalText
      }))
    );

    console.log("Text extracted", {
      characters: countMeaningfulCharacters(digitalText),
      words: countWords(digitalText)
    });

    const sparsePages = pageRecords.filter(
      (page) => countMeaningfulCharacters(page.digitalText) < PDF_MIN_TEXT_LENGTH
    );

    if (sparsePages.length === 0) {
      if (countMeaningfulCharacters(digitalText) === 0) {
        console.error("Extraction failed", {
          pages: pageCount,
          parserError: pdfMeta.parserError || null
        });
        return emptyResult(pdfMeta.parserError || "No readable text extracted", startedAt, pageCount, pdfMeta);
      }

      return finishExtraction({
        extractedText: digitalText,
        pages: pageCount,
        parser: "pdfjs",
        ocrUsed: false,
        parserError: pdfMeta.parserError,
        source: "digital",
        processingTime: Date.now() - startedAt,
        pdfInfo: pdfMeta.info,
        pdfMetadata: pdfMeta.metadata
      });
    }

    const ocrTextByPage = await runPdfOCR(pdfDocument, sparsePages);
    const mergedPages = pageRecords.map((page) => ({
      pageNumber: page.pageNumber,
      digitalText: page.digitalText,
      ocrText: ocrTextByPage.get(page.pageNumber) || ""
    }));
    const mergedText = mergePageBlocks(mergedPages);
    const hasDigitalText = pageRecords.some((page) => countMeaningfulCharacters(page.digitalText) > 0);
    const hasOcrText = Array.from(ocrTextByPage.values()).some((text) => countMeaningfulCharacters(text) > 0);

    if (!mergedText || (!hasDigitalText && !hasOcrText)) {
      console.error("Extraction failed", {
        pages: pageCount,
        parserError: pdfMeta.parserError || null
      });
      return emptyResult(pdfMeta.parserError || null, startedAt, pageCount, pdfMeta);
    }

    return finishExtraction({
      extractedText: mergedText,
      pages: pageCount,
      parser: "pdfjs",
      ocrUsed: hasOcrText,
      parserError: pdfMeta.parserError,
      source: hasDigitalText ? "hybrid" : "ocr",
      processingTime: Date.now() - startedAt,
      pdfInfo: pdfMeta.info,
      pdfMetadata: pdfMeta.metadata
    });
  } catch (error) {
    console.error("Extraction failed", { stage: "process", error });
    return emptyResult(error?.message || "PDF processing failed", startedAt, pdfDocument?.numPages || 0);
  } finally {
    if (pdfDocument && typeof pdfDocument.destroy === "function") {
      try {
        await pdfDocument.destroy();
      } catch {
        // Ignore cleanup failures.
      }
    }
  }
}

async function readPdfMetadata(pdfDocument) {
  try {
    const metadata = await pdfDocument.getMetadata();
    return {
      info: metadata?.info || null,
      metadata: metadata?.metadata || null,
      parserError: null
    };
  } catch (error) {
    console.error("PDF metadata read failed", error);
    return {
      info: null,
      metadata: null,
      parserError: error?.message || "Failed to read PDF metadata"
    };
  }
}

async function extractPageRecords(pdfDocument, pageCount) {
  const pageNumbers = Array.from({ length: pageCount }, (_value, index) => index + 1);
  return withConcurrencyLimit(pageNumbers, OCR_CONCURRENCY, async (pageNumber) => {
    try {
      const page = await pdfDocument.getPage(pageNumber);
      try {
        const text = normalizeWhitespace(await extractPageText(page));
        return {
          pageNumber,
          digitalText: text
        };
      } finally {
        if (typeof page.cleanup === "function") {
          try {
            page.cleanup();
          } catch {
            // Ignore cleanup failures.
          }
        }
      }
    } catch (error) {
      console.error("Text extraction failed", { page: pageNumber, error });
      return {
        pageNumber,
        digitalText: ""
      };
    }
  });
}

async function runPdfOCR(pdfDocument, sparsePages) {
  console.log("OCR started", { pages: sparsePages.length });

  const results = await withConcurrencyLimit(sparsePages, OCR_CONCURRENCY, async (pageRecord) => {
    try {
      const page = await pdfDocument.getPage(pageRecord.pageNumber);
      try {
        const imageBuffer = await renderPdfPageToPngBuffer(page);
        const ocrText = normalizeWhitespace(await ocrService.extractPdfPageText(imageBuffer));
        return {
          pageNumber: pageRecord.pageNumber,
          ocrText
        };
      } finally {
        if (typeof page.cleanup === "function") {
          try {
            page.cleanup();
          } catch {
            // Ignore cleanup failures.
          }
        }
      }
    } catch (error) {
      console.error("OCR page failed", { page: pageRecord.pageNumber, error });
      return {
        pageNumber: pageRecord.pageNumber,
        ocrText: ""
      };
    }
  });

  console.log("OCR completed", {
    pages: results.length,
    characters: countMeaningfulCharacters(results.map((page) => page.ocrText).join("\n"))
  });

  return new Map(results.map((page) => [page.pageNumber, page.ocrText]));
}

function finishExtraction(result) {
  console.log("Extraction completed", {
    pages: result.pages || 0,
    parser: result.parser,
    source: result.source,
    words: result.wordCount || countWords(result.extractedText || "")
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
      source: result.source,
      processingTime: result.processingTime || 0,
      pdfInfo: result.pdfInfo,
      pdfMetadata: result.pdfMetadata
    })
  };
}

function emptyResult(message, startedAt, pages = 0, pdfMeta = {}) {
  return {
    extractedText: "",
    pages,
    metadata: buildMetadata({
      pages,
      ocrUsed: false,
      parser: "pdfjs",
      wordCount: 0,
      parserError: message,
      source: "digital",
      processingTime: Date.now() - startedAt,
      pdfInfo: pdfMeta.info,
      pdfMetadata: pdfMeta.metadata
    })
  };
}
