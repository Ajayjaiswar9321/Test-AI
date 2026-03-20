# Test AI - AI-Powered QA Automation Engine

AI-powered test automation platform that dynamically analyzes websites and generates comprehensive functional test cases — positive, negative, and security tests.

## Features

- **Dynamic Page Analysis** — Crawls target URL, detects forms, fields, labels, page type
- **Smart Functional Testing** — Fills forms, clicks buttons, tests login flows, validates errors
- **Positive + Negative Tests** — Valid data, empty fields, invalid formats, wrong credentials
- **Security Testing** — SQL injection, XSS attack detection
- **HD Live Preview** — Watch tests run in real-time with 2x resolution
- **AI Chatbot** — Gemini-powered test analysis and debugging assistant
- **Test Reports** — Detailed reports with pass/fail, screenshots, CSV export
- **One-Click Deploy** — Docker-ready for Render deployment

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion
- **Backend**: Express.js, TypeScript
- **Testing**: Playwright (headless Chromium)
- **AI**: Google Gemini 1.5 Flash (free tier)
- **Database**: SQLite (local) / Supabase (cloud)

## Quick Start

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`

## Environment Variables

Create a `.env` file:

```
GEMINI_API_KEY=your_gemini_api_key
```

Get a free API key at [aistudio.google.com](https://aistudio.google.com)

## Deploy on Render

1. Push to GitHub
2. Connect repo on [render.com](https://render.com)
3. Set `GEMINI_API_KEY` in environment variables
4. Deploy (uses Dockerfile automatically)

## License

MIT
