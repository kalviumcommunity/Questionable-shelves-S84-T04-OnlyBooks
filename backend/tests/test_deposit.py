import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services import hybrid_retriever
from app.database import Base
from app.seeds.catalog_seed import seed_initial_catalog
from conftest import test_engine, TestSessionLocal

@pytest.fixture(autouse=True)
def setup_deposit_db():
    async def _reset():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        async with TestSessionLocal() as session:
            await seed_initial_catalog(session)
            await hybrid_retriever.index_from_database(session)

    asyncio.run(_reset())
    yield

@pytest.mark.asyncio
async def test_deposit_manuscript_endpoint():
    """Test depositing a new academic manuscript with multiple chapters and auto-parsing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "title": "Quantum Coherence in Photosynthetic Reaction Complexes",
            "author": "Dr. Elena Rostova & Dr. Kai Chen",
            "year": "2026",
            "field": "Biophysics & Quantum Biology",
            "collection_id": "papers",
            "content_text": (
                "Chapter 1: Quantum Transport Across Chromophore Arrays\n"
                "Femtosecond electronic spectroscopy demonstrates long-lived quantum coherence in Fenna-Matthews-Olson complexes.\n"
                "Energy transfer occurs via wavelike excitonic delocalization rather than classical incoherent hopping.\n\n"
                "Chapter 2: Environmental Decoherence Suppression Mechanisms\n"
                "Protein scaffolds shield delicate superposition states from thermal fluctuations. "
                "Molecular dynamics simulations verify that structured vibronic coupling preserves coherence at physiological temperatures."
            ),
        }

        resp = await ac.post("/api/catalog/deposit", json=payload)
        assert resp.status_code == 201
        data = resp.json()

        assert data["title"] == payload["title"]
        assert data["author"] == payload["author"]
        assert data["collection_id"] == "papers"
        assert data["indexed"] is True
        assert data["sections_count"] == 2
        assert "FAC-2026-" in data["call_number"]
        doc_id = data["document_id"]

        # Verify document appears in catalog detail endpoint
        doc_resp = await ac.get(f"/api/catalog/documents/{doc_id}")
        assert doc_resp.status_code == 200
        doc_data = doc_resp.json()
        assert len(doc_data["sections"]) == 2
        assert doc_data["sections"][0]["chapter_num"] == "1"
        assert "Quantum Transport" in doc_data["sections"][0]["chapter_title"]

@pytest.mark.asyncio
async def test_deposit_call_number_collision_handling():
    """Ensure that depositing two manuscripts with the same call number generates a unique identifier."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        p1 = {
            "title": "Constitutional Adjudication in Transition",
            "author": "Judge Andrea Vance",
            "year": "2026",
            "field": "Constitutional Law",
            "collection_id": "theses",
            "call_number": "LAW-THES-2026-COLLISION",
            "content_text": "Chapter I: The Juridical Core\nProportionality doctrine serves as an organizing principle in contemporary post-conflict constitutional design.",
        }
        r1 = await ac.post("/api/catalog/deposit", json=p1)
        assert r1.status_code == 201
        assert r1.json()["call_number"] == "LAW-THES-2026-COLLISION"

        # Deposit second with same call number
        p2 = {
            "title": "Judicial Independence Under Emergency Regimes",
            "author": "Markus Brody",
            "year": "2026",
            "field": "Constitutional Law",
            "collection_id": "theses",
            "call_number": "LAW-THES-2026-COLLISION",
            "content_text": "Chapter I: Structural Separation\nEmergency powers require antecedent statutory limits to avoid permanent doctrinal erosion.",
        }
        r2 = await ac.post("/api/catalog/deposit", json=p2)
        assert r2.status_code == 201
        assert r2.json()["call_number"] != r1.json()["call_number"]
        assert "LAW-THES-2026-COLLISION-" in r2.json()["call_number"]

@pytest.mark.asyncio
async def test_immediate_hybrid_retrieval_of_deposited_document():
    """Verify that newly deposited manuscripts are immediately returned in hybrid retrieval."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "title": "Cryogenic Electron Microscopy of Ribosomal Subunits",
            "author": "Dr. Sarah Lin",
            "year": "2026",
            "field": "Structural Biology",
            "collection_id": "theses",
            "content_text": (
                "Chapter 1: Single-Particle Reconstruction Algorithms\n"
                "Direct electron detectors coupled with contrast transfer function estimation yield sub-2.0 ångström resolution maps. "
                "Rotational alignment converges within forty-eight iterative expectation maximization cycles."
            ),
        }
        resp = await ac.post("/api/catalog/deposit", json=payload)
        assert resp.status_code == 201
        doc_id = resp.json()["document_id"]

        # Search immediately via hybrid retriever
        results = hybrid_retriever.retrieve(
            query="electron microscopy single-particle ångström resolution",
            top_k=3,
        )
        assert len(results) > 0
        top_doc_ids = [r.chunk.document_id for r in results]
        assert doc_id in top_doc_ids

@pytest.mark.asyncio
async def test_end_to_end_synthesis_citing_new_deposit():
    """Verify that inquiry synthesis produces grounded footnotes citing the newly deposited document."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Deposit specific thesis
        payload = {
            "title": "Topological Superconductivity in Majorana Zero Modes",
            "author": "Dr. Alexander Thorne",
            "year": "2026",
            "field": "Condensed Matter Physics",
            "collection_id": "theses",
            "content_text": (
                "Chapter 1: Non-Abelian Anyons in Hybrid Nanowires\n"
                "Proximity-induced superconductivity in indium antimonide nanowires yields zero-bias conductance peaks indicative of Majorana bound states. "
                "Braiding operations on these non-Abelian statistics provide fault-tolerant quantum computation gates."
            ),
        }
        dep_resp = await ac.post("/api/catalog/deposit", json=payload)
        assert dep_resp.status_code == 201
        deposited_doc_id = dep_resp.json()["document_id"]

        # Synthesize inquiry matching this topic
        synth_payload = {
            "question": "How do Majorana zero modes in hybrid nanowires enable fault-tolerant quantum gates?",
            "collection_filter": "theses",
            "top_k": 3,
        }
        synth_resp = await ac.post("/api/inquiries/synthesize", json=synth_payload)
        assert synth_resp.status_code == 200
        synth_data = synth_resp.json()

        assert len(synth_data["paragraphs"]) > 0
        assert len(synth_data["citations"]) > 0

        # Verify deposited document was cited
        cited_doc_ids = [c["document_id"] for c in synth_data["citations"]]
        assert deposited_doc_id in cited_doc_ids
