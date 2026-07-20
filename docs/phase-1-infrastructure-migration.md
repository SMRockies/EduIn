# Phase 1 - Infrastructure Migration for EduAI

## Goal

Move the EduAI backend away from Vercel serverless execution and onto a persistent Node.js host so the app behaves like the local development environment.

## Hosting Choice

Render is the recommended Phase 1 target.

Why Render:

- The app already runs as a standard Express server.
- The document pipeline depends on native Node libraries and long-lived in-memory processing.
- Render supports persistent web services, multipart uploads, and large request bodies more naturally than Vercel serverless functions.

Cloudflare Workers is not a good Phase 1 fit for this codebase because the current backend relies on Node APIs and native dependencies that would require a much larger rewrite.

## What Changed

### 1. Server bootstrap hardened for persistent hosting

Updated [`server.js`](../server.js) to:

- keep the app running as a long-lived Express process
- use environment-driven CORS
- add a lightweight `/health` endpoint
- log startup and shutdown events
- handle graceful shutdown on `SIGINT` and `SIGTERM`

### 2. Production CORS support

Added support for:

- `CORS_ORIGIN`
- `FRONTEND_ORIGIN`

If the frontend and backend are deployed separately, set the frontend origin explicitly in the environment. If they are deployed together on the same Render service, no frontend URL change is needed.

### 3. Render deployment manifest

Added [`render.yaml`](../render.yaml) so the service can be deployed as a persistent Node web service.

### 4. Engine hint

Added a Node engine hint in [`package.json`](../package.json) to make the supported runtime explicit.

### 5. Environment example

Updated [`.env.example`](../.env.example) to include the CORS origin setting used by the migration.

## What Did Not Change

The following parts were intentionally left untouched:

- document extraction logic
- OCR pipeline
- upload route names
- AI route names
- frontend UI structure
- request and response formats

This phase is infrastructure-only.

## Deployment Steps

1. Push the repository to GitHub.
2. Create a new Render Web Service from the repo.
3. Let Render use the included `render.yaml`, or set these values manually:
   - `buildCommand: npm install`
   - `startCommand: npm start`
   - `healthCheckPath: /health`
4. Add environment variables in Render:
   - `OPENROUTER_API_KEY`
   - `PORT` is handled by Render automatically
   - `CORS_ORIGIN` if the frontend is hosted separately
   - `MAX_UPLOAD_MB` if you want a deployment-specific upload cap
5. Deploy the service.

## Verification Checklist

- `GET /health` returns `200`
- PDF upload works for normal digital PDFs
- scanned PDF fallback still works
- DOCX upload works
- XLSX upload works
- PPTX upload works
- image upload works
- summarize, explain, ask, and quiz actions still work
- large uploads are accepted within the Render plan limits
- multiple consecutive uploads continue working

## Notes

- The migration does not introduce new document-processing features.
- The frontend can continue using same-origin requests when it is served by the backend.
- If the frontend is split out later, only `CORS_ORIGIN` and the frontend API base need to be updated.
