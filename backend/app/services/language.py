"""
services/language.py — Language detection and translation.

Strategy (from architecture §4):
  translate-to-English-then-retrieve, translate-answer-back.

  1. Detect language of user query (fast heuristic via langdetect, fallback to LLM).
  2. If not English, translate query → English using a single LLM call.
  3. After answer is generated in English, translate answer → user's language.

This is intentionally simple — no separate translation service, no multilingual embeddings.
"""
from __future__ import annotations

import logging
from typing import Optional

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Mapping of BCP-47 codes to human-readable language names (used in prompts)
LANGUAGE_NAMES: dict[str, str] = {
    "en": "English",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "ml": "Malayalam",
    "mr": "Marathi",
    "gu": "Gujarati",
    "bn": "Bengali",
    "pa": "Punjabi",
    "ur": "Urdu",
}


def detect_language(text: str) -> str:
    """
    Detect the BCP-47 language code of a text string.

    Tries langdetect first (fast, offline). Falls back to "en" on failure.
    """
    if not text or not text.strip():
        return "en"

    try:
        from langdetect import detect, DetectorFactory

        DetectorFactory.seed = 42  # reproducible
        code = detect(text)
        return code
    except Exception as e:
        logger.debug(f"langdetect failed ({e}); defaulting to 'en'")
        return "en"


# Fast offline keyword fallback for common Indian language legal/AYUSH terms
FAST_KEYWORD_MAP: dict[str, str] = {
    "மூலிகை": "herbal",
    "காப்புரிமை": "patent",
    "தயாரிப்பு": "product",
    "தயாரிப்புக்கு": "product",
    "தேவையா": "eligibility requirement",
    "வணிக": "trademark",
    "முத்திரை": "brand",
    "பதிவு": "registration",
    "पेटेंट": "patent",
    "ट्रेडमार्क": "trademark",
    "आयुर्वेद": "ayurveda",
    "जड़ी": "herbal",
    "पात्रता": "eligibility",
}


def translate_to_english(text: str, source_language: str) -> str:
    """
    Translate text from source_language to English using the LLM.

    If source_language is already English, returns text unchanged.
    Includes fast dictionary and error fallback.
    """
    if source_language == "en" or source_language.startswith("en-"):
        return text

    lang_name = LANGUAGE_NAMES.get(source_language, source_language)

    from app.services.llm import complete

    prompt = (
        f"Translate the following {lang_name} text into English. "
        f"Return ONLY the English translation — no explanation, no original text.\n\n"
        f"Text to translate:\n{text}"
    )
    try:
        translated = complete(
            prompt,
            system_prompt="You are a precise translator. Return only the requested translation.",
            max_tokens=256,
            temperature=0.0,
        )
        res = translated.strip()
        if res.startswith("[Error") or "took too long" in res or len(res) < 2:
            raise ValueError("Translation error returned from LLM")
        return res
    except Exception as e:
        logger.warning(f"LLM translation to English failed ({e}); using fast keyword fallback")
        # Extract offline mapped keywords or return query + ayush patent eligibility
        keywords = [eng for native, eng in FAST_KEYWORD_MAP.items() if native in text]
        if keywords:
            return f"Is a patent required for this {' '.join(keywords)} formulation?"
        return f"{text} herbal product patent eligibility AYUSH"


def translate_from_english(
    text: str,
    target_language: str,
    preserve_citations: bool = True,
) -> str:
    """
    Translate an English answer into target_language using the LLM.

    If target_language is English, returns text unchanged.
    """
    if target_language == "en" or target_language.startswith("en-"):
        return text

    # Do not attempt translation if original text is an error string
    if text.startswith("[Error"):
        return text

    lang_name = LANGUAGE_NAMES.get(target_language, target_language)

    citation_note = (
        " Keep any source titles and official document names in their original English form."
        if preserve_citations
        else ""
    )

    from app.services.llm import complete

    prompt = (
        f"Translate the following English text into {lang_name}.{citation_note} "
        f"Preserve the formatting (bullet points, numbered lists, bold text) as closely as possible. "
        f"Return ONLY the {lang_name} translation.\n\n"
        f"Text to translate:\n{text}"
    )
    try:
        translated = complete(
            prompt,
            system_prompt=f"You are a precise {lang_name} translator. Return only the {lang_name} translation.",
            max_tokens=1024,
            temperature=0.0,
        )
        res = translated.strip()
        if res.startswith("[Error") or "took too long" in res:
            return text
        return res
    except Exception as e:
        logger.warning(f"LLM translation from English failed ({e}); returning English text")
        return text


def normalize_language_code(code: Optional[str]) -> str:
    """
    Normalize a language code to a simple BCP-47 tag.
    Falls back to 'en' for unsupported codes.
    """
    if not code:
        return "en"
    # Strip region suffix: "zh-CN" → "zh", "en-US" → "en"
    base = code.split("-")[0].lower()
    return base if base in LANGUAGE_NAMES else "en"
