# Sprint 2.6 - Intelligent PDF OCR & Hybrid Document Processing

This update upgrades EduAI from a text-only PDF extractor into a hybrid document understanding pipeline.

## What Changed

PDF extraction now supports:

- digital PDFs with embedded text
- scanned PDFs with image-only pages
- mixed PDFs containing both text and scans

The user experience stays the same. Users still upload a PDF, and EduAI decides how to process it.

## Files Added

- `renderers/pdf.renderer.js`
- `services/ocr.service.js`
- `utils/mergeText.js`
- `docs/sprint-2.6-pdf-hybrid-ocr.md`

## Files Updated

- `extractors/pdf.extractor.js`
- `package.json`

## Processing Flow

1. Run `pdf-parse` first.
2. Measure text quality using word count, character count, and average words per page.
3. If the PDF looks digital, return the parsed text.
4. If it looks sparse, load the PDF page-by-page.
5. For each page:
   - extract page text
   - render sparse pages to PNG in memory
   - run Vision OCR only where needed
6. Merge digital and OCR text in page order.

## Smart PDF Detection

Heuristics used:

- `wordCount >= 50` means likely digital
- `averageWordsPerPage >= 20` means likely digital
- otherwise, the PDF is treated as image-heavy or hybrid

## Page-Level Hybrid Routing

Not every page gets OCR.

Each page is checked independently:

- if the page has enough text, keep the extracted text
- if the page is sparse, render it and send it to Vision OCR

This saves cost on mixed PDFs.

## Rendering

PDF pages are rendered with a server-side renderer into PNG buffers.

Important characteristics:

- in-memory only
- no temp files
- serverless-friendly
- cleanup is performed after page rendering

## OCR Integration

The existing OpenRouter vision model is reused.

Prompt used:

```text
Extract every readable word from this PDF page exactly as written. Preserve headings, paragraphs, tables, lists, figure labels, equations (if readable), and captions. Do not summarize. Return only the extracted text.
```

## Merge Rules

Merged output preserves page order and removes duplicate lines.

Page output format:

- `Page N`
- optional `(Digital)` block
- optional `(OCR)` block

## Metadata

The PDF extractor now returns richer metadata:

- `pages`
- `digitalPages`
- `ocrPages`
- `ocrUsed`
- `parser`
- `wordCount`

It also keeps the original `info` and `metadata` values from `pdf-parse`.

## Error Recovery

Recovery order:

1. If `pdf-parse` works and the PDF is digital, use it.
2. If `pdf-parse` works but the PDF is sparse, use page extraction and OCR.
3. If `pdf-parse` fails, try Vision-based extraction.
4. If everything fails, return a safe readable fallback message instead of crashing.

## Performance Notes

- OCR is only used for sparse pages.
- Processing is concurrent with a limit of 3 pages at a time.
- Large PDFs are handled in batches to reduce load and API pressure.

## Testing Checklist

- Digital PDFs
- Word export PDFs
- Google Docs export PDFs
- Research papers
- Scanned PDFs from Adobe Scan
- Scanned PDFs from CamScanner
- Scanned PDFs from Microsoft Lens
- Mixed PDFs with alternating text and scans
- Image-heavy PDFs with charts and tables
- Large PDFs with 100+ pages
- pdf-parse failure fallback path
- OCR failure fallback path
- Metadata output validation

## Architectural Decisions

- Kept all changes inside the extractor pipeline
- Added a reusable OCR service instead of embedding AI calls in the extractor
- Added a dedicated PDF renderer so rendering logic stays isolated
- Used memory-only buffers to stay compatible with serverless deployments
- Preserved backward compatibility with the existing Document object and downstream AI features
