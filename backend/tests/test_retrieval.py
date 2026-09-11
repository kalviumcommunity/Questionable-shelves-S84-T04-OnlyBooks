import asyncio
import pytest
from app.services import (
    LibraryChunk,
    DenseVectorIndexer,
    BM25LexicalIndexer,
    HybridRetriever,
)
from app.database import Base
from app.seeds.catalog_seed import seed_initial_catalog
from conftest import test_engine, TestSessionLocal

@pytest.fixture
def sample_chunks():
    return [
        LibraryChunk(
            chunk_id="chunk-1",
            document_id="doc-1",
            title="The Epistemology of Scientific Consensus",
            author="Kuhn, T. S. & Feyerabend, P.",
            year="2024",
            collection_id="press",
            call_number="Q175.K84",
            page_number=45,
            chapter_num="Chapter I",
            chapter_title="The Social Structure of Anomalies",
            text_content="Scientific communities operate through shared paradigm commitments until anomalies destabilize institutional certainty.",
        ),
        LibraryChunk(
            chunk_id="chunk-2",
            document_id="doc-2",
            title="Adult Neuroplasticity and Second-Language Acquisition",
            author="Hernandez, A. E. & Ullman, M.",
            year="2024",
            collection_id="theses",
            call_number="THES-2024-COG-092",
            page_number=112,
            chapter_num="Chapter II",
            chapter_title="Dynamic Neural Rewiring in Late Bilinguals",
            text_content="Diffusion tensor imaging provides unequivocal evidence of white-matter tract plasticity in adult participants.",
        ),
        LibraryChunk(
            chunk_id="chunk-3",
            document_id="doc-3",
            title="Constituent Power and Constitutional Design",
            author="Loughlin, M. & Walker, N.",
            year="2024",
            collection_id="papers",
            call_number="K3165.L68",
            page_number=85,
            chapter_num="Part I",
            chapter_title="The Paradox of Constituent Authority",
            text_content="A constitution cannot derive its legal validity solely from the normative order it creates.",
        ),
    ]

def test_dense_vector_indexer(sample_chunks):
    indexer = DenseVectorIndexer()
    indexer.index_chunks(sample_chunks)

    # Conceptual inquiry on brain plasticity
    results = indexer.search("white-matter tract neuroplasticity in adult brains", top_k=2)
    assert len(results) > 0
    top_chunk, score = results[0]
    assert top_chunk.chunk_id == "chunk-2"
    assert "Hernandez" in top_chunk.author
    assert score > 0.1

def test_bm25_lexical_indexer(sample_chunks):
    indexer = BM25LexicalIndexer()
    indexer.index_chunks(sample_chunks)

    # Exact author surname search
    kuhn_hits = indexer.search("Kuhn", top_k=1)
    assert len(kuhn_hits) == 1
    assert kuhn_hits[0][0].chunk_id == "chunk-1"

    # Exact call number search
    call_hits = indexer.search("THES-2024-COG-092", top_k=1)
    assert len(call_hits) == 1
    assert call_hits[0][0].chunk_id == "chunk-2"

def test_hybrid_retrieval_rrf(sample_chunks):
    retriever = HybridRetriever(rrf_k=60)
    retriever.index_chunks(sample_chunks)

    # Query combining semantic concept and specific keyword
    results = retriever.retrieve("Kuhn institutional anomalies paradigm commitments", top_k=3)
    assert len(results) >= 1
    top_result = results[0]
    assert top_result.chunk.chunk_id == "chunk-1"
    assert top_result.rank == 1
    assert top_result.rrf_score > 0.0

    # Collection filter: 'theses' should only return doc-2
    filtered = retriever.retrieve("scientific knowledge and research", top_k=3, collection_filter="theses")
    assert all(r.chunk.collection_id == "theses" for r in filtered)

@pytest.mark.asyncio
async def test_database_indexing_and_retrieval():
    # 1. Reset test database and seed documents
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        await seed_initial_catalog(session)

        # 2. Ingest catalog into fresh hybrid retriever
        retriever = HybridRetriever(rrf_k=60)
        indexed_count = await retriever.index_from_database(session)
        assert indexed_count >= 15  # 6 docs with 3 sections each = 18 sections

        # 3. Query on Quantum Biophysics
        bio_hits = retriever.retrieve("Fenna-Matthews-Olson quantum coherence in biological systems", top_k=2)
        assert len(bio_hits) > 0
        assert "Quantum Coherence" in bio_hits[0].chunk.title
        assert bio_hits[0].chunk.collection_id == "theses"

        # 4. Query on Climate Feedback
        climate_hits = retriever.retrieve("cryosphere albedo collapse and planetary boundaries", top_k=2)
        assert len(climate_hits) > 0
        assert "Climate Feedback" in climate_hits[0].chunk.title
        assert climate_hits[0].chunk.collection_id == "reserves"
