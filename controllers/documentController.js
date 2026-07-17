import { documentService } from "../services/document.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

const docStore = new Map();

function normalizeIncomingDocument(document) {
  if (!document || typeof document !== "object") {
    return null;
  }

  const extractedText = typeof document.extractedText === "string" ? document.extractedText : "";

  if (!extractedText.trim()) {
    return null;
  }

  return {
    id: document.id || null,
    filename: document.filename || "document",
    mimeType: document.mimeType || "application/octet-stream",
    pages: Number(document.pages || 0),
    wordCount: Number(document.wordCount || extractedText.split(/\s+/).filter(Boolean).length),
    extractedText,
    metadata: document.metadata || {}
  };
}

function resolveStoredDocument(documentId, documentPayload) {
  if (documentId && docStore.has(documentId)) {
    return docStore.get(documentId);
  }

  return normalizeIncomingDocument(documentPayload);
}

export async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json(errorResponse("No file uploaded", 400));
    }

    const doc = await documentService.processUpload(req.file);
    docStore.set(doc.id, doc);

    return res.json(successResponse({
      document: doc.toJSON({ includeFullText: true }),
      message: `${doc.filename} processed successfully (${doc.wordCount} words)`
    }));
  } catch (error) {
    if (error.message.startsWith("UNSUPPORTED_FILE:")) {
      return res.status(415).json(errorResponse(error.message.replace("UNSUPPORTED_FILE: ", ""), 415));
    }
    if (error.message.startsWith("PARSER_FAILED:")) {
      return res.status(422).json({
        success: false,
        error: "Unable to extract text from uploaded document."
      });
    }
    if (error.message.startsWith("NO_TEXT:")) {
      return res.status(422).json({
        success: false,
        error: "Unable to extract text from uploaded document."
      });
    }
    next(error);
  }
}

export async function summarizeDocument(req, res, next) {
  try {
    const { documentId, document } = req.body;
    const doc = resolveStoredDocument(documentId, document);
    if (!doc) return res.status(404).json(errorResponse("Document not found. Upload again.", 404));

    const result = await documentService.summarize(doc);
    return res.json(successResponse({ output: result.content }, result.model, result.tokens));
  } catch (error) {
    next(error);
  }
}

export async function quizFromDocument(req, res, next) {
  try {
    const { documentId, document } = req.body;
    const doc = resolveStoredDocument(documentId, document);
    if (!doc) return res.status(404).json(errorResponse("Document not found. Upload again.", 404));

    const result = await documentService.quiz(doc);
    return res.json(successResponse({ output: result.content }, result.model, result.tokens));
  } catch (error) {
    next(error);
  }
}

export async function explainDocument(req, res, next) {
  try {
    const { documentId, document } = req.body;
    const doc = resolveStoredDocument(documentId, document);
    if (!doc) return res.status(404).json(errorResponse("Document not found. Upload again.", 404));

    const result = await documentService.explain(doc);
    return res.json(successResponse({ output: result.content }, result.model, result.tokens));
  } catch (error) {
    next(error);
  }
}

export async function askDocument(req, res, next) {
  try {
    const { documentId, document, question } = req.body;
    const doc = resolveStoredDocument(documentId, document);
    if (!doc) return res.status(404).json(errorResponse("Document not found. Upload again.", 404));
    if (!question || typeof question !== "string") {
      return res.status(400).json(errorResponse("Question is required", 400));
    }

    const result = await documentService.ask(doc, question);
    return res.json(successResponse({ output: result.content }, result.model, result.tokens));
  } catch (error) {
    next(error);
  }
}
