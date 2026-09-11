from typing import List, Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from .chunk_models import LibraryChunk, RetrievalResult
from .dense_indexer import DenseVectorIndexer
from .bm25_indexer import BM25LexicalIndexer
from ..models.document import Document
from ..models.document_section import DocumentSection

class HybridRetriever:
    """
    Hybrid retrieval orchestrator combining dense semantic search (DenseVectorIndexer)
    and sparse lexical search (BM25LexicalIndexer) via Reciprocal Rank Fusion (RRF).
    """

    def __init__(self, rrf_k: int = 60):
        self.rrf_k = rrf_k
        self.dense_indexer = DenseVectorIndexer()
        self.bm25_indexer = BM25LexicalIndexer()
        self._is_indexed = False

    @property
    def is_indexed(self) -> bool:
        return self._is_indexed

    def index_chunks(self, chunks: List[LibraryChunk]) -> None:
        """Index chunks simultaneously into dense vector and BM25 indices."""
        self.dense_indexer.index_chunks(chunks)
        self.bm25_indexer.index_chunks(chunks)
        self._is_indexed = True

    async def index_from_database(self, session: AsyncSession) -> int:
        """Fetch all documents and document sections from SQL database and index them."""
        query = select(Document).options(selectinload(Document.sections))
        result = await session.execute(query)
        documents = result.scalars().all()

        chunks: List[LibraryChunk] = []
        for doc in documents:
            if doc.sections:
                for sec in doc.sections:
                    chunk = LibraryChunk(
                        chunk_id=f"{doc.id}_{sec.id}",
                        document_id=doc.id,
                        title=doc.title,
                        author=doc.author,
                        year=doc.year,
                        collection_id=doc.collection_id,
                        call_number=doc.call_number,
                        page_number=sec.start_page,
                        chapter_num=sec.chapter_num,
                        chapter_title=sec.chapter_title,
                        text_content=sec.content_text or f"{doc.title} - {sec.chapter_title}",
                    )
                    chunks.append(chunk)
            else:
                # Fallback if document has no section records
                chunk = LibraryChunk(
                    chunk_id=f"{doc.id}_main",
                    document_id=doc.id,
                    title=doc.title,
                    author=doc.author,
                    year=doc.year,
                    collection_id=doc.collection_id,
                    call_number=doc.call_number,
                    page_number=1,
                    chapter_num="Overview",
                    chapter_title=doc.title,
                    text_content=f"{doc.title} by {doc.author}. Field: {doc.field}. Call Number: {doc.call_number}",
                )
                chunks.append(chunk)

        self.index_chunks(chunks)
        return len(chunks)

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        collection_filter: Optional[str] = None,
        candidate_pool: int = 25,
    ) -> List[RetrievalResult]:
        """
        Execute hybrid search and merge candidate ranks using Reciprocal Rank Fusion (RRF).
        RRF(d) = 1 / (k + rank_dense) + 1 / (k + rank_bm25)
        """
        if not self._is_indexed:
            return []

        # 1. Dense candidates
        dense_hits = self.dense_indexer.search(
            query,
            top_k=candidate_pool,
            collection_filter=collection_filter,
        )

        # 2. BM25 candidates
        bm25_hits = self.bm25_indexer.search(
            query,
            top_k=candidate_pool,
            collection_filter=collection_filter,
        )

        # 3. Fuse via Reciprocal Rank Fusion
        dense_ranks: Dict[str, int] = {chunk.chunk_id: idx + 1 for idx, (chunk, _) in enumerate(dense_hits)}
        dense_scores: Dict[str, float] = {chunk.chunk_id: score for chunk, score in dense_hits}

        bm25_ranks: Dict[str, int] = {chunk.chunk_id: idx + 1 for idx, (chunk, _) in enumerate(bm25_hits)}
        bm25_scores: Dict[str, float] = {chunk.chunk_id: score for chunk, score in bm25_hits}

        # Collect all unique chunks
        chunk_map: Dict[str, LibraryChunk] = {}
        for chunk, _ in dense_hits:
            chunk_map[chunk.chunk_id] = chunk
        for chunk, _ in bm25_hits:
            chunk_map[chunk.chunk_id] = chunk

        fused_results: List[RetrievalResult] = []
        for chunk_id, chunk in chunk_map.items():
            r_dense = dense_ranks.get(chunk_id, candidate_pool + 1)
            r_bm25 = bm25_ranks.get(chunk_id, candidate_pool + 1)

            rrf_score = (1.0 / (self.rrf_k + r_dense)) + (1.0 / (self.rrf_k + r_bm25))

            fused_results.append(
                RetrievalResult(
                    chunk=chunk,
                    dense_score=dense_scores.get(chunk_id, 0.0),
                    bm25_score=bm25_scores.get(chunk_id, 0.0),
                    rrf_score=rrf_score,
                )
            )

        # Sort by RRF score descending
        fused_results.sort(key=lambda x: x.rrf_score, reverse=True)

        # Assign final rank
        for rank, res in enumerate(fused_results, start=1):
            res.rank = rank

        return fused_results[:top_k]

# Global singleton instance
hybrid_retriever = HybridRetriever()

def get_hybrid_retriever() -> HybridRetriever:
    return hybrid_retriever
