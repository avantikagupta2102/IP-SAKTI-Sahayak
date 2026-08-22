"""
services/vector_store.py — High performance local vector store using FAISS & numpy.

Features:
  - FAISS cosine similarity index
  - Local persistent storage (saved to json/pickle in persist dir)
  - Full metadata filtering and score normalization
"""
from __future__ import annotations

import json
import logging
import os
from dataclasses import asdict, dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

from app.core.config import get_settings
from app.services.embeddings import embed_text, embed_texts

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class RetrievedChunk:
    """A chunk returned from similarity search."""

    chunk_id: str
    text: str
    score: float  # cosine similarity (0–1, higher = more similar)
    metadata: Dict[str, Any]

    @property
    def source_id(self) -> Optional[str]:
        return self.metadata.get("source_id")

    @property
    def source_title(self) -> Optional[str]:
        return self.metadata.get("document_title")

    @property
    def source_url(self) -> Optional[str]:
        return self.metadata.get("source_url")

    @property
    def authority(self) -> Optional[str]:
        return self.metadata.get("authority")

    @property
    def is_primary_source(self) -> bool:
        """True if the source is a primary government source (not FAQ/secondary)."""
        return self.metadata.get("document_type", "").lower() not in {"faq", "secondary", "blog"}


class LocalFAISSVectorStore:
    def __init__(self, persist_dir: str):
        self.persist_dir = Path(persist_dir)
        self.persist_dir.mkdir(parents=True, exist_ok=True)
        self.index_file = self.persist_dir / "faiss.index"
        self.meta_file = self.persist_dir / "documents.json"

        self.ids: List[str] = []
        self.documents: List[str] = []
        self.metadatas: List[Dict[str, Any]] = []
        self.index = None

        self._load()

    def _load(self):
        try:
            import faiss

            if self.meta_file.exists():
                with open(self.meta_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.ids = data.get("ids", [])
                    self.documents = data.get("documents", [])
                    self.metadatas = data.get("metadatas", [])

            if self.index_file.exists() and len(self.ids) > 0:
                self.index = faiss.read_index(str(self.index_file))
                logger.info(f"Loaded FAISS index with {len(self.ids)} documents.")
        except Exception as e:
            logger.warning(f"Could not load existing index ({e}), starting fresh.")
            self.ids, self.documents, self.metadatas = [], [], []
            self.index = None

    def _save(self):
        try:
            import faiss

            with open(self.meta_file, "w", encoding="utf-8") as f:
                json.dump(
                    {"ids": self.ids, "documents": self.documents, "metadatas": self.metadatas},
                    f,
                    ensure_ascii=False,
                    indent=2,
                )
            if self.index is not None:
                faiss.write_index(self.index, str(self.index_file))
        except Exception as e:
            logger.error(f"Failed to persist FAISS index: {e}")

    def add_documents(
        self,
        ids: List[str],
        texts: List[str],
        metadatas: List[Dict[str, Any]],
    ) -> None:
        if not ids:
            return
        import faiss

        embeddings = np.array(embed_texts(texts), dtype=np.float32)
        # Normalize vectors for cosine similarity (Inner Product on normalized vectors)
        faiss.normalize_L2(embeddings)

        dim = embeddings.shape[1]
        if self.index is None:
            self.index = faiss.IndexFlatIP(dim)

        self.index.add(embeddings)
        self.ids.extend(ids)
        self.documents.extend(texts)
        self.metadatas.extend(metadatas)

        self._save()
        logger.info(f"Added {len(ids)} documents to FAISS vector store. Total: {len(self.ids)}")

    def similarity_search(
        self,
        query: str,
        top_k: int = 6,
        where: Optional[Dict[str, Any]] = None,
    ) -> List[RetrievedChunk]:
        if self.index is None or len(self.ids) == 0:
            return []

        import faiss

        query_vec = np.array([embed_text(query)], dtype=np.float32)
        faiss.normalize_L2(query_vec)

        k = min(top_k, len(self.ids))
        distances, indices = self.index.search(query_vec, k)

        chunks: List[RetrievedChunk] = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < 0 or idx >= len(self.ids):
                continue
            meta = self.metadatas[idx] if idx < len(self.metadatas) else {}
            # Metadata filter check
            if where:
                match = all(meta.get(k) == v for k, v in where.items())
                if not match:
                    continue

            # In Inner Product on normalized vectors, score is in [-1, 1], normalize to [0, 1]
            score = float(max(0.0, min(1.0, (dist + 1.0) / 2.0)))
            chunks.append(
                RetrievedChunk(
                    chunk_id=self.ids[idx],
                    text=self.documents[idx],
                    score=score,
                    metadata=meta,
                )
            )

        return chunks

    def count(self) -> int:
        return len(self.ids)


_store: Optional[LocalFAISSVectorStore] = None


def _get_store() -> LocalFAISSVectorStore:
    global _store
    if _store is None:
        _store = LocalFAISSVectorStore(settings.chroma_persist_dir)
    return _store


def add_documents(
    ids: List[str],
    texts: List[str],
    metadatas: List[Dict[str, Any]],
) -> None:
    _get_store().add_documents(ids, texts, metadatas)


def similarity_search(
    query: str,
    top_k: Optional[int] = None,
    where: Optional[Dict[str, Any]] = None,
) -> List[RetrievedChunk]:
    k = top_k or settings.retrieval_top_k
    return _get_store().similarity_search(query, top_k=k, where=where)


def collection_count() -> int:
    return _get_store().count()
