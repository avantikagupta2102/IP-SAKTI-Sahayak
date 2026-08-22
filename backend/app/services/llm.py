"""
services/llm.py — Anthropic Claude client wrapper.

Provides a single `complete()` function that handles:
  - Building the grounded system prompt
  - Calling the Anthropic messages API
  - Graceful stub response when no API key is set (dev mode)
"""
from __future__ import annotations

import logging
from typing import Optional

import anthropic

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ---------------------------------------------------------------------------
# Grounding system prompt — the heart of the trust architecture.
# ---------------------------------------------------------------------------
GROUNDING_SYSTEM_PROMPT = """You are IP-SAKTI Sahayak, an AI assistant for Indian Intellectual Property \
(IP) law and AYUSH regulatory guidance.

STRICT RULES — follow these at all times:
1. Answer ONLY using the evidence chunks provided below. Do NOT use general knowledge to fill gaps.
2. Cite the source title for EVERY factual claim you make (e.g. "According to [Source Title]...").
3. If the evidence does not fully answer the question, say so explicitly. Tell the user to consult \
the cited official source directly. Do not fabricate or extrapolate.
4. Use simple, plain language. Avoid legal jargon where possible. If a legal term is unavoidable, \
briefly explain it in parentheses.
5. End every answer with a short "Next Steps" section listing 2–5 concrete actions the user should take, \
if the evidence supports them.
6. You may acknowledge when a topic is outside what the evidence covers, but never invent an answer.

Your tone: professional, helpful, reassuring — like a knowledgeable friend who happens to understand \
Indian IP law, not a cold legal database.
"""

_client: Optional[anthropic.Anthropic] = None


def _get_client() -> Optional[anthropic.Anthropic]:
    global _client
    if _client is None and settings.anthropic_api_key:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


def complete(
    user_prompt: str,
    system_prompt: Optional[str] = None,
    max_tokens: int = 2048,
    temperature: float = 0.1,
) -> str:
    """
    Send a message to Claude and return the text response.

    Args:
        user_prompt:   The user-facing prompt (may contain injected evidence).
        system_prompt: Optional override for the system prompt.
                       Defaults to GROUNDING_SYSTEM_PROMPT.
        max_tokens:    Maximum output tokens.
        temperature:   Sampling temperature. Low (0.1) for factual grounding.

    Returns:
        The model's text response as a plain string.
        Falls back to a stub response if no API key is configured.
    """
    client = _get_client()

    if client is None:
        logger.warning("No ANTHROPIC_API_KEY set — returning stub response.")
        return _stub_response(user_prompt)

    response = client.messages.create(
        model=settings.claude_model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system_prompt or GROUNDING_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    return response.content[0].text  # type: ignore[index]


def complete_json(
    user_prompt: str,
    system_prompt: Optional[str] = None,
    max_tokens: int = 1024,
) -> str:
    """
    Like complete() but instructs the model to return valid JSON only.
    Caller is responsible for json.loads().
    """
    json_system = (
        (system_prompt or GROUNDING_SYSTEM_PROMPT)
        + "\n\nRespond with valid JSON only. No markdown fences. No explanation outside the JSON."
    )
    return complete(user_prompt, system_prompt=json_system, max_tokens=max_tokens, temperature=0.0)


# ---------------------------------------------------------------------------
# Stub / dev-mode response
# ---------------------------------------------------------------------------

def _stub_response(prompt: str) -> str:
    return (
        "[STUB — No API key configured]\n\n"
        "IP-SAKTI Sahayak is running in development mode. "
        "Set ANTHROPIC_API_KEY in your .env file to enable live responses.\n\n"
        "**Next Steps:**\n"
        "1. Copy backend/.env.example to backend/.env\n"
        "2. Add your Anthropic API key\n"
        "3. Restart the backend server"
    )
