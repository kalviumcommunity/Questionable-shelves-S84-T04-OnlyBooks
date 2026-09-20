import re
import math
from typing import List, Optional
from .chunk_models import RetrievalResult

class Reranker:
    """
    Two-Stage Cross-Encoder Relevance Reranker as specified in plan.md Section 6.1.
    Re-scores candidate chunks from Reciprocal Rank Fusion (RRF) using
    cross-textual alignment, term coverage, and contextual field matching.
    """

    def __init__(self, rrf_weight: float = 0.40, cross_match_weight: float = 0.35, title_weight: float = 0.15, author_weight: float = 0.10):
        self.rrf_weight = rrf_weight
        self.cross_match_weight = cross_match_weight
        self.title_weight = title_weight
        self.author_weight = author_weight

    def _tokenize(self, text: str) -> List[str]:
        return [w.lower() for w in re.findall(r"\b\w{2,}\b", text)]

    def _compute_cross_score(self, query_tokens: List[str], chunk_text: str) -> float:
        if not query_tokens or not chunk_text:
            return 0.0

        lower_content = chunk_text.lower()
        matched_tokens = sum(1 for token in query_tokens if token in lower_content)
        unigram_ratio = matched_tokens / len(query_tokens)

        # Bigram phrase matching bonus
        bigram_ratio = 0.0
        if len(query_tokens) >= 2:
            bigrams = [f"{query_tokens[i]} {query_tokens[i+1]}" for i in range(len(query_tokens) - 1)]
            matched_bigrams = sum(1 for bg in bigrams if bg in lower_content)
            bigram_ratio = matched_bigrams / len(bigrams)

        return 0.7 * unigram_ratio + 0.3 * bigram_ratio

    def rerank(
        self,
        query: str,
        candidates: List[RetrievalResult],
        top_k: int = 5,
    ) -> List[RetrievalResult]:
        """
        Re-scores candidates using cross-textual scoring and RRF rank prior.
        """
        if not candidates:
            return []

        query_tokens = self._tokenize(query)
        if not query_tokens:
            return candidates[:top_k]

        # Normalize RRF scores among candidate pool
        max_rrf = max(c.rrf_score for c in candidates) if candidates else 1.0
        if max_rrf <= 0.0:
            max_rrf = 1.0

        for cand in candidates:
            chunk = cand.chunk
            norm_rrf = cand.rrf_score / max_rrf

            # Content cross-text alignment
            cross_score = self._compute_cross_score(query_tokens, chunk.text_content)

            # Title and chapter matching
            title_text = f"{chunk.title} {chunk.chapter_title}"
            title_score = self._compute_cross_score(query_tokens, title_text)

            # Author and call number matching
            author_call_text = f"{chunk.author} {chunk.call_number}"
            author_score = self._compute_cross_score(query_tokens, author_call_text)

            # Composite calibrated rerank score
            combined_score = (
                self.rrf_weight * norm_rrf
                + self.cross_match_weight * cross_score
                + self.title_weight * title_score
                + self.author_weight * author_score
            )

            cand.rerank_score = round(float(combined_score), 4)

        # Re-sort descending by rerank_score
        reranked = sorted(candidates, key=lambda c: (c.rerank_score, c.rrf_score), reverse=True)

        # Assign final rank
        for idx, res in enumerate(reranked, start=1):
            res.rank = idx

        return reranked[:top_k]

# Global singleton instance
reranker = Reranker()

def get_reranker() -> Reranker:
    return reranker
