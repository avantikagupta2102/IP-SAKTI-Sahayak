"""Health and connectivity checks for the configured local Ollama service."""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def check_ollama() -> dict[str, Any]:
    settings = get_settings()
    base_url = settings.ollama_base_url.rstrip("/")
    try:
        with httpx.Client(timeout=min(settings.ollama_timeout_seconds, 5.0), trust_env=False) as client:
            response = client.get(f"{base_url}/api/tags")
            response.raise_for_status()
            models = response.json().get("models", [])
            installed = {model.get("name") or model.get("model") for model in models}
            if settings.ollama_model not in installed:
                return {"status": "model_missing", "provider": "ollama", "model": settings.ollama_model, "base_url": base_url, "message": f"Ollama is running, but model '{settings.ollama_model}' is not installed."}
            return {"status": "ready", "provider": "ollama", "model": settings.ollama_model, "base_url": base_url, "message": f"Ollama connected ({settings.ollama_model})."}
    except httpx.TimeoutException:
        logger.warning("Ollama health check timed out at %s", base_url)
        return {"status": "unavailable", "provider": "ollama", "model": settings.ollama_model, "base_url": base_url, "message": "Ollama health check timed out."}
    except Exception as exc:
        logger.warning("Ollama health check failed at %s: %s", base_url, exc)
        return {"status": "unavailable", "provider": "ollama", "model": settings.ollama_model, "base_url": base_url, "message": "Ollama is unavailable."}
