import fs from "fs";
import { getExtractor } from "../extractors/extractorFactory.js";
import { Document } from "../utils/Document.js";
import { aiService } from "./ai.service.js";
import { documentSummarizePrompt } from "../prompts/document/summarize.js";
import { documentQuizPrompt } from "../prompts/document/quiz.js";
import { documentExplainPrompt } from "../prompts/document/explain.js";
import { documentQAPrompt } from "../prompts/document/qa.js";
import path from "path";

function cleanText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ +/g, " ")
    .trim();
}

function limitText(text, maxWords = 3000) {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ");
}

class DocumentService {
  async processUpload(file) {
    const ext = path.extname(file.originalname).replace(".", "").toLowerCase();
    const extractor = getExtractor(file.mimetype, ext);

    if (!extractor) {
      throw new Error(`UNSUPPORTED_FILE: No extractor for ${file.mimetype}`);
    }

    let result;
    try {
      result = await extractor(file.path);
    } catch (err) {
      throw new Error(`PARSER_FAILED: Failed to parse ${file.originalname}: ${err.message}`);
    }

    if (!result.extractedText || result.extractedText.trim().length === 0) {
      throw new Error(`NO_TEXT: No extractable text found in ${file.originalname}`);
    }

    const cleaned = cleanText(result.extractedText);
    const doc = new Document({
      filename: file.originalname,
      mimeType: file.mimetype,
      extractedText: cleaned,
      pages: result.pages,
      metadata: result.metadata
    });

    fs.unlink(file.path, () => {});

    return doc;
  }

  async summarize(doc) {
    const text = limitText(doc.extractedText);
    const prompt = documentSummarizePrompt(text);
    const result = await aiService.callOpenRouter(
      process.env.TEXT_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free",
      [{ role: "user", content: prompt }]
    );
    return result;
  }

  async quiz(doc) {
    const text = limitText(doc.extractedText);
    const prompt = documentQuizPrompt(text);
    const result = await aiService.callOpenRouter(
      process.env.TEXT_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free",
      [{ role: "user", content: prompt }]
    );
    return result;
  }

  async explain(doc) {
    const text = limitText(doc.extractedText);
    const prompt = documentExplainPrompt(text);
    const result = await aiService.callOpenRouter(
      process.env.TEXT_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free",
      [{ role: "user", content: prompt }]
    );
    return result;
  }

  async ask(doc, question) {
    const text = limitText(doc.extractedText);
    const prompt = documentQAPrompt(text, question);
    const result = await aiService.callOpenRouter(
      process.env.TEXT_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free",
      [{ role: "user", content: prompt }]
    );
    return result;
  }
}

export const documentService = new DocumentService();