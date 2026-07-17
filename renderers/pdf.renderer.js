import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { createCanvas } from "@napi-rs/canvas";

const require = createRequire(import.meta.url);
const pdfjsPath = require.resolve("pdfjs-dist/legacy/build/pdf.mjs");
const pdfjsWorkerPath = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
const pdfjsLibPromise = import(pathToFileURL(pdfjsPath).href);
const pdfjsWorkerSrc = pathToFileURL(pdfjsWorkerPath).href;

export async function loadPdfDocument(buffer) {
  const pdfjsLib = await pdfjsLibPromise;
  if (pdfjsLib?.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc;
  }

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    stopAtErrors: false,
    disableRange: true,
    disableStream: true,
    useWorkerFetch: false,
    isEvalSupported: false
  });

  return loadingTask.promise;
}

export async function extractPageText(page) {
  const textContent = await page.getTextContent();
  const parts = [];

  for (const item of textContent.items || []) {
    const text = typeof item.str === "string" ? item.str.trim() : "";
    if (!text) continue;

    parts.push(text);
    if (item.hasEOL) {
      parts.push("\n");
    } else {
      parts.push(" ");
    }
  }

  return normalizePageText(parts.join(""));
}

export async function renderPdfPageToPngBuffer(page, scale = 2) {
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const renderTask = page.render({
    canvasContext: context,
    viewport
  });

  await renderTask.promise;

  if (typeof page.cleanup === "function") {
    page.cleanup();
  }

  return Buffer.from(await canvas.encode("png"));
}

function normalizePageText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
