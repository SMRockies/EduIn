import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { PptxRenderer } from "pptx-svg";
import { Resvg } from "@resvg/resvg-js";

const require = createRequire(import.meta.url);
const wasmPath = require.resolve("pptx-svg/wasm");

export async function createPptxRenderer(pptxBuffer) {
  const renderer = new PptxRenderer();
  const wasmBytes = await readFile(wasmPath);
  await renderer.init(wasmBytes);
  await renderer.loadPptx(pptxBuffer);
  return renderer;
}

export async function renderSlideToPngBuffer(renderer, slideIndex) {
  const svg = await Promise.resolve(renderer.renderSlideSvg(slideIndex));

  if (!svg || typeof svg !== "string") {
    throw new Error(`Renderer returned no SVG for slide ${slideIndex + 1}`);
  }

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "original"
    }
  });

  const rendered = resvg.render();
  return Buffer.from(rendered.asPng());
}
