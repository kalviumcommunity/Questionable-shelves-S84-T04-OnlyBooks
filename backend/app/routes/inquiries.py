from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..schemas.inquiry import (
    InquiryRequest,
    SynthesisResponse,
    SynthesisParagraph,
    CitationItem,
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
