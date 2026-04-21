# EULA Scout — AI-Powered Software EULA Analyzer

EULA Scout is a full-stack web application that helps software procurement teams quickly analyze End User License Agreements using OpenAI's GPT models. Upload any text-based PDF EULA and receive a structured risk assessment, key clause breakdown, and procurement recommendations in seconds.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| AI | OpenAI Chat Completions API |
| PDF Parsing | pdf-parse |
| File Upload | multer |

## Getting Started

### Prerequisites

- Node.js 18+
- An OpenAI API key

### 1. Clone / open the project

```
cd eula-scout
```

### 2. Configure environment variables

Edit `backend/.env` and add your OpenAI API key:

```env
OPENAI_API_KEY=sk-...your-key-here...
OPENAI_MODEL=gpt-5.4-azure
PORT=5000
```

### 3. Install dependencies

```bash
# From eula-scout root
npm install           # installs concurrently
cd backend && npm install
cd ../frontend && npm install
```

Or from the root:
```bash
npm run install:all
```

### 4. Run the application

```bash
# From eula-scout root — starts both backend (port 5000) and frontend (port 5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
eula-scout/
├── backend/
│   ├── server.js          # Express server entry point
│   ├── routes/
│   │   └── analyze.js     # POST /api/analyze — file upload, PDF parse, OpenAI call
│   ├── utils/
│   │   └── pdfParser.js   # pdf-parse wrapper
│   └── .env               # Environment variables (not committed)
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main application shell and results dashboard
│   │   ├── main.jsx           # React entry point
│   │   ├── index.css          # Tailwind imports + global styles
│   │   └── components/
│   │       ├── UploadZone.jsx  # Drag-and-drop PDF upload
│   │       ├── SummaryCard.jsx # Software info + executive summary
│   │       ├── RiskBadge.jsx   # Color-coded risk indicator
│   │       └── KeyClauseList.jsx # Accordion clause breakdown
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── package.json           # Root scripts + concurrently
└── README.md
```

## Features

- **Drag-and-drop PDF upload** — supports files up to 10 MB
- **AI-powered analysis** — structured JSON output covering risk level, key clauses, data privacy, IP, termination, auto-renewal, liability, and more
- **Color-coded risk indicators** — Low (green), Medium (amber), High (red)
- **Expandable clause cards** — click to see plain-English summaries and original text excerpts
- **Procurement recommendations** — numbered checklist tailored to each EULA
- **Print/export** — "Download Summary" triggers `window.print()` for PDF export

## API

### `POST /api/analyze`

| Field | Type | Description |
|-------|------|-------------|
| `eulaFile` | `multipart/form-data` | The PDF file to analyze |

**Success response** (200): Structured JSON matching the OpenAI system prompt schema.

**Error responses**: 400 (no file / wrong type), 413 (file too large), 422 (unreadable PDF), 429 (rate limit), 502 (API failure).

## Security Notes

- API key is stored server-side only, never exposed to the browser.
- File uploads are held in memory (never written to disk).
- CORS is restricted to `http://localhost:5173` in development.

## License

MIT
