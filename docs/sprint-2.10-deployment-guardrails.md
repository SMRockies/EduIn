# Sprint 2.10 - Deployment Guardrails

## Why These Changes

Live Vercel revalidation exposed three practical issues:

1. Large PDFs can exceed the serverless request payload limit.
2. The scanned-PDF OCR path must stay free and deterministic.
3. The generic error handler was reporting misleading OpenRouter messages for unrelated failures.

## What Changed

### Scanned PDF OCR

- PDF OCR now uses the local Tesseract path only.
- The PDF OCR branch no longer depends on OpenRouter.
- English OCR data is bundled locally under `assets/tessdata`.

### Upload Size Guardrail

- Added a 4MB upload limit in the server upload middleware.
- Added a matching client-side check before upload starts.
- This avoids hitting Vercel's payload ceiling with a cryptic platform error.

### Error Messaging

- Replaced the generic `OpenRouter unavailable` fallback with a document-processing message.
- File-too-large responses now tell the user to upload a PDF under 4MB.

## Files Changed

- `services/ocr.service.js`
- `middleware/upload.middleware.js`
- `middleware/error.middleware.js`
- `public/events.js`

## Operational Notes

- The local codebase is now aligned with the free OCR approach.
- The Vercel deployment still needs a fresh redeploy to pick up these changes.
- Larger PDFs will now be blocked before upload instead of failing deep inside the platform.

