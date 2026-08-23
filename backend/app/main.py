"""
app/main.py — FastAPI application entry point.

Mounts all routers under /api and handles:
  - CORS
  - Lifespan startup (DB init)
  - Health check endpoint
  - Global exception handler
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.database import init_db
from app.services.ollama import check_ollama
from app.routers import calendar, chat, document, expert_brief, feedback, filing, investor_match, iot, multilingual, profile, regulations, sources, tk_risk, upload

logger = logging.getLogger(__name__)
settings = get_settings()

# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)


# ---------------------------------------------------------------------------
# Application lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup/shutdown tasks."""
    logger.info("🚀 IP-SAKTI Sahayak backend starting up…")

    # Initialise SQLite tables
    await init_db()
    logger.info("✅ Database ready.")

    # Pre-warm the embedding model (avoids cold-start latency on first request)
    try:
        from app.services.embeddings import embed_text

        embed_text("warm up")
        logger.info("✅ Embedding model loaded.")
    except Exception as e:
        logger.warning(f"⚠️  Embedding model pre-warm failed: {e}")

    yield  # application runs here

    logger.info("👋 IP-SAKTI Sahayak backend shutting down.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="IP-SAKTI Sahayak API",
    description=(
        "Grounded decision-support for Indian Intellectual Property and "
        "AYUSH regulatory guidance. Answers are cited, confidence-scored, "
        "and accompanied by actionable next steps."
    ),
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Global exception handler
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(f"Unhandled exception on {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again.", "code": "INTERNAL_ERROR"},
    )


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["system"], summary="Health check")
@app.get("/api/health", tags=["system"], summary="Health check")
async def health():
    """Returns API status and basic diagnostics."""
    import httpx
    from app.services.vector_store import collection_count

    chunk_count = collection_count()
    provider = settings.llm_provider.lower().strip()
    ollama_connected = False
    active_model = settings.ollama_model

    ollama_status = check_ollama() if provider == "ollama" else None
    if ollama_status:
        ollama_connected = ollama_status["status"] in {"ready", "model_missing"}

    llm_configured = (provider == "ollama" and ollama_connected) or (
        provider == "anthropic" and bool(settings.anthropic_api_key)
    )

    if provider == "ollama":
        msg = ollama_status["message"] if ollama_status else "Ollama is unavailable."
    else:
        msg = "Anthropic API ready." if bool(settings.anthropic_api_key) else "Anthropic API key not configured."

    return {
        "status": "ok",
        "version": "0.1.0",
        "llm_provider": provider,
        "llm_model": active_model if provider == "ollama" else settings.claude_model,
        "llm_configured": llm_configured,
        "kb_chunk_count": chunk_count,
        "message": msg,
        "ai_status": ollama_status["status"] if ollama_status else "unavailable",
    }


@app.get("/api/ai/health", tags=["system"], summary="Check local AI service")
async def ai_health():
    """Return whether Ollama is reachable and the configured model is installed."""
    return check_ollama()


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(document.router, prefix="/api", tags=["document"])
app.include_router(sources.router, prefix="/api", tags=["sources"])
app.include_router(feedback.router, prefix="/api", tags=["feedback"])
app.include_router(profile.router, prefix="/api", tags=["profile"])
app.include_router(tk_risk.router, prefix="/api", tags=["tk-risk"])
app.include_router(regulations.router, prefix="/api", tags=["regulations"])
app.include_router(calendar.router, prefix="/api", tags=["calendar"])
app.include_router(expert_brief.router, prefix="/api", tags=["expert-brief"])
app.include_router(investor_match.router, prefix="/api", tags=["investor-match"])
app.include_router(multilingual.router, prefix="/api", tags=["multilingual"])
app.include_router(filing.router, prefix="/api", tags=["filing-assistant"])
app.include_router(iot.router, prefix="/api/iot", tags=["iot"])
