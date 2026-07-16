import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

const xmlParser = new XMLParser({ ignoreAttributes: false });

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

  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0]);
      const numB = parseInt(b.match(/\d+/)[0]);
      return numA - numB;
    });

  if (slideFiles.length === 0) {
    throw new Error("No slides found in presentation");
  }

  const slides = [];
  for (const slideFile of slideFiles) {
    const content = await zip.files[slideFile].async("text");
    const text = extractTextFromSlideXml(content);
    slides.push(text);
  }

  const metadata = await extractPptxMetadata(zip);

  const hasContent = slides.some((text) => text.trim().length > 0);
  if (!hasContent) {
    return {
      extractedText: "",
      pages: slides.length,
      metadata: {
        ...metadata,
        slideCount: slides.length
      }
    };
  }

  const slideTexts = slides.map((text, i) => `Slide ${i + 1}\n${text}`);
  const extractedText = slideTexts.join("\n\n");

  return {
    extractedText,
    pages: slides.length,
    metadata: {
      ...metadata,
      slideCount: slides.length
    }
  };
}

function extractTextFromSlideXml(xml) {
  const doc = xmlParser.parse(xml);
  const texts = [];

  function walk(obj) {
    if (typeof obj !== "object" || obj === null) return;
    if (Array.isArray(obj)) {
      obj.forEach(walk);
      return;
    }
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith("@_")) continue;
      const localName = key.includes(":") ? key.split(":")[1] : key;
      if (localName === "t" && typeof value === "string") {
        texts.push(decodeEntities(value.trim()));
      } else {
        walk(value);
      }
    }
  }

  walk(doc);
  return texts.join("\n");
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

async function extractPptxMetadata(zip) {
  const metadata = {};

  try {
    if (zip.files["docProps/core.xml"]) {
      const coreXml = await zip.files["docProps/core.xml"].async("text");
      const core = xmlParser.parse(coreXml);
      metadata.title = findTextByLocalName(core, "title");
      metadata.author = findTextByLocalName(core, "creator");
      metadata.subject = findTextByLocalName(core, "subject");
    }
  } catch (e) {}

  try {
    if (zip.files["docProps/app.xml"]) {
      const appXml = await zip.files["docProps/app.xml"].async("text");
      const app = xmlParser.parse(appXml);
      metadata.company = findTextByLocalName(app, "Company");
    }
  } catch (e) {}

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
