# EduAI - AI Powered Learning Assistant

EduAI is a Semester 6 Entrepreneurship and Skill Development project aligned with **SDG 4: Quality Education**. It is a web-based AI learning assistant that helps students understand topics, summarize notes, and generate quizzes using the OpenRouter Chat Completions API.

## Project Overview

EduAI provides a simple single-page interface where a user can:

- ask AI to explain a topic in simple language
- summarize notes into concise bullet points
- generate five multiple-choice questions with answers
- view responses in rendered Markdown format
- copy the final response with one click

The project uses:

- **Backend:** Node.js, Express, dotenv, CORS
- **Frontend:** HTML, CSS, JavaScript
- **AI API:** OpenRouter Chat Completions
- **Markdown Rendering:** marked.js

## Features

- Clean responsive UI
- Blue gradient hero header
- Modern card-based layout
- Three AI actions:
  - Ask AI
  - Summarize Notes
  - Generate Quiz
- Loading state while AI response is being generated
- Markdown response rendering
- Copy button for output text
- Environment-based API key management

## Folder Structure

```text
Eduin/
│── package.json
│── package-lock.json
│── .env
│── server.js
│── README.md
│── public/
│     ├── index.html
│     ├── style.css
│     └── script.js
```

## How It Works

1. The user enters a topic or notes in the textarea.
2. A button sends a formatted prompt to the backend.
3. The backend receives the prompt on `POST /api/chat`.
4. The backend forwards the request to OpenRouter.
5. The model response is returned to the frontend.
6. The frontend renders the Markdown response using `marked`.

## Backend Details

### Server

The backend is implemented in `server.js` using Express.

### Key Responsibilities

- load environment variables using `dotenv`
- enable CORS
- serve static files from `public/`
- accept JSON requests
- expose `POST /api/chat`
- forward the prompt to OpenRouter
- return only the AI response to the frontend

### API Route

`POST /api/chat`

#### Request Body

```json
{
  "prompt": "Explain this topic in simple language: ..."
}
```

#### Response

```json
{
  "response": "AI generated answer here"
}
```

## OpenRouter Configuration

The application uses:

```text
https://openrouter.ai/api/v1/chat/completions
```

Model:

```text
deepseek/deepseek-chat-v3:free
```

The API key is read from `.env`:

```env
OPENROUTER_API_KEY=YOUR_KEY_HERE
```

## Frontend Details

The frontend is a single-page interface located in `public/index.html`.

### Components

- App title: `EduAI`
- Subtitle: `AI Powered Learning Assistant`
- Input textarea
- Three buttons:
  - Ask AI
  - Summarize Notes
  - Generate Quiz
- Output card
- Copy button

### Prompt Behavior

#### Ask AI

Sends:

```text
Explain this topic in simple language:

<user input>
```

#### Summarize Notes

Sends:

```text
Summarize the following notes into concise bullet points:

<user input>
```

#### Generate Quiz

Sends:

```text
Generate five multiple choice questions with answers on:

<user input>
```

## Markdown Rendering

AI responses are rendered as HTML using `marked.js`.

This allows formatting such as:

- headings
- bold text
- italic text
- bullet lists

To keep headings visually compact, the output CSS reduces heading size in the response card.

## Setup Instructions

### 1. Install Dependencies

From the `Eduin` folder, run:

```bash
npm install
```

### 2. Configure API Key

Open `.env` and add your OpenRouter API key:

```env
OPENROUTER_API_KEY=YOUR_KEY_HERE
```

### 3. Start the Server

```bash
npm start
```

### 4. Open in Browser

Visit:

```text
http://localhost:3000
```

## Scripts

### `npm start`

Starts the Express server.

### `npm run dev`

Also starts the Express server. This project currently uses the same command for development.

## Files Explained

### `package.json`

Contains:

- project metadata
- dependencies
- scripts
- module type configuration

### `server.js`

Main backend file that:

- configures Express
- serves the frontend
- handles `/api/chat`
- calls OpenRouter

### `public/index.html`

Main user interface for EduAI.

### `public/style.css`

Contains the responsive styling and card-based design.

### `public/script.js`

Handles:

- button actions
- API requests
- loading state
- Markdown rendering
- copy button

### `.env`

Stores the OpenRouter API key securely.

## Expected Output

When the user presses any AI button, the app:

- shows a loading message
- waits for the API response
- renders formatted Markdown in the output card
- lets the user copy the final response

## Notes for Presentation

This project can be presented as an AI-based academic helper that supports learning efficiency and better understanding of study material. It is suitable for an ESD semester project because it combines:

- entrepreneurship-oriented problem solving
- practical web development
- AI integration
- education-focused social impact

## Future Improvements

Possible upgrades include:

- chat history
- topic suggestions
- voice input
- export to PDF
- better response formatting
- authentication for personalized learning sessions

## License

This project is created for academic use.
