# Sprint 2.5.1 - Robust PPTX Extraction with OCR Fallback

This update makes PPTX ingestion resilient for image-heavy presentations such as Google Slides exports.

## What Changed

The PPTX extractor now follows a two-stage pipeline:

1. Extract XML text from every slide using `<a:t>` nodes.
2. If the extracted text is sparse, render the slide to an image in memory and run OCR through the existing OpenRouter vision model.

## Files Added

- `extractors/pptx.helpers.js`
- `extractors/pptx.renderer.js`
- `extractors/pptx.vision.js`
- `docs/sprint-2.5.1-pptx-ocr-fallback.md`

## Files Updated

- `extractors/pptx.extractor.js`
- `package.json`

## XML Extraction Improvements

The previous paragraph-based slide parser was replaced with a more robust XML text pass that:

- reads every `<a:t>` node
- decodes XML entities
- ignores empty text nodes
- preserves slide order
- preserves slide boundaries
- does not depend on `<a:p>`
- keeps multi-run text in correct sequence

## OCR Fallback Logic

After XML extraction, the extractor measures:

- character count
- word count

If the slide is sparse:

- `wordCount < 50`, or
- `characterCount < 250`

then OCR is triggered for that slide.

## Rendering Strategy

Slides are rendered in memory only:

- no temp files
- no disk writes
- no cleanup jobs needed

Rendering is best-effort:

- if rendering fails, XML text is still returned
- if OCR fails, XML text is still returned

## Vision OCR Prompt

The existing OpenRouter vision model is reused with a slide OCR prompt that asks for:

- all readable text
- headings
- bullets
- tables
- chart labels
- legends
- captions

It explicitly asks the model not to summarize.

## Returned Metadata

The extractor still returns the same interface:

```js
{
  extractedText,
  pages,
  metadata
}
```

Additional metadata now includes:

- `ocrUsed`
- `xmlWordCount`
- `ocrWordCount`
- `totalWordCount`
- existing slide metadata fields

## Performance Notes

Only slides that look sparse are sent through OCR, so rich text-heavy slides remain fast.

## Error Handling

The extractor now avoids returning `NO_TEXT` unless both XML extraction and OCR fail to produce readable text.

## Testing Checklist

- PPTX with normal text slides
- PPTX with image-heavy Google Slides export
- PPTX with charts and labels
- PPTX with tables
- PPTX with mixed text and images
- PPTX with one sparse slide and multiple rich slides
- PPTX with corrupted ZIP structure
- PPTX with zero slides
- PPTX where renderer fails but XML text exists
- PPTX where OCR fails but XML text exists
- PPTX where both XML and OCR fail
- Verify `ocrUsed` is `true` only when OCR is attempted
- Verify `xmlWordCount`, `ocrWordCount`, and `totalWordCount`
- Verify existing summarize, quiz, explain, and ask flows still work unchanged

## Architectural Decisions

- Kept all changes inside the extractor layer
- Used a helper-based design to keep PPTX parsing, rendering, and OCR separate
- Preferred in-memory buffers for serverless compatibility
- Reused the existing OpenRouter vision setup instead of adding a new OCR engine
- Kept XML extraction as the fast path and OCR as a selective fallback
