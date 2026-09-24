import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_acquisitions_sorting_and_filtering():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Test sort by oldest
        resp_oldest = await client.get("/api/catalog/acquisitions?sort_by=oldest")
        assert resp_oldest.status_code == 200
        items_oldest = resp_oldest.json()["items"]
        assert len(items_oldest) > 0
        years_oldest = [int(it["year"]) for it in items_oldest if it["year"].isdigit()]
        if len(years_oldest) >= 2:
            assert years_oldest[0] <= years_oldest[-1]

        # 2. Test sort by pages
        resp_pages = await client.get("/api/catalog/acquisitions?sort_by=pages")
        assert resp_pages.status_code == 200
        items_pages = resp_pages.json()["items"]
        assert len(items_pages) > 0
        assert items_pages[0]["total_pages"] >= items_pages[-1]["total_pages"]

        # 3. Test sort by title
        resp_title = await client.get("/api/catalog/acquisitions?sort_by=title")
        assert resp_title.status_code == 200
        items_title = resp_title.json()["items"]
        assert len(items_title) > 0
        titles = [it["title"].lower() for it in items_title]
        assert titles == sorted(titles)

        # 4. Test year range filtering
        resp_filtered = await client.get("/api/catalog/acquisitions?year_from=1960&year_to=1975")
        assert resp_filtered.status_code == 200
        items_filtered = resp_filtered.json()["items"]
        for item in items_filtered:
            if item["year"].isdigit():
                yr = int(item["year"])
                assert 1960 <= yr <= 1975
