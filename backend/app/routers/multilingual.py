"""
routers/multilingual.py — API endpoints for Multilingual Translation & Voice Input Transformation
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services.vernacular_translator import convert_voice_input_to_technical_english, translate_legal_text_vernacular

logger = logging.getLogger(__name__)
router = APIRouter()


class TranslateDocRequest(BaseModel):
    document_text: str = Field(..., description="English legal or document text to translate")
    target_language: str = Field(..., description="BCP-47 target language code (e.g. 'hi', 'ta', 'te')")


class TranslateDocResponse(BaseModel):
    target_language: str
    translated_document_text: str


class VoiceToAbstractRequest(BaseModel):
    colloquial_speech_text: str = Field(..., description="Raw STT output from native voice dictation")
    source_language: str = Field("hi", description="BCP-47 source language code")


class VoiceToAbstractResponse(BaseModel):
    source_language: str
    technical_patent_abstract_en: str


@router.post("/language/translate-doc", response_model=TranslateDocResponse, summary="Bi-lingual legal document translation")
async def translate_legal_document(request: TranslateDocRequest) -> TranslateDocResponse:
    """
    Translates an English legal document (NDA, Brief, Patent Claim) into a target vernacular language
    preserving statutory terminology in brackets.
    """
    translated = translate_legal_text_vernacular(
        text=request.document_text,
        target_language=request.target_language,
        hybrid_fallback=True,
    )
    return TranslateDocResponse(
        target_language=request.target_language,
        translated_document_text=translated,
    )


@router.post("/language/voice-to-patent-abstract", response_model=VoiceToAbstractResponse, summary="Convert vernacular STT to patent abstract")
async def transform_voice_to_abstract(request: VoiceToAbstractRequest) -> VoiceToAbstractResponse:
    """
    Converts raw vernacular voice dictation into a structured technical English patent abstract.
    """
    abstract_en = convert_voice_input_to_technical_english(
        colloquial_audio_text=request.colloquial_speech_text,
        source_language=request.source_language,
    )
    return VoiceToAbstractResponse(
        source_language=request.source_language,
        technical_patent_abstract_en=abstract_en,
    )
