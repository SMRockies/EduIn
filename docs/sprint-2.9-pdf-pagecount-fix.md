# Sprint 2.9 - PDF Page Count Fix

This sprint fixes the PDF OCR routing bug by removing parser-driven page counting.

## What Changed

The extractor now:

- uses `pdf-parse` only for text extraction
- uses `pdf.js` only for page count and page rendering during OCR fallback
- opens the PDF once for OCR
- processes pages sequentially through a concurrency-limited queue
- no longer depends on parser cleanup hooks, parser screenshots, or parser page info during fallback

## Files Changed

- `extractors/pdf.extractor.js`
- `docs/sprint-2.9-pdf-pagecount-fix.md`

## Fixed Bug

Previously, if `pdf-parse` failed and the fallback parser page count was also unavailable, OCR could receive `pageCount = 0`, which meant no pages were processed.

The new flow avoids that by asking `pdf.js` directly for `numPages`.

## Simpler Architecture

The PDF pipeline is now:

1. Try `pdf-parse`
2. If text is readable, return immediately
3. Otherwise open the PDF with `pdf.js`
4. Read `numPages`
5. Render each page to an image
6. Run OCR only on fallback pages
7. Return the merged text or an empty result for the existing no-text path

## Removed Complexity

These were removed from the extractor:

- parser page-count fallback logic
- parser screenshots
- parser `getInfo`
- parser `destroy` handling
- `getPageCount`
- `destroyParser`

## Runtime Benefits

- OCR always has a real page count when `pdf.js` can open the file
- the PDF is opened once instead of once per page
- the control flow is easier to debug in Vercel logs

## Metadata

The public return shape is unchanged:

```js
{
  extractedText,
  pages,
  metadata
}
```

## Notes

The OCR service, renderer, controllers, and `DocumentService` were left unchanged.
