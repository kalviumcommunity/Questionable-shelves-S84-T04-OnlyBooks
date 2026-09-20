import pytest
from app.services import (
    LibraryChunk,
    RetrievalResult,
    Reranker,
    HybridRetriever,
)

@pytest.fixture
def sample_candidates():
    c1 = LibraryChunk(
        chunk_id="chunk-1",
        document_id="doc-1",
        title="Epistemology and Paradigms",
        author="Thomas Kuhn",
        year="2024",
        collection_id="press",
        call_number="Q175.K84",
        page_number=45,
        chapter_num="Chapter I",
        chapter_title="Anomalies and Paradigm Shifts",
        text_content="Scientific revolutions take place when anomalies force practitioners to abandon established paradigms.",
    )
    c2 = LibraryChunk(
        chunk_id="chunk-2",
        document_id="doc-2",
        title="Cognitive Neuroscience of Bilingualism",
        author="Arturo Hernandez",
        year="2024",
        collection_id="theses",
        call_number="THES-2024-COG-092",
        page_number=112,
        chapter_num="Chapter II",
        chapter_title="Neural Plasticity in Adults",
        text_content="Diffusion tensor imaging shows adult neural rewiring in sensorimotor language circuits.",
    )
    c3 = LibraryChunk(
        chunk_id="chunk-3",
        document_id="doc-3",
        title="Constitutional Law Foundations",
        author="Martin Loughlin",
        year="2024",
        collection_id="papers",
        call_number="K3165.L68",
        page_number=80,
        chapter_num="Part I",
        chapter_title="Constituent Power",
        text_content="Constitutional validity derives from sovereign constituent power rather than internal norms.",
    )

    return [
        RetrievalResult(chunk=c1, dense_score=0.75, bm25_score=4.2, rrf_score=0.030, rank=1),
        RetrievalResult(chunk=c2, dense_score=0.72, bm25_score=3.8, rrf_score=0.028, rank=2),
        RetrievalResult(chunk=c3, dense_score=0.60, bm25_score=2.1, rrf_score=0.020, rank=3),
    ]

def test_reranker_relevance_scoring(sample_candidates):
    reranker = Reranker()
    # Query clearly targeting the neuroplasticity topic (chunk-2)
    reranked = reranker.rerank("adult neural rewiring diffusion tensor imaging", sample_candidates, top_k=2)

    assert len(reranked) == 2
    # chunk-2 should be promoted to rank 1 due to high cross-matching
    top_hit = reranked[0]
    assert top_hit.chunk.chunk_id == "chunk-2"
    assert top_hit.rank == 1
    assert top_hit.rerank_score > 0.0

def test_reranker_empty_input():
    reranker = Reranker()
    assert reranker.rerank("quantum query", [], top_k=5) == []

def test_hybrid_retriever_two_stage_pipeline():
    c1 = LibraryChunk(
        chunk_id="bio-1",
        document_id="doc-bio",
        title="Quantum Coherence in Photosynthesis",
        author="Engel, G. S.",
        year="2024",
        collection_id="theses",
        call_number="THES-2024-BIO-001",
        page_number=12,
        chapter_num="Chapter I",
        chapter_title="Fenna-Matthews-Olson Complex",
        text_content="Excitonic energy transfer exhibits long-lived quantum coherence at physiological temperatures.",
    )
    c2 = LibraryChunk(
        chunk_id="law-1",
        document_id="doc-law",
        title="Comparative Constitutionalism",
        author="Tushnet, M.",
        year="2024",
        collection_id="papers",
        call_number="K3165.T87",
        page_number=33,
        chapter_num="Chapter II",
        chapter_title="Weak-Form Judicial Review",
        text_content="Weak-form systems allow legislatures to revisit judicial interpretations of rights.",
    )

    retriever = HybridRetriever(rrf_k=60)
    retriever.index_chunks([c1, c2])

    # Query targeting quantum coherence
    results = retriever.retrieve("Fenna-Matthews-Olson excitonic energy coherence", top_k=1, apply_reranking=True)
    assert len(results) == 1
    assert results[0].chunk.chunk_id == "bio-1"
    assert results[0].rerank_score > 0.0
    assert results[0].rank == 1
