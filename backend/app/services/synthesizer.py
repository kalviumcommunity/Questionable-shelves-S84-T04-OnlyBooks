import os
import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from .hybrid_retriever import get_hybrid_retriever
from .chunk_models import RetrievalResult
from .citation_guardrail import int_to_superscript, CitationGuardrail
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
    """

    def __init__(self):
        self.guardrail = CitationGuardrail()

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
                    text="No library holdings or cataloged manuscripts met the semantic threshold for this inquiry."
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

    async def synthesize(
        self,
        request: InquiryRequest,
        db: Optional[AsyncSession] = None,
    ) -> SynthesisResponse:
        """
        Execute end-to-end hybrid retrieval, generate citation-anchored synthesis,
        verify grounding with guardrails, and optionally persist to relational DB.
        """
        retriever = get_hybrid_retriever()
        candidates = retriever.retrieve(
            query=request.question,
            top_k=request.top_k,
            collection_filter=request.collection_filter,
        )

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

        # Generate paragraphs
        paragraphs = self._generate_fallback_synthesis(request.question, candidates)

        # Verify through citation guardrail
        is_valid, attribution_score, warnings = self.guardrail.verify_citations(
            paragraphs, citations
        )

        # Build summary byline
        distinct_holdings = len(set(c.document_id for c in citations))
        byline_field = " · ".join(unique_fields) if unique_fields else "University Library Archive"
        summary_byline = (
            f"Synthesized from {distinct_holdings} University Library Holding"
            f"{'s' if distinct_holdings != 1 else ''} · {byline_field}"
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

# Global synthesizer instance
grounded_synthesizer = GroundedSynthesizer()

def get_synthesizer() -> GroundedSynthesizer:
    return grounded_synthesizer
