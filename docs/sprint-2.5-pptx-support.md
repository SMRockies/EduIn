# Sprint 2.5 - PowerPoint (.PPTX) Document Support

## Overview

Extended EduAI to support Microsoft PowerPoint (.pptx) files with the same feature set as PDF, DOCX, and XLSX. Users can now upload, extract text from, summarize, quiz on, explain, and ask questions about PowerPoint presentations.

## Architecture

Only the extractor layer changed. `DocumentService`, controllers, routes, and AI service remain untouched.

```
PPTX Upload
      │
      ▼
PPTX Extractor (pptx.extractor.js)   ← NEW
      │
      ▼
Extract Text + Metadata (slide-aware)
      │
      ▼
Document Object (unchanged)
      │
      ▼
Existing DocumentService (unchanged)
      │
      ▼
OpenRouter → Summary / Quiz / Explain / Ask
```

## Files Changed

### 1. `extractors/pptx.extractor.js` (NEW)

The PPTX extractor uses `jszip` to parse the ZIP-based PPTX format and extract text from slide XML files.

**Key details:**
- Reads `ppt/slides/slideN.xml` files (sorted numerically)
- Extracts text from `<a:t>` elements within `<a:p>` (paragraph) blocks
- Preserves paragraph structure per slide
- Extracts metadata from `docProps/core.xml` and `docProps/app.xml` (title, author, subject, company)
- Returns `{ extractedText, pages, metadata }` matching the existing extractor interface
- Detects image-only/empty slides and returns empty `extractedText` when no text content exists (triggers the existing `NO_TEXT` error path)

**Output format:**
```
Slide 1
Introduction
Artificial Intelligence
Machine Learning
Deep Learning

Slide 2
Applications
Healthcare
Education
Finance
```

### 2. `extractors/extractorFactory.js` (MODIFIED)

Added PPTX MIME type and extension to the factory maps, plus the `case "pptx"` branch in the switch:

- MIME: `application/vnd.openxmlformats-officedocument.presentationml.presentation`
- Extension: `.pptx`

### 3. `middleware/upload.middleware.js` (MODIFIED)

Updated error message from:
```
Supported: PDF, DOCX, XLSX
```
to:
```
Supported: PDF, DOCX, XLSX, PPTX
```

### 4. `public/index.html` (MODIFIED)

- Updated `accept` attribute on file input: `.pdf,.docx,.xlsx` → `.pdf,.docx,.xlsx,.pptx`
- Updated label: `Choose PDF, DOCX, or XLSX` → `Choose PDF, DOCX, XLSX or PPTX`

## Error Handling

| Scenario | Behavior |
|---|---|
| Empty presentation (0 slides) | `No slides found in presentation` error → 422 response |
| Corrupted PPTX | `Corrupted, invalid, or password-protected PPTX file` error → 422 response |
| Password-protected PPTX | Same as corrupted (JSZip cannot open encrypted ZIPs) |
| Image-only slides (no text) | Empty `extractedText` → `NO_TEXT` error → 422 response |
| `.ppt` (old format) | Not supported (not a ZIP-based format) → 415 unsupported file error |
| No extractable content | DocumentService's existing `NO_TEXT` check handles this |

## Testing Checklist

| Test Case | Status |
|---|---|
| Presentation with text content | ✅ |
| Slide-aware extraction preserves boundaries | ✅ |
| Titles and bullet points | ✅ |
| Presentation with tables (extracts cell text from a:t) | ✅ |
| Presentation with speaker notes (ignored) | ✅ |
| Image-only presentation (reports no text) | ✅ |
| Empty presentation (0 slides) | ✅ |
| Corrupted PPTX file | ✅ |
| Password-protected PPTX | ✅ |
| Metadata extraction (title, author, subject, company) | ✅ |
| Upload accepts .pptx via MIME and extension | ✅ |

## Dependencies

No new runtime dependencies added. `jszip` was already available as a transitive dependency of existing packages.
