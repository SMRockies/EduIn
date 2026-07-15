# EduAI - AI Powered Learning Assistant

EduAI is a Semester 6 Entrepreneurship and Skill Development project aligned with **SDG 4: Quality Education**. It is a web-based AI learning assistant that helps students understand topics, summarize notes, and generate quizzes using the OpenRouter Chat Completions API.

## Features

- Ask AI to explain any topic in simple language
- Summarize notes into concise bullet points
- Generate five multiple-choice questions with answers
- Markdown response rendering
- Copy to clipboard
- Loading states and error handling

## Architecture

```
EduAI
│
├── config/
│     openrouter.js              # OpenRouter config, model selection from .env
│
├── routes/
│     ai.routes.js               # AI chat routes (/api/chat, /api/vision, /api/audio, /api/video)
│     document.routes.js         # Document routes (/api/documents/upload, /summarize, /quiz, /explain, /ask)
│
├── controllers/
│     aiController.js            # AI request handling, validation, response formatting
│     documentController.js      # Document upload, AI actions on documents
│
├── services/
│     ai.service.js              # AI Gateway — all OpenRouter calls go through here
│     document.service.js        # Document processing — extract, clean, limit, AI actions
│
├── extractors/
│     pdf.extractor.js           # PDF text extraction (pdf-parse)
│     word.extractor.js          # DOCX text extraction (mammoth)
│     excel.extractor.js         # XLSX text extraction (exceljs)
│     extractorFactory.js        # Routes file to correct extractor by MIME/extension
│
├── prompts/
│     chat.prompt.js             # Prompt template: Ask AI
│     summary.prompt.js          # Prompt template: Summarize Notes
│     quiz.prompt.js             # Prompt template: Generate Quiz
│     vision.prompt.js           # Prompt template: Image analysis
│     document/
│       summarize.js             # Document summarization prompt
│       quiz.js                  # Document quiz generation prompt
│       explain.js               # Document explanation prompt
│       qa.js                    # Document Q&A prompt
│
├── middleware/
│     error.middleware.js        # Global error handler with user-friendly messages
│     logger.middleware.js       # Request logging (time, method, status, duration)
│     upload.middleware.js       # Multer file upload config (10MB limit, MIME validation)
│
├── utils/
│     Document.js                # Document model (id, filename, mimeType, pages, wordCount, extractedText, metadata)
│     response.js                # Standardized API response format
│
├── public/
│     index.html                 # Main UI with chat + document upload sections
│     style.css                  # Styling
│     api.js                     # API layer (HTTP requests)
│     ui.js                      # DOM manipulation
│     events.js                  # Event handlers (entry point)
│
├── uploads/                     # Temporary file storage (auto-cleaned after processing)
├── server.js                    # Express initialization, route mounting (~36 lines)
├── .env                         # Environment variables
├── .env.example                 # Example env file
└── package.json
```

## Data Flow

```
User clicks button
       ↓
events.js (event handler)
       ↓
api.js (HTTP POST /api/chat)
       ↓
server.js → routes/ai.routes.js
       ↓
controllers/aiController.js (validation)
       ↓
services/ai.service.js (AI Gateway)
       ↓
config/openrouter.js (model, API key)
       ↓
OpenRouter API
       ↓
Response flows back through the same chain
       ↓
ui.js (renders Markdown via marked.js)
```

## Environment Variables

```
# Required
OPENROUTER_API_KEY=your_key_here

# Model Selection (change without code edits)
TEXT_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
VISION_MODEL=openai/gpt-4o-mini
AUDIO_MODEL=openai/whisper-1
VIDEO_MODEL=google/gemini-1.5-pro

# Server
PORT=3000
```

## API

### `POST /api/chat`

**Request:**
```json
{
  "prompt": "Explain quantum computing",
  "type": "askAi"
}
```

`type` can be: `askAi`, `summarize`, `quiz`

**Response:**
```json
{
  "success": true,
  "data": {
    "output": "AI generated response in Markdown"
  },
  "model": "nvidia/nemotron-3-ultra-550b-a55b:free",
  "tokens": 142
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "AI service temporarily unavailable",
  "details": {
    "provider": "OpenRouter",
    "hint": "Try again in a moment"
  }
}
```

## Document API

### `POST /api/documents/upload`

Upload a PDF, DOCX, or XLSX file (max 10MB).

**Request:** `multipart/form-data` with field `file`

**Response:**
```json
{
  "success": true,
  "data": {
    "document": {
      "id": "uuid",
      "filename": "notes.pdf",
      "mimeType": "application/pdf",
      "pages": 5,
      "wordCount": 1520,
      "extractedText": "First 200 chars...",
      "metadata": {}
    },
    "message": "notes.pdf processed successfully (1520 words)"
  }
}
```

### `POST /api/documents/summarize`

```json
{ "documentId": "uuid" }
```

### `POST /api/documents/quiz`

```json
{ "documentId": "uuid" }
```

### `POST /api/documents/explain`

```json
{ "documentId": "uuid" }
```

### `POST /api/documents/ask`

```json
{ "documentId": "uuid", "question": "What is the main argument?" }
```

All document AI actions return the standard response format.

## Document Data Flow

```
User selects file → Upload → Multer (validation) → Extractor Factory
                                                          ↓
                                            ┌────────────┼────────────┐
                                            │            │            │
                                       PDF Parser   DOCX Parser  XLSX Parser
                                            │            │            │
                                            └────────────┼────────────┘
                                                          ↓
                                                  Extracted Text
                                                          ↓
                                              Document Processor
                                          (clean, normalize, limit)
                                                          ↓
                                                  Document Model
                                          {id, filename, pages, wordCount, text}
                                                          ↓
                                              AI Gateway → OpenRouter
                                                          ↓
                                                     Response
```

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your OPENROUTER_API_KEY
npm start
# Visit http://localhost:3000
```

## Sprint 1 — Foundation & AI Gateway

- Modular folder structure with separation of concerns
- AI Gateway Service (`services/ai.service.js`)
- Config system with `.env` model selection
- Prompt library in `prompts/`
- Standardized API responses (`utils/response.js`)
- Global error middleware (`middleware/error.middleware.js`)
- Request logging (`middleware/logger.middleware.js`)
- Frontend split into `api.js`, `ui.js`, `events.js`
- `server.js` under 35 lines, OpenRouter code fully removed

## Sprint 2 — Document Intelligence

- Upload endpoint (`POST /api/documents/upload`) with multer file handling
- File validation (MIME type, extension, 10MB size limit)
- Extractor interface via `extractors/extractorFactory.js` — routes to correct parser
- PDF extraction via `pdf-parse` (`extractors/pdf.extractor.js`)
- DOCX extraction via `mammoth` (`extractors/word.extractor.js`)
- XLSX extraction via `exceljs` (`extractors/excel.extractor.js`)
- Document Abstraction Layer (`utils/Document.js`) — standardized model with `id`, `filename`, `mimeType`, `pages`, `wordCount`, `extractedText`, `metadata`, `chunk(size)` method
- Document processor (`services/document.service.js`) — text cleaning, normalization, word limiting (3000 word cap for AI), AI actions
- Document-specific prompt templates (`prompts/document/`)
- Frontend upload UI with file picker, metadata preview, and action buttons (Summarize, Quiz, Explain, Ask Question)
- Error handling for: unsupported files (415), parser failures (422), no extractable text (422), file too large (413), document not found (404)

## License

This project is created for academic use.