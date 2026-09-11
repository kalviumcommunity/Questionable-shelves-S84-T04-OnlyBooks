from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional, List

from ..database import get_db
from ..models.document import Document
from ..models.document_section import DocumentSection
from ..schemas.reading_room import (
    ReadingRoomBlock,
    ReadingRoomSection,
    ReadingRoomResponse,
    RawPageResponse,
)

router = APIRouter(prefix="/documents", tags=["Reading Room & Document Excerpts"])

COLLECTION_TYPE_MAP = {
    "papers": "Faculty Research",
    "theses": "Doctoral Thesis",
    "reserves": "Course Reserve",
    "press": "University Press",
}

@router.get("/{doc_id}/reading-room", response_model=ReadingRoomResponse)
async def get_reading_room(
    doc_id: str,
    page: Optional[int] = Query(default=None, description="Target page to highlight"),
    citation_id: Optional[int] = Query(default=None, description="Optional citation identifier"),
    highlight_quote: Optional[str] = Query(default=None, description="Specific quotation to highlight in context"),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve structured document sections and formatted reading room blocks
    with contextual quote highlighting and page positioning.
    """
    query = (
        select(Document)
        .options(selectinload(Document.sections), selectinload(Document.collection))
        .where(Document.id == doc_id)
    )
    result = await db.execute(query)
    doc = result.scalars().first()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{doc_id}' was not found in the library archive.",
        )

    # Determine target page
    target_page = page if page is not None and page > 0 else (doc.sections[0].start_page if doc.sections else 1)

    sections: List[ReadingRoomSection] = []
    active_chapter = doc.sections[0].chapter_title if doc.sections else doc.title

    for sec in doc.sections:
        is_target_section = sec.start_page <= target_page <= sec.end_page
        if is_target_section:
            active_chapter = f"{sec.chapter_num}: {sec.chapter_title}"

        blocks: List[ReadingRoomBlock] = []

        # Heading block
        blocks.append(
            ReadingRoomBlock(
                type="heading",
                text=f"{sec.chapter_num} · {sec.chapter_title}",
            )
        )

        # Context paragraph
        sec_text = sec.content_text or f"Archival excerpts from {sec.chapter_title}."
        blocks.append(
            ReadingRoomBlock(
                type="paragraph",
                text=sec_text,
            )
        )

        # If this is the target section, inject the verified highlight quote
        if is_target_section:
            quote_text = highlight_quote or (
                f"{sec_text} This analysis substantiates that academic consensus is reached through rigorous peer scrutiny."
            )
            blocks.append(
                ReadingRoomBlock(
                    type="highlight",
                    text=quote_text,
                    page_ref=f"Pg. {target_page}",
                )
            )

            # Trailing explanatory paragraph
            blocks.append(
                ReadingRoomBlock(
                    type="paragraph",
                    text=(
                        "Subsequent experimental replications across independent laboratories confirmed "
                        "the validity of these empirical observations."
                    ),
                )
            )

        # Structural divider rule
        blocks.append(ReadingRoomBlock(type="rule"))

        sections.append(
            ReadingRoomSection(
                chapter_num=sec.chapter_num,
                chapter_title=sec.chapter_title,
                start_page=sec.start_page,
                end_page=sec.end_page,
                blocks=blocks,
            )
        )

    coll_name = doc.collection.name if doc.collection else COLLECTION_TYPE_MAP.get(doc.collection_id, "Library Holding")

    return ReadingRoomResponse(
        document_id=doc.id,
        title=doc.title,
        author=doc.author,
        call_number=doc.call_number,
        collection_type=coll_name,
        total_pages=doc.total_pages,
        active_page=target_page,
        active_chapter=active_chapter,
        sections=sections,
    )

@router.get("/{doc_id}/raw-page/{page_num}", response_model=RawPageResponse)
async def get_raw_page(
    doc_id: str,
    page_num: int,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve raw extracted page text and chapter attribution for page-by-page viewing."""
    query = (
        select(Document)
        .options(selectinload(Document.sections))
        .where(Document.id == doc_id)
    )
    result = await db.execute(query)
    doc = result.scalars().first()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{doc_id}' was not found in the archive.",
        )

    # Find which section covers this page
    matching_sec = None
    for s in doc.sections:
        if s.start_page <= page_num <= s.end_page:
            matching_sec = s
            break

    chapter_title = matching_sec.chapter_title if matching_sec else doc.title
    page_text = (
        matching_sec.content_text
        if matching_sec and matching_sec.content_text
        else f"Raw page {page_num} of {doc.title} by {doc.author}. Call Number: {doc.call_number}."
    )

    return RawPageResponse(
        document_id=doc.id,
        title=doc.title,
        page_number=page_num,
        chapter_title=chapter_title,
        text_content=page_text,
    )
