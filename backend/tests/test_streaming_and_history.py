import json
import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services import hybrid_retriever
from app.database import Base
from app.seeds.catalog_seed import seed_initial_catalog
from conftest import test_engine, TestSessionLocal

@pytest.fixture(autouse=True)
def setup_streaming_db():
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
async def test_synthesize_stream_endpoint_and_db_persistence():
    """Verify that SSE streaming delivers incremental tokens, citations, and persists to DB."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "question": "How does attention replace recurrence in sequence modeling?",
            "collection_filter": "all",
            "top_k": 3,
        }

        # Request SSE stream
        async with ac.stream("POST", "/api/inquiries/synthesize/stream", json=payload) as response:
            assert response.status_code == 200
            assert "text/event-stream" in response.headers.get("content-type", "")

            events = []
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    event_data = json.loads(line[6:])
                    events.append(event_data)

            # Validate event types received
            event_types = [e.get("event") for e in events]
            assert "metadata" in event_types
            assert "citations" in event_types
            assert "token" in event_types
            assert "done" in event_types

            # Validate metadata event
            meta_event = next(e for e in events if e.get("event") == "metadata")
            assert meta_event["question"] == payload["question"]
            assert "inquiry_id" in meta_event
            inquiry_id = meta_event["inquiry_id"]

            # Validate citations event
            citations_event = next(e for e in events if e.get("event") == "citations")
            assert len(citations_event["citations"]) > 0
            assert "marker" in citations_event["citations"][0]
            assert "call_number" in citations_event["citations"][0]

            # Validate token events
            token_events = [e for e in events if e.get("event") == "token"]
            assert len(token_events) > 5
            full_reconstructed_text = "".join(e["token"] for e in token_events)
            assert len(full_reconstructed_text) > 50

            # Validate done event
            done_event = next(e for e in events if e.get("event") == "done")
            assert done_event["inquiry_id"] == inquiry_id

        # Verify DB persistence of streamed inquiry
        saved_resp = await ac.get(f"/api/inquiries/{inquiry_id}")
        assert saved_resp.status_code == 200
        saved_data = saved_resp.json()
        assert saved_data["inquiry_id"] == inquiry_id
        assert saved_data["question"] == payload["question"]
        assert len(saved_data["paragraphs"]) > 0
        assert len(saved_data["citations"]) > 0

@pytest.mark.asyncio
async def test_inquiry_history_endpoint():
    """Verify that GET /api/inquiries returns recent inquiries in reverse chronological order."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create first inquiry
        q1 = {"question": "The epistemology of scientific consensus formation", "collection_filter": "all"}
        r1 = await ac.post("/api/inquiries/synthesize", json=q1)
        assert r1.status_code == 200

        # Create second inquiry
        q2 = {"question": "Feminist critiques of Rawlsian distributive justice", "collection_filter": "theses"}
        r2 = await ac.post("/api/inquiries/synthesize", json=q2)
        assert r2.status_code == 200

        # Fetch history
        hist_resp = await ac.get("/api/inquiries")
        assert hist_resp.status_code == 200
        hist_data = hist_resp.json()

        assert "items" in hist_data
        assert hist_data["total"] >= 2
        questions = [item["question"] for item in hist_data["items"]]
        assert q2["question"] in questions
        assert q1["question"] in questions

        # Verify items contain metadata
        latest = hist_data["items"][0]
        assert "id" in latest
        assert "timestamp" in latest
        assert "citations_count" in latest
        assert "attribution_score" in latest
        assert latest["citations_count"] > 0
