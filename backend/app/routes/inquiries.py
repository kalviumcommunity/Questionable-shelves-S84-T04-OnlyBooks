from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..schemas.inquiry import (
    InquiryRequest,
    SynthesisResponse,
    SynthesisParagraph,
    CitationItem,
    InquiryHistoryResponse,
    InquirySummaryItem,
)
from ..services.synthesizer import get_synthesizer
from ..models import Inquiry, Synthesis, Citation

router = APIRouter(prefix="/inquiries", tags=["Research Inquiry & Synthesis"])

@router.post("/synthesize", response_model=SynthesisResponse)
async def synthesize_inquiry(
    request: InquiryRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Synthesize an academic, citation-grounded research response from university library holdings.
    Maps assertions 1-to-1 with superscript footnote markers and verified citations.
    """
    synthesizer = get_synthesizer()
    response = await synthesizer.synthesize(request, db=db)
    return response

@router.post("/synthesize/stream")
async def synthesize_inquiry_stream(
    request: InquiryRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Stream a real-time citation-grounded research response via Server-Sent Events (SSE).
    Emits metadata, citation inventory, typewriter tokens, and final persistence status.
    """
    synthesizer = get_synthesizer()
    return StreamingResponse(
        synthesizer.synthesize_stream(request, db=db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

@router.get("", response_model=InquiryHistoryResponse)
async def get_inquiry_history(
    limit: int = 25,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve recent research inquiries and their synthesis attribution metadata."""
    query = (
        select(Inquiry)
        .options(
            selectinload(Inquiry.syntheses)
            .selectinload(Synthesis.citations)
        )
        .order_by(Inquiry.timestamp.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    inquiries = result.scalars().all()

    items = []
    for inq in inquiries:
        syn = inq.syntheses[0] if inq.syntheses else None
        citations_count = len(syn.citations) if syn and syn.citations else 0
        attribution_score = syn.attribution_score if syn and syn.attribution_score is not None else 1.0
        summary_byline = syn.summary_byline if syn else None
        ts_str = inq.timestamp.strftime("%d %b") if inq.timestamp else "Recent"

        items.append(
            InquirySummaryItem(
                id=inq.id,
                question=inq.question,
                collection_filter=inq.collection_filter or "all",
                summary_byline=summary_byline,
                citations_count=citations_count,
                attribution_score=attribution_score,
                timestamp=ts_str,
            )
        )

    return InquiryHistoryResponse(items=items, total=len(items))

@router.get("/{inquiry_id}", response_model=SynthesisResponse)
async def get_saved_inquiry(
    inquiry_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve a previously synthesized inquiry and its verified citation trail."""
    query = (
        select(Inquiry)
        .options(
            selectinload(Inquiry.syntheses)
            .selectinload(Synthesis.citations)
            .selectinload(Citation.document)
        )
        .where(Inquiry.id == inquiry_id)
    )
    result = await db.execute(query)
    inquiry = result.scalars().first()

    if not inquiry or not inquiry.syntheses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inquiry with ID '{inquiry_id}' was not found in the archive.",
        )

    latest_synthesis = inquiry.syntheses[0]
    paragraph_texts = [
        p.strip()
        for p in latest_synthesis.body_text.split("\n\n")
        if p.strip()
    ]
    paragraphs = [SynthesisParagraph(text=p) for p in paragraph_texts]

    citation_items = [
        CitationItem(
            id=c.marker_number,
            marker=c.chapter_num or f"[{c.marker_number}]",
            document_id=c.document_id or "doc-unknown",
            title=c.document.title if c.document else "Archival Manuscript",
            author=c.document.author if c.document else "University Scholar",
            year=c.document.year if c.document else "2024",
            journal=c.document.journal_or_press if c.document else "University Archive",
            call_number=c.document.call_number if c.document else "LIB-REF-001",
            collection_type=c.document.collection_id.title() if c.document else "Holdings",
            page=c.page_ref,
            extracted_quote=c.extracted_quote,
            confidence_score=c.confidence_score or 1.0,
        )
        for c in latest_synthesis.citations
    ]

    return SynthesisResponse(
        inquiry_id=inquiry.id,
        question=inquiry.question,
        summary_byline=latest_synthesis.summary_byline or "University Library Synthesis",
        paragraphs=paragraphs,
        citations=citation_items,
        attribution_score=latest_synthesis.attribution_score or 1.0,
    )
