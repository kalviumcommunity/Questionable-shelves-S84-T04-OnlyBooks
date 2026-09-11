import asyncio
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import Base
from app.seeds.catalog_seed import seed_initial_catalog
from conftest import test_engine, TestSessionLocal

@pytest.fixture(autouse=True)
def setup_catalog_db():
    async def _reset():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        async with TestSessionLocal() as session:
            await seed_initial_catalog(session)

    asyncio.run(_reset())
    yield


@pytest.mark.asyncio
async def test_catalog_metrics():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/catalog/metrics")
        assert response.status_code == 200
        data = response.json()
        assert data["total_documents"] == 6
        assert data["total_theses"] == 2
        assert data["total_papers"] == 2
        assert data["total_reserves"] == 1
        assert data["total_press"] == 1
        assert "Fall Term 2026" in data["last_sync"]

@pytest.mark.asyncio
async def test_catalog_acquisitions_all_and_filtering():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Fetch all acquisitions
        all_res = await ac.get("/api/catalog/acquisitions")
        assert all_res.status_code == 200
        all_data = all_res.json()
        assert all_data["total"] == 6
        assert len(all_data["items"]) == 6

        # 2. Filter by collection 'theses'
        theses_res = await ac.get("/api/catalog/acquisitions?collection=theses")
        assert theses_res.status_code == 200
        theses_data = theses_res.json()
        assert theses_data["total"] == 2
        for item in theses_data["items"]:
            assert item["collection_id"] == "theses"

        # 3. Filter by collection 'papers'
        papers_res = await ac.get("/api/catalog/acquisitions?collection=papers")
        assert papers_res.status_code == 200
        papers_data = papers_res.json()
        assert papers_data["total"] == 2
        for item in papers_data["items"]:
            assert item["collection_id"] == "papers"

        # 4. Keyword search by author
        search_res = await ac.get("/api/catalog/acquisitions?search=Kuhn")
        assert search_res.status_code == 200
        search_data = search_res.json()
        assert search_data["total"] == 1
        assert "Kuhn" in search_data["items"][0]["author"]

        # 5. Search by call number
        call_res = await ac.get("/api/catalog/acquisitions?search=THES-2024-COG-092")
        assert call_res.status_code == 200
        assert call_res.json()["total"] == 1
        assert call_res.json()["items"][0]["call_number"] == "THES-2024-COG-092"

@pytest.mark.asyncio
async def test_catalog_document_detail_and_404():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Valid document lookup
        doc_res = await ac.get("/api/catalog/documents/doc-a2")
        assert doc_res.status_code == 200
        doc_data = doc_res.json()
        assert doc_data["id"] == "doc-a2"
        assert doc_data["title"] == "Adult Neuroplasticity and Second-Language Acquisition"
        assert doc_data["call_number"] == "THES-2024-COG-092"
        assert len(doc_data["sections"]) == 3
        assert doc_data["sections"][0]["chapter_num"] == "Chapter I"

        # 2. Unknown document lookup
        missing_res = await ac.get("/api/catalog/documents/non-existent-uuid")
        assert missing_res.status_code == 404
        assert "not found" in missing_res.json()["detail"].lower()
