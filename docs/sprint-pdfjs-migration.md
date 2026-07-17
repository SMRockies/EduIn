# Sprint PDF.js Migration - Stable PDF Support

This sprint replaces the remaining `pdf-parse` dependency with a PDF.js-first extraction engine.

## What Changed

PDF extraction now uses Mozilla PDF.js as the only PDF engine.

It is responsible for:

- loading the PDF
- reading page count
- extracting selectable text
- reading metadata
- rendering pages for OCR fallback

The extractor no longer depends on parser page counts, parser screenshots, or parser-specific fallbacks.

## Files Changed

- `extractors/pdf.extractor.js`
- `extractors/pdf.helpers.js`
- `renderers/pdf.renderer.js`
- `package.json`
- `docs/sprint-pdfjs-migration.md`

## New Flow

1. Load the PDF with PDF.js.
2. Read `numPages`.
3. Extract selectable text from each page.
4. If the page text is meaningful, keep it.
5. If the page is sparse, render that page and run OCR through the existing Vision pipeline.
6. Merge digital and OCR text in page order.
7. Return the standard extractor object.

## Removed

- `pdf-parse`
- parser version detection
- parser handle logic
- parser screenshots
- parser cleanup helpers
- parser-driven page counting

## Kept

- `DocumentService`
- controllers
- routes
- OCR service
- AI service
- document object
- renderer architecture

## Logging

The extractor now logs:

- PDF detected
- PDF loaded
- Pages detected
- Text extracted
- OCR started
- OCR completed
- Extraction completed
- Extraction failed

## Error Handling

The extractor handles:

- corrupted PDFs
- password-protected PDFs
- empty PDFs
- image-only PDFs

If nothing readable exists, the extractor returns an empty document payload and the existing `DocumentService` continues to raise its normal `NO_TEXT` error.

## Metadata

The returned metadata remains compatible with the existing pipeline and can include PDF.js metadata as well as extraction stats.

## Notes

This migration is designed to be serverless-friendly and easier to debug in Vercel logs.
