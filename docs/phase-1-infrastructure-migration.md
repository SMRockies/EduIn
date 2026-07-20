# Phase 1 - Infrastructure Migration for EduAI

## Goal

Move the EduAI backend away from Vercel serverless execution and onto a persistent Cloudflare runtime so the app behaves as closely as possible to the local development environment.

## Hosting Choice

Cloudflare Containers is the recommended Phase 1 target.

Why Cloudflare Containers:

- The app already runs as a standard Express server.
- The document pipeline depends on native Node libraries and long-lived in-memory processing.
- Cloudflare Containers can run code written in any runtime and support applications that need a full filesystem or Linux-like environment.
- The existing upload path can likely remain intact because the container can run the current Node server directly, but upload size, timeout behavior, and resource allocation should still be validated in the deployed Cloudflare setup.

Cloudflare Workers or Pages Functions alone are not a good Phase 1 fit for this codebase because the current backend relies on Node APIs and native dependencies that would require a much larger rewrite.

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

If the frontend and backend are deployed separately, set the frontend origin explicitly in the environment. If they are deployed together through the same Cloudflare-backed origin, no frontend URL change is needed.

### 3. Cloudflare deployment config

Added [`wrangler.toml`](../wrangler.toml) plus a [`Dockerfile`](../Dockerfile) so the app can be deployed as a Cloudflare Container-backed service.

### 4. Worker entrypoint

Added [`worker.js`](../worker.js) as the Cloudflare Worker entrypoint that forwards requests to the container.

### 5. Engine hint

Added a Node engine hint in [`package.json`](../package.json) to make the supported runtime explicit.

### 6. Environment example

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
2. Create a new Cloudflare Workers + Containers project, or connect the repo to an existing Cloudflare deployment workflow.
3. Ensure Docker is running locally for the first `wrangler deploy` (`docker info` should succeed).
4. Add environment variables in Cloudflare:
   - `OPENROUTER_API_KEY`
   - `CORS_ORIGIN` if the frontend is hosted separately
   - `MAX_UPLOAD_MB` if you want a deployment-specific upload cap
5. Deploy with `npx wrangler deploy`.

## Verification Checklist

- `GET /health` returns `200`
- startup logs show that Express is listening
- environment variables load successfully
- PDF upload works for normal digital PDFs
- scanned PDF fallback still works
- DOCX upload works
- XLSX upload works
- PPTX upload works
- image upload works
- summarize, explain, ask, and quiz actions still work
- large uploads are accepted within the Cloudflare request body limit for the selected plan
- multiple consecutive uploads continue working

## Rollback

If deployment fails, redeploy the last known working Vercel version while investigating the Cloudflare container configuration.

No application code migration or data migration is required to roll back.

## Phase 2 And Beyond

The following items are intentionally deferred to later phases:

- R2 object storage
- background OCR jobs
- streaming uploads
- persistent caching
- queue-based processing
- progress tracking
- authentication

These are future architecture improvements, not part of Phase 1.

## Notes

- The migration does not introduce new document-processing features.
- The frontend can continue using same-origin requests when it is served by the backend.
- If the frontend is split out later, only `CORS_ORIGIN` and the frontend API base need to be updated.
- Cloudflare Workers free and paid plans currently allow request bodies up to 100 MB, which is enough for the phase 1 target of files larger than Vercel's limit.
