import JSZip from "jszip";

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

function extractTextFromSlideXml(xmlContent) {
  const paragraphs = [];
  const paragraphRegex = /<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g;
  let paragraphMatch;

  while ((paragraphMatch = paragraphRegex.exec(xmlContent)) !== null) {
    const paragraphContent = paragraphMatch[1];
    const textRuns = [];
    const textRunRegex = /<a:t\b[^>]*>([^<]*)<\/a:t>/g;
    let textMatch;

    while ((textMatch = textRunRegex.exec(paragraphContent)) !== null) {
      textRuns.push(textMatch[1]);
    }

    if (textRuns.length > 0) {
      paragraphs.push(textRuns.join(""));
    }
  }

  return paragraphs.join("\n");
}

async function extractPptxMetadata(zip) {
  const metadata = {};

  try {
    if (zip.files["docProps/core.xml"]) {
      const coreXml = await zip.files["docProps/core.xml"].async("text");
      metadata.title =
        extractXmlValue(coreXml, "dc:title") ||
        extractXmlValue(coreXml, "title");
      metadata.author =
        extractXmlValue(coreXml, "dc:creator") ||
        extractXmlValue(coreXml, "creator");
      metadata.subject =
        extractXmlValue(coreXml, "dc:subject") ||
        extractXmlValue(coreXml, "subject");
    }
  } catch (e) {}

  try {
    if (zip.files["docProps/app.xml"]) {
      const appXml = await zip.files["docProps/app.xml"].async("text");
      metadata.company = extractXmlValue(appXml, "Company");
    }
  } catch (e) {}

  return metadata;
}

function extractXmlValue(xml, tag) {
  const escapedTag = tag.replace(/:/g, "\\:");
  const match = xml.match(
    new RegExp(`<${escapedTag}[^>]*>([^<]*)<\\/${escapedTag}>`)
  );
  return match ? match[1].trim() : undefined;
}
