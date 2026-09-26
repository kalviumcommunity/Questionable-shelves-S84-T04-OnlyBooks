import pytest
import json
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.synthesizer import GroundedSynthesizer
from app.services.chunk_models import LibraryChunk, RetrievalResult
from app.schemas.inquiry import InquiryRequest

@pytest.fixture
def mock_candidates():
    chunk1 = LibraryChunk(
        chunk_id="chk-1",
        document_id="doc-1",
        title="Structure of Scientific Revolutions",
        author="Kuhn, Thomas",
        year="1962",
        collection_id="theses",
        call_number="THES-1962-PHIL-001",
        page_number=54,
        chapter_num="V",
        chapter_title="The Nature of Normal Science",
        text_content="Normal science does not aim at novelties of fact or theory and finds none when successful.",
    )
    chunk2 = LibraryChunk(
        chunk_id="chk-2",
        document_id="doc-2",
        title="Conjectures and Refutations",
        author="Popper, Karl",
        year="1963",
        collection_id="papers",
        call_number="FAC-1963-PHIL-002",
        page_number=36,
        chapter_num="I",
        chapter_title="Science: Conjectures and Refutations",
        text_content="Confirmations should count only if they are the result of risky predictions.",
    )
    return [
        RetrievalResult(chunk=chunk1, dense_score=0.9, bm25_score=10.0, rrf_score=0.032, rank=1),
        RetrievalResult(chunk=chunk2, dense_score=0.85, bm25_score=9.5, rrf_score=0.031, rank=2),
    ]

def test_build_gemini_prompt(mock_candidates):
    synthesizer = GroundedSynthesizer()
    question = "How do Kuhn and Popper conceptualize scientific paradigm change?"
    sys_inst, user_prompt = synthesizer._build_gemini_prompt(question, mock_candidates)

    assert "OnlyBooks" in sys_inst
    assert "unicode superscript footnote marker" in sys_inst
    assert "Research Inquiry: \"How do Kuhn and Popper conceptualize scientific paradigm change?\"" in user_prompt
    assert "[1] (Footnote Marker: ¹)" in user_prompt
    assert "Kuhn, Thomas" in user_prompt
    assert "[2] (Footnote Marker: ²)" in user_prompt
    assert "Popper, Karl" in user_prompt

@pytest.mark.asyncio
async def test_gemini_fallback_when_no_api_key(mock_candidates):
    synthesizer = GroundedSynthesizer()
    request = InquiryRequest(
        question="How do Kuhn and Popper conceptualize scientific paradigm change?",
        collection_filter="all",
        top_k=2,
    )
    with patch("app.services.synthesizer.settings.GEMINI_API_KEY", None):
        response = await synthesizer.synthesize(request, db=None)
        assert response is not None
        assert len(response.paragraphs) > 0
        assert len(response.citations) == 2
        assert response.citations[0].marker == "¹"
        assert response.citations[1].marker == "²"
        assert response.attribution_score >= 0.75

@pytest.mark.asyncio
async def test_gemini_live_call_success_mocked(mock_candidates):
    synthesizer = GroundedSynthesizer()
    request = InquiryRequest(
        question="How do paradigms shift?",
        collection_filter="all",
        top_k=2,
    )

    mock_gemini_response = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": (
                                "In the philosophy of science, Kuhn emphasizes that normal science works within an accepted paradigm without pursuing anomalies.¹\n\n"
                                "Conversely, Popper contends that scientific progress relies on bold conjectures and rigorous refutations.²"
                            )
                        }
                    ]
                }
            }
        ]
    }

    mock_http_resp = MagicMock()
    mock_http_resp.status_code = 200
    mock_http_resp.json.return_value = mock_gemini_response

    mock_client = AsyncMock()
    mock_client.post.return_value = mock_http_resp
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("app.services.synthesizer.settings.GEMINI_API_KEY", "test-fake-key-12345"):
        with patch("httpx.AsyncClient", return_value=mock_client):
            with patch("app.services.synthesizer.get_hybrid_retriever") as mock_retriever_fn:
                mock_retriever = MagicMock()
                mock_retriever.retrieve.return_value = mock_candidates
                mock_retriever_fn.return_value = mock_retriever

                response = await synthesizer.synthesize(request, db=None)
                assert len(response.paragraphs) == 2
                assert "Kuhn emphasizes" in response.paragraphs[0].text
                assert "¹" in response.paragraphs[0].text
                assert "Popper contends" in response.paragraphs[1].text
                assert "²" in response.paragraphs[1].text
                assert response.attribution_score >= 0.85

@pytest.mark.asyncio
async def test_gemini_api_error_graceful_fallback(mock_candidates):
    synthesizer = GroundedSynthesizer()
    request = InquiryRequest(
        question="How do paradigms shift?",
        collection_filter="all",
        top_k=2,
    )

    mock_http_resp = MagicMock()
    mock_http_resp.status_code = 500
    mock_http_resp.text = "Internal Server Error"

    mock_client = AsyncMock()
    mock_client.post.return_value = mock_http_resp
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None

    with patch("app.services.synthesizer.settings.GEMINI_API_KEY", "test-fake-key-12345"):
        with patch("httpx.AsyncClient", return_value=mock_client):
            with patch("app.services.synthesizer.get_hybrid_retriever") as mock_retriever_fn:
                mock_retriever = MagicMock()
                mock_retriever.retrieve.return_value = mock_candidates
                mock_retriever_fn.return_value = mock_retriever

                # Should not raise exception; must gracefully fallback
                response = await synthesizer.synthesize(request, db=None)
                assert response is not None
                assert len(response.paragraphs) > 0
                assert len(response.citations) == 2
