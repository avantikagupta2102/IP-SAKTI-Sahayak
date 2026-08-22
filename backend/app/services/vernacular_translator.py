"""
services/vernacular_translator.py — Legal & Technical Vernacular Translation Engine
"""
import logging
from typing import Dict, Optional

from app.services.language import LANGUAGE_NAMES, translate_from_english, translate_to_english
from app.services.llm import complete

logger = logging.getLogger(__name__)

# Specialized Legal Jargon Vernacular Dictionary for Indian Patent & Regulatory Framework
LEGAL_TECHNICAL_DICTIONARY: Dict[str, Dict[str, str]] = {
    "Patent Application": {
        "hi": "एकस्व आवेदन (Patent Application)",
        "ta": "காப்புரிமை விண்ணப்பம் (Patent Application)",
        "te": "పేటెంట్ దరఖాస్తు (Patent Application)",
    },
    "First Examination Report (FER)": {
        "hi": "प्रथम परीक्षा प्रतिवेदन (First Examination Report - FER)",
        "ta": "முதல் பரிசோதனை அறிக்கை (First Examination Report - FER)",
        "te": "మొదటి పరీక్ష నివేదిక (First Examination Report - FER)",
    },
    "Traditional Knowledge Digital Library (TKDL)": {
        "hi": "पारंपरिक ज्ञान डिजिटल लाइब्रेरी (TKDL)",
        "ta": "பாரம்பரிய அறிவு டிஜிட்டல் நூலகம் (TKDL)",
        "te": "సాంప్రదాయ పరిజ్ఞాన డిజిటల్ లైబ్రరీ (TKDL)",
    },
    "Section 3(p) Non-Patentability": {
        "hi": "धारा 3(p) गैर-एकस्वनीयता (Section 3(p) Non-Patentability)",
        "ta": "பிரிவு 3(p) காப்புரிமை பெறமுடியாமை (Section 3(p))",
        "te": "సెక్షన్ 3(p) పేటెంట్ అనర్హత (Section 3(p))",
    },
    "Biological Diversity Act 2002": {
        "hi": "जैविक विविधता अधिनियम 2002 (Biological Diversity Act 2002)",
        "ta": "பல்லுயிர் சட்டம் 2002 (Biological Diversity Act 2002)",
        "te": "జీవ వైవిధ్య చట్టం 2002 (Biological Diversity Act 2002)",
    },
}


def translate_legal_text_vernacular(
    text: str,
    target_language: str,
    hybrid_fallback: bool = True,
) -> str:
    """
    Translates complex English legal/patent claims into target_language while preserving
    statutory terms in English brackets for verifiability.
    """
    if target_language == "en" or target_language.startswith("en-"):
        return text

    lang_name = LANGUAGE_NAMES.get(target_language, target_language)

    prompt = (
        f"You are a specialized legal translator for Indian Patent Law (Patents Act 1970) and AYUSH Regulations. "
        f"Translate the following English document into {lang_name}.\n\n"
        f"STRICT RULES:\n"
        f"1. Preserve legal and technical terms by retaining the official English term in parentheses next to the vernacular term.\n"
        f"   Example: 'First Examination Report' -> 'प्रथम परीक्षा प्रतिवेदन (First Examination Report - FER)'.\n"
        f"2. Retain all section citations (e.g. Section 3(p), Section 6 NBA) exactly in English.\n"
        f"3. Preserve markdown formatting (headers, bullet points, numbered lists).\n"
        f"4. Return ONLY the translated document.\n\n"
        f"Document:\n{text}"
    )

    return complete(
        prompt,
        system_prompt=f"You are an expert {lang_name} legal patent translator.",
        max_tokens=2048,
        temperature=0.0,
    )


def convert_voice_input_to_technical_english(
    colloquial_audio_text: str,
    source_language: str,
) -> str:
    """
    Transforms informal/colloquial vernacular speech input (e.g. Hindi/Tamil speech-to-text output)
    into a structured, technical English patent invention abstract.
    """
    lang_name = LANGUAGE_NAMES.get(source_language, source_language)

    prompt = (
        f"The user dictated an innovation description in colloquial {lang_name}:\n"
        f"'{colloquial_audio_text}'\n\n"
        f"Transform this informal description into a structured, technical English patent abstract suitable for Form 2 filing under the Indian Patents Act 1970.\n"
        f"Include:\n"
        f"- Title of Invention\n"
        f"- Field of Invention\n"
        f"- Novel Botanical/Technical Components\n"
        f"- Industrial Applicability\n\n"
        f"Return valid Markdown only."
    )

    return complete(
        prompt,
        system_prompt="You are a professional patent drafting attorney in India.",
        max_tokens=1024,
        temperature=0.1,
    )
