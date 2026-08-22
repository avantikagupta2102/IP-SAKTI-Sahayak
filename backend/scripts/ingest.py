#!/usr/bin/env python3
"""
scripts/ingest.py — Offline knowledge-base ingestion script.

Usage:
    cd backend
    python scripts/ingest.py [--pdf-dir data/pdfs] [--chunk-size 600] [--overlap 90]

What it does:
    1. Reads all PDFs from data/pdfs/
    2. Extracts text (PyMuPDF + OCR fallback)
    3. Chunks text (500-800 tokens, 15% overlap)
    4. Embeds chunks with sentence-transformers
    5. Upserts into Chroma
    6. Seeds Source records in SQLite
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import logging
import os
import re
import sys
import uuid
from pathlib import Path
from typing import Any, Dict, List, Tuple

# Ensure the backend root is on sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal, init_db
from app.models.db import Source
from app.services.document_intel import extract_text_from_pdf
from app.services.vector_store import add_documents

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("ingest")
settings = get_settings()

# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

def chunk_text(
    text: str,
    chunk_size: int = 600,
    overlap: int = 90,
) -> List[str]:
    """
    Split text into overlapping chunks of approximately `chunk_size` words.

    Args:
        text:       Raw extracted text.
        chunk_size: Target chunk size in words (~500–800 tokens for English).
        overlap:    Overlap between consecutive chunks in words (~15%).

    Returns:
        List of text chunks.
    """
    # Normalise whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)

    words = text.split()
    if not words:
        return []

    chunks: List[str] = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        if end == len(words):
            break
        start += chunk_size - overlap  # slide forward with overlap

    return chunks


# ---------------------------------------------------------------------------
# Metadata extraction from filename
# ---------------------------------------------------------------------------

def metadata_from_filename(filepath: Path) -> Dict[str, Any]:
    """
    Extract basic metadata from the PDF filename.

    Expected naming convention (all optional fields):
        <authority>_<topic>_<doctype>_<year>.pdf
    Examples:
        ipindia_patent_guideline_2023.pdf
        ayush_startup_circular_2022.pdf
        wipo_pct_guide_2021.pdf

    Falls back to sensible defaults for unparsed names.
    """
    stem = filepath.stem.lower()
    parts = stem.split("_")

    authority_map = {
        "ipindia": "IP India",
        "ip": "IP India",
        "ayush": "Ministry of AYUSH",
        "wipo": "WIPO",
        "tkdl": "TKDL",
        "ministry": "Ministry of AYUSH",
    }
    doc_type_map = {
        "guideline": "guideline",
        "guide": "guideline",
        "circular": "circular",
        "faq": "faq",
        "form": "form",
        "notice": "notice",
        "certificate": "certificate",
    }

    authority = next(
        (authority_map[p] for p in parts if p in authority_map), "Official Source"
    )
    doc_type = next(
        (doc_type_map[p] for p in parts if p in doc_type_map), "guideline"
    )
    year = next((p for p in parts if re.match(r"^20\d{2}$", p)), None)

    title_words = [p.capitalize() for p in parts if p not in authority_map and p not in doc_type_map and not re.match(r"^20\d{2}$", p)]
    title = " ".join(title_words) if title_words else filepath.stem

    return {
        "authority": authority,
        "document_type": doc_type,
        "publication_date": year,
        "document_title": title,
        "filename": filepath.name,
        "topic": " ".join(title_words[:2]).lower() if title_words else "general",
        "language": "en",
        "source_url": "",  # Fill manually or via a sidecar JSON
    }


# ---------------------------------------------------------------------------
# Sidecar metadata support
# ---------------------------------------------------------------------------

def load_sidecar(filepath: Path) -> Dict[str, Any]:
    """
    Load a JSON sidecar file for a PDF if it exists.

    Sidecar must be named identically to the PDF with a .json extension.
    Example: ipindia_patent_guideline_2023.json

    Sidecar keys (all optional):
        title, url, authority, document_type, topic, publication_date, language
    """
    sidecar = filepath.with_suffix(".json")
    if not sidecar.exists():
        return {}
    import json
    try:
        with open(sidecar, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"Could not load sidecar {sidecar}: {e}")
        return {}


# ---------------------------------------------------------------------------
# Main ingestion loop
# ---------------------------------------------------------------------------

async def ingest(
    pdf_dir: Path,
    chunk_size: int = 600,
    overlap: int = 90,
    force: bool = False,
) -> None:
    """Run the full ingestion pipeline."""
    await init_db()

    pdf_files = sorted(pdf_dir.glob("*.pdf"))
    if not pdf_files:
        logger.warning(f"No PDFs found in {pdf_dir}. Add PDFs and re-run.")
        return

    logger.info(f"Found {len(pdf_files)} PDFs in {pdf_dir}")

    async with AsyncSessionLocal() as db:
        total_chunks = 0

        for pdf_path in pdf_files:
            logger.info(f"\n📄 Processing: {pdf_path.name}")

            # --- Load metadata ---
            file_meta = metadata_from_filename(pdf_path)
            sidecar = load_sidecar(pdf_path)
            merged_meta = {**file_meta, **sidecar}  # sidecar overrides filename heuristics

            # --- Extract text ---
            try:
                with open(pdf_path, "rb") as f:
                    file_bytes = f.read()
                text, page_count = extract_text_from_pdf(file_bytes)
            except Exception as e:
                logger.error(f"  ❌ Extraction failed: {e}")
                continue

            if not text.strip():
                logger.warning(f"  ⚠️  No text extracted from {pdf_path.name} — skipping.")
                continue

            logger.info(f"  ✅ Extracted {len(text):,} chars from {page_count} pages.")

            # --- Seed Source record ---
            source_id = hashlib.sha256(pdf_path.name.encode()).hexdigest()[:16]
            existing = await db.get(Source, source_id)
            if existing and not force:
                logger.info(f"  ℹ️  Source already in DB — skipping (use --force to re-ingest).")
            else:
                source = Source(
                    id=source_id,
                    title=merged_meta.get("document_title") or merged_meta.get("title", pdf_path.stem),
                    url=merged_meta.get("source_url") or merged_meta.get("url", ""),
                    authority=merged_meta.get("authority", "Official Source"),
                    document_type=merged_meta.get("document_type", "guideline"),
                    topic=merged_meta.get("topic", "general"),
                    language=merged_meta.get("language", "en"),
                    publication_date=merged_meta.get("publication_date"),
                )
                await db.merge(source)

            # --- Chunk ---
            chunks = chunk_text(text, chunk_size=chunk_size, overlap=overlap)
            logger.info(f"  📦 {len(chunks)} chunks (size={chunk_size}, overlap={overlap})")

            # --- Embed + upsert into Chroma ---
            chunk_ids = [f"{source_id}_{i}" for i in range(len(chunks))]
            chunk_meta: List[Dict[str, Any]] = [
                {
                    "source_id": source_id,
                    "source_url": merged_meta.get("source_url") or merged_meta.get("url", ""),
                    "document_title": merged_meta.get("document_title") or merged_meta.get("title", pdf_path.stem),
                    "document_type": merged_meta.get("document_type", "guideline"),
                    "authority": merged_meta.get("authority", "Official Source"),
                    "publication_date": merged_meta.get("publication_date", ""),
                    "topic": merged_meta.get("topic", "general"),
                    "language": merged_meta.get("language", "en"),
                    "chunk_index": i,
                }
                for i in range(len(chunks))
            ]

            add_documents(ids=chunk_ids, texts=chunks, metadatas=chunk_meta)
            total_chunks += len(chunks)
            logger.info(f"  ✅ Upserted {len(chunks)} chunks for {pdf_path.name}")

        await db.commit()

    logger.info(f"\n🎉 Ingestion complete. Total chunks upserted: {total_chunks}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="IP-SAKTI Sahayak — KB ingestion script")
    parser.add_argument(
        "--pdf-dir",
        type=Path,
        default=Path("data/pdfs"),
        help="Directory containing PDFs to ingest (default: data/pdfs)",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=600,
        help="Target chunk size in words (default: 600 ≈ 750 tokens)",
    )
    parser.add_argument(
        "--overlap",
        type=int,
        default=90,
        help="Overlap between chunks in words (default: 90 ≈ 15%%)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-ingest even if the source is already in the DB",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    if not args.pdf_dir.exists():
        logger.error(f"PDF directory not found: {args.pdf_dir}")
        sys.exit(1)
    asyncio.run(
        ingest(
            pdf_dir=args.pdf_dir,
            chunk_size=args.chunk_size,
            overlap=args.overlap,
            force=args.force,
        )
    )
