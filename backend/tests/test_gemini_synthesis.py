import pytest
import json
from types import SimpleNamespace
from unittest.mock import patch, AsyncMock, MagicMock
from app.services.synthesizer import GroundedSynthesizer
from app.services.chunk_models import LibraryChunk, RetrievalResult
from app.schemas.inquiry import InquiryRequest, SynthesisParagraph

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

    _, follow_up_prompt = synthesizer._build_gemini_prompt(
        "What does that imply?",
        mock_candidates,
        "Original inquiry: paradigm change\nPrevious response: Kuhn describes normal science.",
    )
    assert "Previous response: Kuhn describes normal science." in follow_up_prompt
    assert 'Follow-up research inquiry: "What does that imply?"' in follow_up_prompt


def test_gemini_prompt_allows_general_guidance_without_sources():
    synthesizer = GroundedSynthesizer()
    system_instruction, user_prompt = synthesizer._build_gemini_prompt(
        "Give me some good books for meditation.", []
    )

    assert "general knowledge" in system_instruction
    assert "not verified against this library's holdings" in system_instruction
    assert "do not invent citations or use footnote markers" in system_instruction
    assert "No relevant library holdings were found" in user_prompt


@pytest.mark.asyncio
async def test_no_sources_uses_general_gemini_without_citations():
    synthesizer = GroundedSynthesizer()
    request = InquiryRequest(question="Give me some good books for meditation.")
    retriever = MagicMock()
    retriever.retrieve.return_value = []
    gemini_call = AsyncMock(
        return_value=[SynthesisParagraph(text="General guidance: try a beginner-friendly meditation guide.")]
    )

    with patch("app.services.synthesizer.settings.GEMINI_API_KEY", "test-key"):
        with patch("app.services.synthesizer.get_hybrid_retriever", return_value=retriever):
            with patch.object(synthesizer, "_call_gemini_synthesis", gemini_call):
                response = await synthesizer.synthesize(request)

    gemini_call.assert_awaited_once_with(request.question, [], None)
    assert response.citations == []
    assert response.attribution_score == 0.0
    assert response.summary_byline == "General Gemini guidance · No matching library holdings"


@pytest.mark.asyncio
async def test_followup_uses_saved_citation_sources_for_gemini():
    synthesizer = GroundedSynthesizer()
    document = SimpleNamespace(
        id="doc-1",
        title="Structure of Scientific Revolutions",
        author="Kuhn, Thomas",
        year="1962",
        collection_id="theses",
        call_number="THES-1962-PHIL-001",
        journal_or_press="University Press",
        field="Philosophy",
    )
    citation = SimpleNamespace(
        id="citation-1",
        document_id="doc-1",
        page_ref="Pg. 54",
        extracted_quote="Normal science works within an accepted paradigm.",
        chapter_num="THES-1962-PHIL-001",
        confidence_score=0.9,
        document=document,
    )
    previous_inquiry = SimpleNamespace(
        question="How does Kuhn define normal science?",
        syntheses=[SimpleNamespace(
            body_text="Kuhn describes normal science as work within a paradigm.¹",
            citations=[citation],
        )],
    )
    query_result = MagicMock()
    query_result.scalars.return_value.first.return_value = previous_inquiry
    db = MagicMock()
    db.execute = AsyncMock(return_value=query_result)
    db.commit = AsyncMock()

    request = InquiryRequest(
        question="What does that imply for paradigm shifts?",
        context_inquiry_id="inq-prior",
    )
    gemini_call = AsyncMock(
        return_value=[SynthesisParagraph(text="The passage frames shifts against established practice.¹")]
    )

    with patch("app.services.synthesizer.settings.GEMINI_API_KEY", "test-key"):
        with patch.object(synthesizer, "_call_gemini_synthesis", gemini_call):
            with patch("app.services.synthesizer.get_hybrid_retriever") as retriever_factory:
                response = await synthesizer.synthesize(request, db=db)

    retriever_factory.assert_not_called()
    gemini_call.assert_awaited_once()
    gemini_args = gemini_call.await_args.args
    assert gemini_args[0] == request.question
    assert gemini_args[1][0].chunk.document_id == "doc-1"
    assert gemini_args[1][0].chunk.text_content == citation.extracted_quote
    assert "Original inquiry: How does Kuhn define normal science?" in gemini_args[2]
    assert response.citations[0].document_id == "doc-1"

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
                request_url = mock_client.post.await_args.args[0]
                request_kwargs = mock_client.post.await_args.kwargs
                assert "?key=" not in request_url
                assert request_kwargs["headers"]["x-goog-api-key"] == "test-fake-key-12345"
                assert "systemInstruction" in request_kwargs["json"]
                assert "system_instruction" not in request_kwargs["json"]
                assert len(response.paragraphs) == 2
                assert "Kuhn emphasizes" in response.paragraphs[0].text
                assert "¹" in response.paragraphs[0].text
                assert "Popper contends" in response.paragraphs[1].text
                assert "²" in response.paragraphs[1].text
                assert response.attribution_score >= 0.85

@pytest.mark.asyncio
async def test_gemini_api_error_graceful_fallback(mock_candidates, capsys):
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
                assert "Internal Server Error" not in capsys.readouterr().out

@pytest.mark.asyncio
async def test_gemini_stream_request_contract(mock_candidates):
    synthesizer = GroundedSynthesizer()
    gemini_response = MagicMock()
    gemini_response.status_code = 200

    async def response_lines():
        yield "data: " + json.dumps({
            "candidates": [{
                "content": {"parts": [{"text": "First paragraph.¹\n\nSecond paragraph.²"}]}
            }]
        })

    gemini_response.aiter_lines = response_lines
    response_context = MagicMock()
    response_context.__aenter__ = AsyncMock(return_value=gemini_response)
    response_context.__aexit__ = AsyncMock(return_value=None)

    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.stream.return_value = response_context

    with patch("app.services.synthesizer.settings.GEMINI_API_KEY", "test-fake-key-12345"):
        with patch("httpx.AsyncClient", return_value=mock_client):
            events = [
                event async for event in synthesizer._stream_gemini_synthesis(
                    "How do paradigms shift?", mock_candidates
                )
            ]

    request_args = mock_client.stream.call_args
    request_url = request_args.args[1]
    request_kwargs = request_args.kwargs
    assert "streamGenerateContent?alt=sse" in request_url
    assert "key=" not in request_url
    assert request_kwargs["headers"]["x-goog-api-key"] == "test-fake-key-12345"
    assert "systemInstruction" in request_kwargs["json"]
    assert [event["type"] for event in events] == ["token", "paragraph_break", "token"]
    assert events[0]["token"] == "First paragraph.¹"
    assert events[2]["paragraph_idx"] == 1

@pytest.mark.asyncio
async def test_stream_falls_back_without_gemini_key(mock_candidates):
    synthesizer = GroundedSynthesizer()
    request = InquiryRequest(
        question="How do paradigms shift?",
        collection_filter="all",
        top_k=2,
    )
    mock_retriever = MagicMock()
    mock_retriever.retrieve.return_value = mock_candidates

    with patch("app.services.synthesizer.settings.GEMINI_API_KEY", ""):
        with patch("app.services.synthesizer.get_hybrid_retriever", return_value=mock_retriever):
            events = [
                json.loads(line[6:])
                async for line in synthesizer.synthesize_stream(request, db=None)
            ]

    assert events[0]["event"] == "metadata"
    assert events[1]["event"] == "citations"
    assert any(event["event"] == "token" for event in events)
    assert events[-1]["event"] == "done"
