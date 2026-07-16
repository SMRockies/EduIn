# Sprint 2.7 - PDF Extractor Refactor

This sprint refactors the PDF extraction pipeline to make it deterministic, simpler, and easier to debug.

## What Changed

The extractor now follows a strict two-step flow:

1. Try `pdf-parse`
2. If the result is not meaningful, run OCR

No scoring heuristics are used. No fake fallback text is generated.
The readable-text threshold is now configurable through `PDF_MIN_TEXT_LENGTH`.

## Files Changed

- `extractors/pdf.extractor.js`
- `extractors/pdf.helpers.js`
- `config/ocr.js`
- `.env.example`

## Files Left Unchanged

- `renderers/pdf.renderer.js`
- `services/ocr.service.js`
- `controllers/*`
- `services/document.service.js`

## Decision Logic

The extractor now behaves deterministically:

- if `pdf-parse` succeeds and returns more than `PDF_MIN_TEXT_LENGTH` readable characters, return immediately
- otherwise run OCR
- if OCR succeeds, return the OCR text
- if OCR fails, return an empty document payload so the existing service layer can raise its normal no-text error path

## Removed Complexity

The following logic was removed from the PDF extractor:

- digital/scanned scoring thresholds
- page-level quality scoring
- average words per page heuristics
- fabricated fallback text
- nested fallback branches

## Logging

The extractor now logs:

- PDF detected
- parser succeeded
- characters extracted
- OCR started
- OCR finished
- extraction completed
- extraction failed
- parser errors

These logs are intended to make Vercel debugging straightforward.

## Metadata

The returned metadata is intentionally small and focused:

- `pages`
- `ocrUsed`
- `parser`
- `wordCount`
- `parserError`
- `processingTime`
- `source`

The OCR provider is now selected through a hook in `config/ocr.js` and defaults to OpenRouter. This keeps the provider layer open for future swaps without hardcoding one vision model name into the extractor.

## External Contract

The public return shape is unchanged:

```js
{
  extractedText,
  pages,
  metadata
}
```

## Testing Checklist

- Digital PDF with normal text
- Digital PDF with tables
- Digital PDF with long paragraphs
- Scanned PDF with image-only pages
- Mixed PDF that fails text extraction
- Corrupted PDF
- Password-protected PDF
- Large PDF for logging and performance sanity
- Verify no fake text is returned on failure
- Verify parser errors appear in metadata
- Verify OCR is not invoked when `pdf-parse` already returns readable text

## Architectural Notes

- Kept OCR and rendering services unchanged
- Reused the existing Vision OCR pipeline
- Moved orchestration into a small helper-based extractor
- Used a simple deterministic decision boundary so behavior is easy to reason about
- Preserved compatibility with the existing Document object and downstream AI features
