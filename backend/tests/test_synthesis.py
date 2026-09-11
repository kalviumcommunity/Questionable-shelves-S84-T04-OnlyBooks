import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.database import Base
from app.seeds.catalog_seed import seed_initial_catalog
from app.services import (
    hybrid_retriever,
    CitationGuardrail,
    int_to_superscript,
    extract_superscript_markers,
)
from app.schemas.inquiry import CitationItem, SynthesisParagraph
from app.models import Inquiry, Synthesis, Citation
from conftest import test_engine, TestSessionLocal

@pytest.fixture(autouse=True)
def setup_synthesis_db():
    async def _reset():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        async with TestSessionLocal() as session:
            await seed_initial_catalog(session)
            await hybrid_retriever.index_from_database(session)

    asyncio.run(_reset())
    yield

def test_citation_guardrail_mechanisms():
    # 1. Superscript mapping
    assert int_to_superscript(1) == "¹"
    assert int_to_superscript(2) == "²"
    assert int_to_superscript(3) == "³"

    # 2. Extraction from rich academic text
    sample_text = "Hernandez observed dynamic plasticity in bilinguals.¹ Later Ullman corroborated this.²"
    markers = extract_superscript_markers(sample_text)
    assert markers == [1, 2]

    # 3. Guardrail verification matching
    paragraphs = [SynthesisParagraph(text=sample_text)]
    citations = [
        CitationItem(
            id=1,
            marker="¹",
            document_id="doc-1",
            title="The Bilingual Brain",
            author="Hernandez, A.",
            year="2024",
            call_number="THES-001",
            collection_type="Doctoral Thesis",
            page="Pg. 112",
            extracted_quote="Evidence of white-matter tract plasticity.",
        ),
        CitationItem(
            id=2,
            marker="²",
            document_id="doc-2",
            title="Procedural Memory",
            author="Ullman, M.",
            year="2024",
            call_number="THES-002",
            collection_type="Doctoral Thesis",
            page="Pg. 45",
            extracted_quote="Adult learners leverage declarative scaffolding.",
        ),
    ]

    is_valid, score, warnings = CitationGuardrail.verify_citations(paragraphs, citations)
    assert is_valid is True
    assert score >= 0.90
    assert len(warnings) == 0

@pytest.mark.asyncio
async def test_synthesize_endpoint_and_db_persistence():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Submit research inquiry to synthesize endpoint
        payload = {
            "question": "How does adult neuroplasticity support second-language acquisition?",
            "collection_filter": "theses",
            "top_k": 3,
        }
        response = await ac.post("/api/inquiries/synthesize", json=payload)
        assert response.status_code == 200, response.text
        data = response.json()

        assert data["inquiry_id"].startswith("inq-")
        assert len(data["paragraphs"]) >= 2
        assert len(data["citations"]) >= 1
        assert data["attribution_score"] >= 0.85
        assert "University Library Holding" in data["summary_byline"]

        # Check citation marker formatting
        first_citation = data["citations"][0]
        assert first_citation["id"] == 1
        assert first_citation["marker"] == "¹"
        assert "Adult Neuroplasticity" in first_citation["title"]
        assert first_citation["call_number"] == "THES-2024-COG-092"
        assert first_citation["page"].startswith("Pg.")

        inquiry_id = data["inquiry_id"]

        # 2. Verify records were persisted into relational tables
        async with TestSessionLocal() as session:
            inq_res = await session.execute(select(Inquiry).where(Inquiry.id == inquiry_id))
            db_inquiry = inq_res.scalars().first()
            assert db_inquiry is not None
            assert db_inquiry.question == payload["question"]

            syn_res = await session.execute(select(Synthesis).where(Synthesis.inquiry_id == inquiry_id))
            db_synthesis = syn_res.scalars().first()
            assert db_synthesis is not None
            assert "¹" in db_synthesis.body_text

            cit_res = await session.execute(select(Citation).where(Citation.synthesis_id == db_synthesis.id))
            db_citations = cit_res.scalars().all()
            assert len(db_citations) >= 1

        # 3. Retrieve saved inquiry via GET endpoint
        get_res = await ac.get(f"/api/inquiries/{inquiry_id}")
        assert get_res.status_code == 200
        get_data = get_res.json()
        assert get_data["inquiry_id"] == inquiry_id
        assert len(get_data["paragraphs"]) >= 1

        # 4. Unknown inquiry ID returns 404
        missing_res = await ac.get("/api/inquiries/non-existent-inq-id")
        assert missing_res.status_code == 404
