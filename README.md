# AI Filing Assistant Workflow

The application includes a local-first IP preparation workflow at
`/filing-assistant`. A user description is converted into a structured invention
profile, refined with adaptive questions, turned into an AI-generated preliminary
draft, searched against the indexed local FAISS corpus, and scored for IP
readiness.

## Workflow API

- `POST /api/filing/start` extracts a profile from an initial description.
- `POST /api/filing/message` adds clarification to a filing session.
- `POST /api/filing/{session_id}/generate-draft` creates a preliminary draft.
- `POST /api/prior-art/search` searches the current local indexed corpus.
- `POST /api/readiness/score` calculates the deterministic 0-100 readiness score.

The readiness score is weighted across invention clarity (15%), technical detail
(20%), novelty articulation (15%), problem/solution clarity (15%), differentiation
(15%), documentation completeness (10%), and draft completeness (10%). It measures
preparation completeness, not patentability.

The prior-art endpoint reports only documents present in the local vector index.
Use the existing ingestion script to populate that corpus; an empty corpus is a
valid result and is shown as such in the UI. Document metadata is preserved rather
than fabricated.

Generated drafts and claim concepts are labelled: **AI-generated preliminary draft
— requires review by a qualified IP professional.** Similarity and readiness
outputs are AI-assisted preliminary assessments, not legal advice, a novelty
opinion, or a determination of patentability or infringement.

The workflow uses the existing Ollama and FastEmbed/FAISS integrations. Configure
`OLLAMA_BASE_URL` and `OLLAMA_MODEL` in `backend/.env` (the default provider is
local Ollama). If Ollama is unavailable, the profile retains the user's text and
the UI asks them to retry or continue manually.
# IP-SAKTI Sahayak

**Grounded decision-support for Indian IP and AYUSH regulatory guidance.**

> IP-SAKTI Sahayak provides informational guidance based on referenced official sources. It is not a substitute for professional legal advice or official government decisions. Please verify deadlines and legal conclusions against the latest official source.

---

## Architecture

```
User (text / voice / PDF)
        │
        ▼
   Next.js Frontend  ── chat, upload, source cards, action cards
        │  (REST/JSON)
        ▼
   FastAPI Backend (modular routers)
        │
   ┌────┼──────────┬──────────────┐
   │    │           │              │
   RAG  Document   Action     Language
   │    Pipeline   Generator  Layer
   │    │
   Embed + Chroma (local vector DB)
        │
   Retrieved chunks → LLM (Claude) → Evidence Checker → Response
```

**Core principle:** Trust → Evidence → Explanation → Action. Every answer shows *what was found → where it came from → what it means → what to do next.*

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router) + React + Tailwind CSS |
| Backend | Python 3.11+ + FastAPI |
| Vector DB | ChromaDB (local, embedded) |
| LLM | Claude (Anthropic API) |
| Embeddings | `sentence-transformers` — `paraphrase-multilingual-mpnet-base-v2` |
| PDF / OCR | PyMuPDF + pytesseract |
| DB | SQLite via SQLAlchemy |

---

## Project Structure

```
ip-sakti-sahayak/
├── frontend/          # Next.js app
├── backend/           # FastAPI service
│   ├── app/
│   │   ├── routers/   # chat, upload, document, sources, feedback
│   │   ├── services/  # rag, llm, embeddings, vector_store, confidence, language, document_intel
│   │   ├── models/    # Pydantic schemas + SQLAlchemy ORM
│   │   └── core/      # config, database
│   ├── scripts/
│   │   └── ingest.py  # offline KB ingestion
│   └── data/
│       └── pdfs/      # place curated PDFs here
└── README.md
```

---

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
# source venv/bin/activate

pip install -r requirements.txt

# Copy and fill in your keys
cp .env.example .env
# Edit .env: set ANTHROPIC_API_KEY

# Run the server
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 2. Ingest Knowledge Base

```bash
# Place your PDFs in backend/data/pdfs/
# Then:
cd backend
python scripts/ingest.py
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

---

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/chat` | Ask a question (grounded RAG) |
| `POST` | `/api/upload` | Upload a PDF document |
| `POST` | `/api/document/analyze` | Analyze an uploaded document |
| `GET` | `/api/sources` | List KB sources |
| `POST` | `/api/feedback` | Submit thumbs up/down |

---

## Environment Variables

See `backend/.env.example` for the full list.

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Claude API key |
| `CHROMA_PERSIST_DIR` | No | Path for Chroma DB (default: `./data/chroma_db`) |
| `DATABASE_URL` | No | SQLite URL (default: `sqlite+aiosqlite:///./ip_sakti.db`) |
| `EMBED_MODEL` | No | Sentence-transformers model name |
| `ALLOWED_ORIGINS` | No | CORS origins for frontend |

---

## Three Demo Journeys

1. **Multilingual RAG (Tamil):** Ask in Tamil about patenting an Ayurvedic formulation → grounded answer in Tamil + source cards + HIGH confidence badge.
2. **Document Intelligence:** Upload an examination notice PDF → extracted deadline + plain-language summary + compliance checklist.
3. **Actionable Compliance:** Ask how to protect an AYUSH startup's brand → trademark process + required documents + step list.

---

## Disclaimer

IP-SAKTI Sahayak provides informational guidance based on referenced official sources. It is not a substitute for professional legal advice or official government decisions. Please verify deadlines and legal conclusions against the latest official source.
