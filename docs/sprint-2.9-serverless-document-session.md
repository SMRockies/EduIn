# Sprint 2.9 - Serverless Document Session Fix

## Problem

On Vercel, document actions such as `Summarize`, `Explain`, `Quiz`, and `Ask` were returning `404 Document not found`.

The root cause was the in-memory `docStore` in `controllers/documentController.js`.

- Upload requests and follow-up document action requests can hit different serverless instances.
- The uploaded document existed only in process memory.
- The next request often had an empty `docStore`, so the backend could not resolve the uploaded document.

## Fix

Implemented a serverless-safe document handoff:

- The upload response now returns the full extracted text for the current document.
- The frontend stores the full document in `sessionStorage`.
- Every document action request now sends the document payload along with `documentId`.
- The controller resolves documents from:
  - the in-memory store when available
  - the incoming document payload as a fallback

## Files Changed

- `utils/Document.js`
- `controllers/documentController.js`
- `public/api.js`
- `public/events.js`

## Result

- Works locally
- Works on Vercel serverless deployments
- No dependency on request-to-request memory persistence for document actions
- Existing AI features continue to use the same document pipeline

