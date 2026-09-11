import re
from typing import List, Tuple, Optional
from rank_bm25 import BM25Okapi
from .chunk_models import LibraryChunk

class BM25LexicalIndexer:
    """
    Sparse lexical indexer using BM25Okapi for keyword matching.
    Specialized in matching exact author names, call numbers, and specialized academic terms.
    """

    def __init__(self):
        self.chunks: List[LibraryChunk] = []
        self.bm25: Optional[BM25Okapi] = None

    def _tokenize(self, text: str) -> List[str]:
        """Normalize text and extract lowercase alphanumeric tokens."""
        return re.findall(r"\b[a-zA-Z0-9_\-]+\b", text.lower())

    def index_chunks(self, chunks: List[LibraryChunk]) -> None:
        """Build or replace the BM25 index over the provided library chunks."""
        self.chunks = chunks
        if not chunks:
            self.bm25 = None
            return

        corpus_tokens = []
        for chunk in chunks:
            # Include title, author, call_number, chapter, and text
            full_text = f"{chunk.title} {chunk.author} {chunk.call_number} {chunk.chapter_title} {chunk.text_content}"
            corpus_tokens.append(self._tokenize(full_text))

        self.bm25 = BM25Okapi(corpus_tokens)

    def search(
        self,
        query: str,
        top_k: int = 10,
        collection_filter: Optional[str] = None,
    ) -> List[Tuple[LibraryChunk, float]]:
        """
        Execute BM25 search for the given query string.
        Returns list of (LibraryChunk, bm25_score) tuples sorted descending.
        """
        if self.bm25 is None or len(self.chunks) == 0:
            return []

        tokens = self._tokenize(query)
        if not tokens:
            return []

        scores = self.bm25.get_scores(tokens)

        candidates = []
        for i, chunk in enumerate(self.chunks):
            if collection_filter and collection_filter.lower() != "all":
                if chunk.collection_id.lower() != collection_filter.lower():
                    continue
            score = float(scores[i])
            if score > 0.0:
                candidates.append((chunk, score))

        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[:top_k]
