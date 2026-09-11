import asyncio
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import Base
from app.seeds.catalog_seed import seed_initial_catalog
from conftest import test_engine, TestSessionLocal

@pytest.fixture(autouse=True)
def setup_reading_room_db():
    async def _reset():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        async with TestSessionLocal() as session:
            await seed_initial_catalog(session)

    asyncio.run(_reset())
    yield

@pytest.mark.asyncio
async def test_reading_room_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Fetch reading room view for doctoral thesis (doc-a2)
        quote = "Diffusion tensor imaging provides unequivocal evidence of white-matter tract plasticity in adult participants."
        response = await ac.get(f"/api/documents/doc-a2/reading-room?page=112&highlight_quote={quote}")
        assert response.status_code == 200, response.text
        data = response.json()

        assert data["document_id"] == "doc-a2"
        assert data["title"] == "Adult Neuroplasticity and Second-Language Acquisition"
        assert data["call_number"] == "THES-2024-COG-092"
        assert "Doctoral Theses" in data["collection_type"]
        assert data["total_pages"] == 194
        assert data["active_page"] == 112
        assert len(data["sections"]) == 3

        # 2. Check for highlighted block in the matching section
        found_highlight = False
        for sec in data["sections"]:
            for block in sec["blocks"]:
                if block["type"] == "highlight":
                    found_highlight = True
                    assert block["page_ref"] == "Pg. 112"
                    assert "Diffusion tensor imaging" in block["text"]
        assert found_highlight is True

        # 3. Request non-existent document
        missing_res = await ac.get("/api/documents/unknown-doc-id/reading-room")
        assert missing_res.status_code == 404
        assert "not found" in missing_res.json()["detail"].lower()

@pytest.mark.asyncio
async def test_raw_page_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Fetch raw page for Philosophy of Science manuscript (doc-a1)
        response = await ac.get("/api/documents/doc-a1/raw-page/45")
        assert response.status_code == 200, response.text
        data = response.json()

        assert data["document_id"] == "doc-a1"
        assert data["page_number"] == 45
        assert "The Social Structure of Anomalies" in data["chapter_title"]
        assert len(data["text_content"]) > 20

        # 2. Unknown document returns 404
        missing_res = await ac.get("/api/documents/invalid-id/raw-page/1")
        assert missing_res.status_code == 404
