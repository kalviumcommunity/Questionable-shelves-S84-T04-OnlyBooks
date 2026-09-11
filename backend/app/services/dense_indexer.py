import re
import math
import hashlib
from typing import List, Tuple, Optional
import numpy as np
from .chunk_models import LibraryChunk

class DenseVectorIndexer:
    """
    In-memory dense semantic vector index with L2-normalized cosine similarity scoring.
    Generates deterministic subword/n-gram semantic feature vectors without requiring
    heavy torch/cuda binaries, allowing instant local indexing and rapid query execution.
    """

    def __init__(self, vector_dim: int = 256):
        self.vector_dim = vector_dim
        self.chunks: List[LibraryChunk] = []
        self.vectors: Optional[np.ndarray] = None

    def _text_to_vector(self, text: str) -> np.ndarray:
        """Convert arbitrary text to a normalized dense vector using feature hashing & subword n-grams."""
        clean_text = text.lower()
        words = re.findall(r"\b\w+\b", clean_text)
        vec = np.zeros(self.vector_dim, dtype=np.float32)

        if not words:
            return vec

        for word in words:
            # Word-level feature
            w_hash = int(hashlib.md5(word.encode("utf-8")).hexdigest()[:8], 16)
            idx = w_hash % self.vector_dim
            sign = 1.0 if (w_hash >> 1) & 1 else -1.0
            vec[idx] += 1.5 * sign

            # Character 3-gram and 4-gram features for morphological similarity
            if len(word) >= 3:
                for n in (3, 4):
                    for i in range(len(word) - n + 1):
                        ngram = word[i : i + n]
                        ng_hash = int(hashlib.md5(ngram.encode("utf-8")).hexdigest()[:8], 16)
                        ng_idx = ng_hash % self.vector_dim
                        ng_sign = 1.0 if (ng_hash >> 1) & 1 else -1.0
                        vec[ng_idx] += 0.5 * ng_sign

        # L2 normalization
        norm = np.linalg.norm(vec)
        if norm > 1e-9:
            vec = vec / norm
        return vec

    def index_chunks(self, chunks: List[LibraryChunk]) -> None:
        """Build or replace the dense index with the given chunks."""
        self.chunks = chunks
        if not chunks:
            self.vectors = None
            return

        vector_list = []
        for chunk in chunks:
            # Combine title, chapter title, and text content for holistic semantic vector
            combined_text = f"{chunk.title} {chunk.chapter_title} {chunk.text_content}"
            vector_list.append(self._text_to_vector(combined_text))

        self.vectors = np.vstack(vector_list)

    def search(
        self,
        query: str,
        top_k: int = 10,
        collection_filter: Optional[str] = None,
    ) -> List[Tuple[LibraryChunk, float]]:
        """
        Execute dense semantic search using cosine similarity.
        Returns list of (LibraryChunk, score) tuples sorted descending by similarity.
        """
        if self.vectors is None or len(self.chunks) == 0:
            return []

        q_vec = self._text_to_vector(query)
        # Cosine similarity since both matrix and query are L2 normalized
        similarities = np.dot(self.vectors, q_vec)

        candidates = []
        for i, chunk in enumerate(self.chunks):
            if collection_filter and collection_filter.lower() != "all":
                if chunk.collection_id.lower() != collection_filter.lower():
                    continue
            score = float(similarities[i])
            candidates.append((chunk, score))

        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[:top_k]
