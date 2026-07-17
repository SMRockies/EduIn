import { v4 as uuidv4 } from "uuid";

export class Document {
  constructor({ filename, mimeType, extractedText, pages, metadata = {} }) {
    this.id = uuidv4();
    this.filename = filename;
    this.mimeType = mimeType;
    this.pages = pages;
    this.wordCount = extractedText ? extractedText.split(/\s+/).filter(w => w.length > 0).length : 0;
    this.extractedText = extractedText || "";
    this.metadata = { ...metadata };
  }

  chunk(size = 1500) {
    const words = this.extractedText.split(/\s+/).filter(w => w.length > 0);
    const chunks = [];
    for (let i = 0; i < words.length; i += size) {
      chunks.push(words.slice(i, i + size).join(" "));
    }
    return chunks;
  }

  toJSON({ includeFullText = false } = {}) {
    return {
      id: this.id,
      filename: this.filename,
      mimeType: this.mimeType,
      pages: this.pages,
      wordCount: this.wordCount,
      extractedText: includeFullText ? this.extractedText : this.extractedText.substring(0, 200) + "...",
      metadata: this.metadata
    };
  }
}
