import { createRequire } from "node:module";
import path from "node:path";
import { aiService } from "./ai.service.js";
import { getOcrModel, getOcrProvider } from "../config/ocr.js";

const require = createRequire(import.meta.url);
const tesseractWorkerPath = require.resolve("tesseract.js/src/worker-script/node/index.js");
const tesseractCorePath = path.dirname(require.resolve("tesseract.js-core/package.json"));
const tessdataPath = path.resolve(process.cwd(), "assets", "tessdata");

const PDF_OCR_PROMPT = [
  "Extract every readable word from this PDF page exactly as written.",
  "Preserve headings, paragraphs, tables, lists, figure labels, equations (if readable), and captions.",
  "Do not summarize.",
  "Return only the extracted text."
] .join(" ");

let tesseractWorkerPromise = null;
let tesseractQueue = Promise.resolve();

export class OcrService {
  async extractPdfPageText(imageBuffer) {
    const provider = getOcrProvider();

    if (provider === "openrouter") {
      return this.runOpenRouter(imageBuffer);
    }

    return this.runTesseract(imageBuffer);
  }

  async runOpenRouter(imageBuffer) {
    const result = await aiService.callOpenRouter(
      getOcrModel(),
      [
        {
          role: "user",
          content: [
            { type: "text", text: PDF_OCR_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${imageBuffer.toString("base64")}`
              }
            }
          ]
        }
      ],
      {
        temperature: 0,
        maxTokens: 2000
      }
    );

    return normalizeText(result.content);
  }

  async runTesseract(imageBuffer) {
    try {
      return await enqueueTesseract(async () => {
        const worker = await getTesseractWorker();
        const result = await worker.recognize(imageBuffer);
        return normalizeText(result?.data?.text || "");
      });
    } catch (error) {
      console.error("Tesseract OCR failed", error);
      return "";
    }
  }
}

export const ocrService = new OcrService();

function enqueueTesseract(task) {
  const next = tesseractQueue.then(task, task);
  tesseractQueue = next.then(() => undefined, () => undefined);
  return next;
}

async function getTesseractWorker() {
  if (!tesseractWorkerPromise) {
    tesseractWorkerPromise = createTesseractWorker().catch((error) => {
      tesseractWorkerPromise = null;
      throw error;
    });
  }

  return tesseractWorkerPromise;
}

async function createTesseractWorker() {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    workerPath: tesseractWorkerPath,
    corePath: tesseractCorePath,
    langPath: tessdataPath
  });

  return worker;
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
