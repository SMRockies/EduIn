import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import {
  countCharacters,
  countWords,
  extractPptxMetadata,
  extractSlideTextFromXml,
  mergeSlideText,
  sortSlideFiles
} from "./pptx.helpers.js";
import { createPptxRenderer, renderSlideToPngBuffer } from "./pptx.renderer.js";
import { extractSlideTextWithVision } from "./pptx.vision.js";

const xmlParser = new XMLParser({ ignoreAttributes: false });
const XML_WORD_THRESHOLD = 50;
const XML_CHAR_THRESHOLD = 250;

export async function extractFromPptx(buffer) {
  let zip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch (error) {
    if (
      error.message.includes("is not a zip") ||
      error.message.includes("invalid") ||
      error.message.includes("encrypted") ||
      error.message.includes("end of central directory")
    ) {
      throw new Error("Corrupted, invalid, or password-protected PPTX file");
    }
    throw new Error(`Failed to open PPTX: ${error.message}`);
  }

  const slideFiles = sortSlideFiles(
    Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
  );

  if (slideFiles.length === 0) {
    throw new Error("No slides found in presentation");
  }

  const metadata = await extractPptxMetadata(zip, xmlParser);
  const renderer = await createPptxRenderer(buffer).catch(() => null);

  const slideResults = [];
  let xmlWordCount = 0;
  let ocrWordCount = 0;
  let ocrUsed = false;

  for (let i = 0; i < slideFiles.length; i += 1) {
    const slideFile = slideFiles[i];
    const slideXml = await zip.files[slideFile].async("text");
    const xmlText = extractSlideTextFromXml(slideXml);
    const slideXmlWordCount = countWords(xmlText);
    const slideXmlCharCount = countCharacters(xmlText);
    xmlWordCount += slideXmlWordCount;

    let ocrText = "";
    const needsOcr = slideXmlWordCount < XML_WORD_THRESHOLD || slideXmlCharCount < XML_CHAR_THRESHOLD;

    if (needsOcr && renderer) {
      ocrUsed = true;
      try {
        const imageBuffer = await renderSlideToPngBuffer(renderer, i);
        ocrText = await extractSlideTextWithVision(imageBuffer);
        if (ocrText.trim()) {
          ocrWordCount += countWords(ocrText);
        }
      } catch {
        // OCR fallback is best-effort. Keep the XML text if rendering or vision fails.
      }
    }

    const mergedText = mergeSlideText({
      slideNumber: i + 1,
      xmlText,
      ocrText
    });

    if (mergedText) {
      slideResults.push(mergedText);
    }
  }

  const extractedText = slideResults.join("\n\n").trim();

  return {
    extractedText,
    pages: slideFiles.length,
    metadata: {
      ...metadata,
      slideCount: slideFiles.length,
      ocrUsed,
      xmlWordCount,
      ocrWordCount,
      totalWordCount: countWords(extractedText)
    }
  };
}
