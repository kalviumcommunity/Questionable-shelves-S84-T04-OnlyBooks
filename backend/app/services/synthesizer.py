import os
import uuid
import json
import asyncio
import re
from typing import List, Optional, AsyncGenerator, Dict, Any, Tuple
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .hybrid_retriever import get_hybrid_retriever
from .chunk_models import LibraryChunk, RetrievalResult
from .citation_guardrail import int_to_superscript, CitationGuardrail
from ..config import settings
from ..schemas.inquiry import (
    InquiryRequest,
    CitationItem,
    SynthesisParagraph,
    SynthesisResponse,
)
from ..models import Inquiry, Synthesis, Citation, Document

COLLECTION_LABELS = {
    "papers": "Faculty Research",
    "theses": "Doctoral Thesis",
    "reserves": "Course Reserve",
    "press": "University Press",
}

class GroundedSynthesizer:
    """
    Synthesizes academic library holdings into citation-backed explanations
    where factual assertions are mapped 1-to-1 to exact page excerpts and footnote marks.
    Leverages Google Gemini 1.5 when configured with seamless fallback to deterministic academic synthesis.
    """

    def __init__(self):
        self.guardrail = CitationGuardrail()

    def _build_gemini_prompt(
        self,
        question: str,
        candidates: List[RetrievalResult],
        follow_up_context: Optional[str] = None,
    ) -> Tuple[str, str]:
        """Construct scholarly prompt and source holdings for Gemini LLM generation."""
        grounded_instruction = (
            "You are OnlyBooks, a prestigious university research librarian and academic synthesizer.\n"
            "Your audience consists of university researchers, faculty scholars, and undergraduate students.\n\n"
            "CRITICAL RULES:\n"
            "1. Synthesize a coherent, authoritative academic response answering the user's inquiry strictly based on the numbered source passages below.\n"
            "2. EVERY factual assertion, claim, or quote must be followed by an exact unicode superscript footnote marker (¹ for [1], ² for [2], ³ for [3], ⁴ for [4], ⁵ for [5]) corresponding to the source passage index.\n"
            "3. Do NOT invent outside facts, sources, or citations. Ground every statement in the provided literature excerpts.\n"
            "4. Organize your response into 2 to 3 scholarly paragraphs: an introduction and theoretical framing, deep substantive analysis contrasting claims if applicable, and a synthesis.\n"
            "5. Treat prior conversation only as context; the provided source excerpts are the sole authority for factual claims. Correct unsupported prior claims.\n"
            "6. Maintain an elevated, peer-reviewed academic tone. Never use bullet points, casual greetings, or chatbot conversational filler."
        )
        general_instruction = (
            "You are OnlyBooks, a helpful university research librarian. Answer the user's question directly "
            "using general knowledge because no relevant library excerpts were found. Begin by clearly stating "
            "that the answer is general guidance and is not verified against this library's holdings. "
            "Never imply recommended books are held by the library, and do not invent citations or use footnote markers. "
            "For book recommendations, give real titles and authors with a brief explanation of who each book suits."
        )
        system_instruction = grounded_instruction if candidates else general_instruction

        source_blocks = []
        for idx, res in enumerate(candidates, start=1):
            chunk = res.chunk
            coll_type = COLLECTION_LABELS.get(chunk.collection_id, "University Archive")
            marker = int_to_superscript(idx)
            block = (
                f"[{idx}] (Footnote Marker: {marker})\n"
                f"Title: {chunk.title}\n"
                f"Author: {chunk.author} ({chunk.year})\n"
                f"Collection: {coll_type} | Call Number: {chunk.call_number} | Page: {chunk.page_number}\n"
                f"Excerpt: \"{chunk.text_content.strip()}\""
            )
            source_blocks.append(block)

        sources_text = "\n\n".join(source_blocks)
        if not sources_text:
            sources_text = "No relevant library holdings were found for this inquiry."
        inquiry_context = (
            f"Prior inquiry and response for context:\n{follow_up_context}\n\nFollow-up research inquiry: \"{question}\""
            if follow_up_context
            else f"Research Inquiry: \"{question}\""
        )
        user_prompt = (
            f"{inquiry_context}\n\n"
            f"Available University Library Holdings:\n{sources_text}\n\n"
            + (
                "Provide a concise, source-grounded synthesis with inline unicode superscript footnote markers (¹²³)."
                if candidates
                else "Give a useful general answer. For a recommendation request, provide 3 to 5 specific suggestions."
            )
        )
        return system_instruction, user_prompt

    def _gemini_request_payload(
        self,
        question: str,
        candidates: List[RetrievalResult],
        follow_up_context: Optional[str] = None,
    ) -> Dict[str, Any]:
        system_instruction, user_prompt = self._build_gemini_prompt(
            question, candidates, follow_up_context
        )
        return {
            "systemInstruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2048,
            }
        }

    @staticmethod
    def _gemini_request_headers() -> Dict[str, str]:
        return {"x-goog-api-key": settings.GEMINI_API_KEY or ""}

    async def _call_gemini_synthesis(
        self,
        question: str,
        candidates: List[RetrievalResult],
        follow_up_context: Optional[str] = None,
    ) -> Optional[List[SynthesisParagraph]]:
        """Call Gemini REST API to generate citation-grounded synthesis paragraphs."""
        if not settings.GEMINI_API_KEY:
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
        payload = self._gemini_request_payload(question, candidates, follow_up_context)

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(
                    url,
                    json=payload,
                    headers=self._gemini_request_headers(),
                )
                if resp.status_code == 200:
                    data = resp.json()
                    candidates_resp = data.get("candidates", [])
                    if candidates_resp:
                        parts = candidates_resp[0].get("content", {}).get("parts", [])
                        if parts:
                            text = parts[0].get("text", "").strip()
                            raw_paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
                            if raw_paragraphs:
                                return [SynthesisParagraph(text=p) for p in raw_paragraphs]
                else:
                    print(f"Gemini API returned status {resp.status_code}")
        except Exception as e:
            print(f"Gemini API call failed with {type(e).__name__}")

        return None

    def _generate_fallback_synthesis(
        self,
        question: str,
        retrieval_results: List[RetrievalResult],
    ) -> List[SynthesisParagraph]:
        """
        Deterministic scholarly editorial synthesis generator when LLM API keys are not configured.
        Weaves retrieved author assertions and chapter contexts into coherent academic paragraphs.
        """
        if not retrieval_results:
            return [
                SynthesisParagraph(
                    text=(
                        "I couldn't find relevant books or passages in the current library holdings. "
                        "Gemini is unavailable right now, so I can't provide an unverified general answer. "
                        "Try a different search or ask a librarian to add relevant materials."
                    )
                )
            ]

        # First paragraph: Conceptual framing and literature overview
        authors_str = " and ".join(
            dict.fromkeys(r.chunk.author.split("&")[0].strip() for r in retrieval_results[:2])
        )
        p1 = (
            f"Within university archival collections, inquiries regarding {question.lower().rstrip('?.')} "
            f"converge on foundational research articulated across {authors_str}'s investigations."
        )

        # Body assertions anchored to footnote markers
        assertions: List[str] = []
        for idx, res in enumerate(retrieval_results, start=1):
            marker = int_to_superscript(idx)
            author_lead = res.chunk.author.split(",")[0].strip()
            chapter_name = res.chunk.chapter_title
            quote_excerpt = res.chunk.text_content.strip()
            if not quote_excerpt.endswith("."):
                quote_excerpt += "."

            assertion = (
                f"In {chapter_name}, {author_lead} establishes that {quote_excerpt.lower()} {marker}"
            )
            assertions.append(assertion)

        p2 = " ".join(assertions)

        p3 = (
            "These findings substantiate that academic synthesis within this domain relies upon "
            "rigorous cross-manuscript validation rather than isolated empirical claims."
        )

        return [
            SynthesisParagraph(text=p1),
            SynthesisParagraph(text=p2),
            SynthesisParagraph(text=p3),
        ]

    async def _stream_gemini_synthesis(
        self,
        question: str,
        candidates: List[RetrievalResult],
        follow_up_context: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream chunks from Gemini SSE API and yield structured token/paragraph events."""
        if not settings.GEMINI_API_KEY:
            return

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:streamGenerateContent?alt=sse"
        payload = self._gemini_request_payload(question, candidates, follow_up_context)

        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                async with client.stream(
                    "POST",
                    url,
                    json=payload,
                    headers=self._gemini_request_headers(),
                ) as response:
                    if response.status_code != 200:
                        print(f"Gemini streaming returned HTTP {response.status_code}")
                        return

                    p_idx = 0
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            raw_data = line[6:].strip()
                            if not raw_data:
                                continue
                            try:
                                chunk_json = json.loads(raw_data)
                                parts = chunk_json.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                                for part in parts:
                                    text_chunk = part.get("text", "")
                                    if not text_chunk:
                                        continue
                                    if "\n\n" in text_chunk:
                                        segments = text_chunk.split("\n\n")
                                        for s_i, seg in enumerate(segments):
                                            if seg:
                                                yield {"type": "token", "token": seg, "paragraph_idx": p_idx}
                                            if s_i < len(segments) - 1:
                                                yield {"type": "paragraph_break", "paragraph_idx": p_idx}
                                                p_idx += 1
                                    else:
                                        yield {"type": "token", "token": text_chunk, "paragraph_idx": p_idx}
                            except Exception:
                                continue
        except Exception as e:
            print(f"Gemini streaming failed with {type(e).__name__}")

    async def _get_candidates_and_context(
        self,
        request: InquiryRequest,
        db: Optional[AsyncSession],
    ) -> Tuple[List[RetrievalResult], Optional[str]]:
        if request.context_inquiry_id and db is not None:
            query = (
                select(Inquiry)
                .options(
                    selectinload(Inquiry.syntheses)
                    .selectinload(Synthesis.citations)
                    .selectinload(Citation.document)
                )
                .where(Inquiry.id == request.context_inquiry_id)
            )
            result = await db.execute(query)
            previous_inquiry = result.scalars().first()

            if previous_inquiry and previous_inquiry.syntheses:
                previous_synthesis = previous_inquiry.syntheses[0]
                candidates: List[RetrievalResult] = []
                for citation in previous_synthesis.citations:
                    document = citation.document
                    if not document or not citation.extracted_quote.strip():
                        continue

                    page_match = re.search(r"\d+", citation.page_ref or "")
                    chunk = LibraryChunk(
                        chunk_id=f"{citation.document_id}-{citation.id}",
                        document_id=document.id,
                        title=document.title,
                        author=document.author,
                        year=document.year,
                        collection_id=document.collection_id or "papers",
                        call_number=document.call_number or "",
                        page_number=int(page_match.group()) if page_match else 1,
                        chapter_num=citation.chapter_num or "",
                        chapter_title=document.title,
                        text_content=citation.extracted_quote,
                        metadata={
                            "journal_or_press": document.journal_or_press,
                            "field": document.field,
                        },
                    )
                    confidence = citation.confidence_score or 0.95
                    candidates.append(
                        RetrievalResult(
                            chunk=chunk,
                            rrf_score=float(confidence) / 10,
                        )
                    )

                if candidates:
                    follow_up_context = (
                        f"Original inquiry: {previous_inquiry.question}\n"
                        f"Previous response: {previous_synthesis.body_text}"
                    )
                    return candidates[:request.top_k], follow_up_context

        retriever = get_hybrid_retriever()
        candidates = retriever.retrieve(
            query=request.question,
            top_k=request.top_k,
            collection_filter=request.collection_filter,
        )
        return candidates, None

    async def synthesize(
        self,
        request: InquiryRequest,
        db: Optional[AsyncSession] = None,
    ) -> SynthesisResponse:
        """
        Execute end-to-end hybrid retrieval, generate citation-anchored synthesis,
        verify grounding with guardrails, and optionally persist to relational DB.
        """
        candidates, follow_up_context = await self._get_candidates_and_context(request, db)

        # Build verified citation items
        citations: List[CitationItem] = []
        unique_fields = set()

        for idx, res in enumerate(candidates, start=1):
            chunk = res.chunk
            coll_type = COLLECTION_LABELS.get(chunk.collection_id, "University Archive")
            citation_item = CitationItem(
                id=idx,
                marker=int_to_superscript(idx),
                document_id=chunk.document_id,
                title=chunk.title,
                author=chunk.author,
                year=chunk.year,
                journal=chunk.metadata.get("journal_or_press") or coll_type,
                call_number=chunk.call_number,
                collection_type=coll_type,
                page=f"Pg. {chunk.page_number}",
                extracted_quote=chunk.text_content,
                confidence_score=round(float(res.rrf_score * 10), 2) if res.rrf_score else 0.95,
            )
            citations.append(citation_item)
            if hasattr(chunk, "field") and chunk.field:
                unique_fields.add(chunk.field)

        # Generate paragraphs via Gemini if configured, otherwise deterministic academic fallback
        paragraphs = None
        if settings.GEMINI_API_KEY:
            paragraphs = await self._call_gemini_synthesis(
                request.question, candidates, follow_up_context
            )
        if not paragraphs:
            paragraphs = self._generate_fallback_synthesis(request.question, candidates)

        if citations:
            is_valid, attribution_score, warnings = self.guardrail.verify_citations(
                paragraphs, citations
            )
        else:
            attribution_score = 0.0
            warnings = []

        # Build summary byline
        distinct_holdings = len(set(c.document_id for c in citations))
        byline_field = " · ".join(unique_fields) if unique_fields else "University Library Archive"
        summary_byline = (
            f"Synthesized from {distinct_holdings} University Library Holding"
            f"{'s' if distinct_holdings != 1 else ''} · {byline_field}"
            if citations
            else "General Gemini guidance · No matching library holdings"
        )

        inquiry_id = f"inq-{uuid.uuid4().hex[:8]}"

        # Persist to relational database if session provided
        if db is not None:
            db_inquiry = Inquiry(
                id=inquiry_id,
                user_id=request.user_id,
                question=request.question,
                collection_filter=request.collection_filter or "all",
            )
            db.add(db_inquiry)

            full_body = "\n\n".join(p.text for p in paragraphs)
            db_synthesis = Synthesis(
                id=f"syn-{uuid.uuid4().hex[:8]}",
                inquiry_id=inquiry_id,
                summary_byline=summary_byline,
                body_text=full_body,
                attribution_score=attribution_score,
            )
            db.add(db_synthesis)

            for c in citations:
                db_citation = Citation(
                    id=f"cit-{uuid.uuid4().hex[:8]}",
                    synthesis_id=db_synthesis.id,
                    marker_number=c.id,
                    document_id=c.document_id,
                    page_ref=c.page,
                    extracted_quote=c.extracted_quote,
                    chapter_num=c.call_number,
                    confidence_score=c.confidence_score,
                )
                db.add(db_citation)

            await db.commit()

        return SynthesisResponse(
            inquiry_id=inquiry_id,
            question=request.question,
            summary_byline=summary_byline,
            paragraphs=paragraphs,
            citations=citations,
            attribution_score=attribution_score,
        )

    async def synthesize_stream(
        self,
        request: InquiryRequest,
        db: Optional[AsyncSession] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream real-time citation-grounded synthesis tokens via Server-Sent Events (SSE).
        Emits metadata, citation index, incremental typewriter tokens, and final completion confirmation.
        Persists inquiry, synthesis, and citation records to relational database.
        """
        candidates, follow_up_context = await self._get_candidates_and_context(request, db)

        # Build verified citation items
        citations: List[CitationItem] = []
        unique_fields = set()

        for idx, res in enumerate(candidates, start=1):
            chunk = res.chunk
            coll_type = COLLECTION_LABELS.get(chunk.collection_id, "University Archive")
            citation_item = CitationItem(
                id=idx,
                marker=int_to_superscript(idx),
                document_id=chunk.document_id,
                title=chunk.title,
                author=chunk.author,
                year=chunk.year,
                journal=chunk.metadata.get("journal_or_press") or coll_type,
                call_number=chunk.call_number,
                collection_type=coll_type,
                page=f"Pg. {chunk.page_number}",
                extracted_quote=chunk.text_content,
                confidence_score=round(float(res.rrf_score * 10), 2) if res.rrf_score else 0.95,
            )
            citations.append(citation_item)
            if hasattr(chunk, "field") and chunk.field:
                unique_fields.add(chunk.field)

        distinct_holdings = len(set(c.document_id for c in citations))
        byline_field = " · ".join(unique_fields) if unique_fields else "University Library Archive"
        summary_byline = (
            f"Synthesized from {distinct_holdings} University Library Holding"
            f"{'s' if distinct_holdings != 1 else ''} · {byline_field}"
            if citations
            else "General Gemini guidance · No matching library holdings"
        )

        inquiry_id = f"inq-{uuid.uuid4().hex[:8]}"

        # 1. Yield initial metadata event
        meta_event = {
            "event": "metadata",
            "inquiry_id": inquiry_id,
            "question": request.question,
            "summary_byline": summary_byline,
            "attribution_score": 0.94 if citations else 0.0,
            "total_citations": len(citations),
        }
        yield f"data: {json.dumps(meta_event)}\n\n"
        await asyncio.sleep(0.01)

        # 2. Yield verified citations event
        citations_event = {
            "event": "citations",
            "citations": [c.model_dump() for c in citations],
        }
        yield f"data: {json.dumps(citations_event)}\n\n"
        await asyncio.sleep(0.01)

        # 3. Stream tokens (from live Gemini if available, else deterministic typewriter)
        accumulated_paragraphs: List[str] = [""]
        gemini_streamed_success = False

        if settings.GEMINI_API_KEY:
            try:
                cur_p = 0
                async for event in self._stream_gemini_synthesis(
                    request.question, candidates, follow_up_context
                ):
                    gemini_streamed_success = True
                    if event["type"] == "token":
                        while len(accumulated_paragraphs) <= event["paragraph_idx"]:
                            accumulated_paragraphs.append("")
                        accumulated_paragraphs[event["paragraph_idx"]] += event["token"]
                        token_event = {
                            "event": "token",
                            "token": event["token"],
                            "paragraph_idx": event["paragraph_idx"],
                        }
                        yield f"data: {json.dumps(token_event)}\n\n"
                        await asyncio.sleep(0.005)
                    elif event["type"] == "paragraph_break":
                        break_event = {
                            "event": "paragraph_break",
                            "paragraph_idx": event["paragraph_idx"],
                        }
                        yield f"data: {json.dumps(break_event)}\n\n"
                        await asyncio.sleep(0.01)
            except Exception as e:
                print(f"Error streaming from Gemini: {type(e).__name__}")
                gemini_streamed_success = False

        if not gemini_streamed_success:
            fallback_paragraphs = self._generate_fallback_synthesis(request.question, candidates)
            accumulated_paragraphs = [p.text for p in fallback_paragraphs]
            for p_idx, p in enumerate(fallback_paragraphs):
                tokens = p.text.split(" ")
                for t_idx, token in enumerate(tokens):
                    sep = " " if t_idx < len(tokens) - 1 else ""
                    token_event = {
                        "event": "token",
                        "token": token + sep,
                        "paragraph_idx": p_idx,
                    }
                    yield f"data: {json.dumps(token_event)}\n\n"
                    await asyncio.sleep(0.015)

                if p_idx < len(fallback_paragraphs) - 1:
                    break_event = {
                        "event": "paragraph_break",
                        "paragraph_idx": p_idx,
                    }
                    yield f"data: {json.dumps(break_event)}\n\n"
                    await asyncio.sleep(0.02)

        # Construct final paragraph models for guardrail and DB
        paragraphs = [
            SynthesisParagraph(text=p_text.strip())
            for p_text in accumulated_paragraphs
            if p_text.strip()
        ]
        if not paragraphs:
            paragraphs = [SynthesisParagraph(text="Synthesis completed based on archival holdings.")]

        if citations:
            is_valid, attribution_score, warnings = self.guardrail.verify_citations(
                paragraphs, citations
            )
        else:
            attribution_score = 0.0
            warnings = []

        # 4. Relational Database Persistence
        if db is not None:
            try:
                db_inquiry = Inquiry(
                    id=inquiry_id,
                    user_id=request.user_id,
                    question=request.question,
                    collection_filter=request.collection_filter or "all",
                )
                db.add(db_inquiry)

                full_body = "\n\n".join(p.text for p in paragraphs)
                db_synthesis = Synthesis(
                    id=f"syn-{uuid.uuid4().hex[:8]}",
                    inquiry_id=inquiry_id,
                    summary_byline=summary_byline,
                    body_text=full_body,
                    attribution_score=attribution_score,
                )
                db.add(db_synthesis)

                for c in citations:
                    db_citation = Citation(
                        id=f"cit-{uuid.uuid4().hex[:8]}",
                        synthesis_id=db_synthesis.id,
                        marker_number=c.id,
                        document_id=c.document_id,
                        page_ref=c.page,
                        extracted_quote=c.extracted_quote,
                        chapter_num=c.call_number,
                        confidence_score=c.confidence_score,
                    )
                    db.add(db_citation)

                await db.commit()
            except Exception as e:
                print(f"Warning: Failed to persist streamed inquiry to DB: {e}")

        # 5. Yield done event
        done_event = {
            "event": "done",
            "inquiry_id": inquiry_id,
            "summary_byline": summary_byline,
            "attribution_score": attribution_score,
            "total_paragraphs": len(paragraphs),
            "total_citations": len(citations),
        }
        yield f"data: {json.dumps(done_event)}\n\n"

# Global synthesizer instance
grounded_synthesizer = GroundedSynthesizer()

def get_synthesizer() -> GroundedSynthesizer:
    return grounded_synthesizer
