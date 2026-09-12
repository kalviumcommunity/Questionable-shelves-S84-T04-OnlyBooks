import io
import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services import hybrid_retriever
from app.database import Base
from app.seeds.catalog_seed import seed_initial_catalog
from conftest import test_engine, TestSessionLocal

@pytest.fixture(autouse=True)
def setup_upload_db():
    async def _reset():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        async with TestSessionLocal() as session:
            await seed_initial_catalog(session)
            await hybrid_retriever.index_from_database(session)

    asyncio.run(_reset())
    yield

SAMPLE_MINIMAL_PDF_BYTES = (
    b"%PDF-1.4\n"
    b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
    b"4 0 obj\n<< /Length 85 >>\nstream\nBT\n/F1 12 Tf\n72 712 Td\n(Chapter 1: Neural Dynamics in Cortical Slices) Tj\nET\nendstream\nendobj\n"
    b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
    b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000378 00000 n \n"
    b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n455\n%%EOF"
)

@pytest.mark.asyncio
async def test_upload_text_file_manuscript():
    """Verify uploading a text/markdown manuscript file parses chapters and indexes chunks."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        file_content = (
            "Chapter 1: Stochastic Gravitational Wave Backgrounds\n"
            "Pulsar timing arrays provide direct millihertz frequency sensitivity to cosmological metric perturbations.\n\n"
            "Chapter 2: Supermassive Black Hole Binary Mergers\n"
            "Orbital decay from stellar hardening drives binaries into the gravitational radiation-dominated regime."
        ).encode("utf-8")

        files = {
            "file": ("astrophysics_gravitation.txt", file_content, "text/plain"),
        }
        data = {
            "title": "Astrophysical Evidence for Gravitational Radiation",
            "author": "Dr. Sarah Al-Mansoor",
            "year": "2026",
            "field": "Astrophysics & Cosmology",
            "collection_id": "theses",
        }

        resp = await ac.post("/api/catalog/upload", files=files, data=data)
        assert resp.status_code == 201
        res_data = resp.json()

        assert res_data["title"] == data["title"]
        assert res_data["author"] == data["author"]
        assert res_data["collection_id"] == "theses"
        assert res_data["sections_count"] == 2
        assert res_data["indexed"] is True
        assert "THES-2026-" in res_data["call_number"]

@pytest.mark.asyncio
async def test_upload_pdf_file_and_immediate_retrieval():
    """Verify uploading a PDF file extracts text and is immediately retrievable via hybrid RAG."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        files = {
            "file": ("neural_dynamics_manuscript.pdf", SAMPLE_MINIMAL_PDF_BYTES, "application/pdf"),
        }
        data = {
            "title": "Cortical Slice Dynamics in Neuromorphic Substrates",
            "author": "Dr. Marcus Thorne",
            "year": "2026",
            "field": "Neuroscience & AI",
            "collection_id": "papers",
        }

        resp = await ac.post("/api/catalog/upload", files=files, data=data)
        assert resp.status_code == 201
        res_data = resp.json()
        doc_id = res_data["document_id"]
        assert res_data["indexed"] is True

        # Verify immediate hybrid retrieval
        candidates = hybrid_retriever.retrieve(
            query="neural dynamics in cortical slices",
            top_k=3,
        )
        assert len(candidates) > 0
        candidate_doc_ids = [c.chunk.document_id for c in candidates]
        assert doc_id in candidate_doc_ids

@pytest.mark.asyncio
async def test_bibtex_export_endpoint():
    """Verify that GET /api/inquiries/{inquiry_id}/bibtex generates valid BibTeX citations."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        synth_payload = {
            "question": "How does attention replace recurrence in sequence modeling?",
            "collection_filter": "all",
            "top_k": 3,
        }
        synth_resp = await ac.post("/api/inquiries/synthesize", json=synth_payload)
        assert synth_resp.status_code == 200
        inquiry_id = synth_resp.json()["inquiry_id"]

        # Call BibTeX export endpoint
        bib_resp = await ac.get(f"/api/inquiries/{inquiry_id}/bibtex")
        assert bib_resp.status_code == 200
        assert "text/plain" in bib_resp.headers.get("content-type", "")
        assert "attachment" in bib_resp.headers.get("content-disposition", "")

        bib_text = bib_resp.text
        assert "% OnlyBooks Academic Library Export" in bib_text
        assert "title = {" in bib_text
        assert "author = {" in bib_text
        assert "year = {" in bib_text
        assert "OnlyBooks Call Number:" in bib_text
