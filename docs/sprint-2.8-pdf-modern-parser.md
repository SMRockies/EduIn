# Sprint 2.8 - Modern PDF Parser Upgrade

This sprint improves PDF reliability by moving the extractor to the modern public `pdf-parse` API and using its native screenshot path for OCR fallback when available.

## What Changed

The PDF extractor now:

- uses the public `pdf-parse` API instead of the older internal import path
- prefers the modern parser class when available
- reuses the parser’s own screenshot support for OCR fallback
- keeps the legacy renderer only as a fallback path
- preserves the same external extractor contract

## Files Changed

- `extractors/pdf.extractor.js`
- `package.json`
- `docs/sprint-2.8-pdf-modern-parser.md`

## Behavior

The extraction flow remains simple:

1. Try `pdf-parse`
2. If readable text exists, return immediately
3. Otherwise run OCR
4. If OCR succeeds, return the document
5. If everything fails, return an empty result so the existing service layer can raise the normal no-text error

## Improvements

- Better compatibility with malformed PDFs
- Cleaner parsing logic
- Public API usage only
- Less reliance on custom rendering code
- More predictable OCR fallback

## Metadata

The extractor still returns the same structure:

```js
{
  extractedText,
  pages,
  metadata
}
```

Metadata continues to include:

- `pages`
- `ocrUsed`
- `parser`
- `wordCount`
- `parserError`
- `source`
- `processingTime`

## Notes

The OCR service and controllers were left unchanged.

The legacy renderer remains available only as a fallback if the modern `pdf-parse` screenshot path is not available.
