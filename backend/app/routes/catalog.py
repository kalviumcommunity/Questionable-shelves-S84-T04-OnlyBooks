from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import Optional

from ..database import get_db
from ..models.collection import Collection
from ..models.document import Document
from ..models.document_section import DocumentSection
from ..schemas.catalog import (
    CatalogMetricsResponse,
    DocumentSummaryResponse,
    DocumentDetailResponse,
    DocumentSectionResponse,
    AcquisitionsResponse,
)

router = APIRouter(prefix="/catalog", tags=["Library Catalog"])

@router.get("/metrics", response_model=CatalogMetricsResponse)
async def get_catalog_metrics(db: AsyncSession = Depends(get_db)):
    """Return aggregated holdings metrics across all library collections."""
    # Total count
    total_stmt = select(func.count(Document.id))
    total_result = await db.execute(total_stmt)
    total_docs = total_result.scalar_one_or_none() or 0

    # Count by collection
    collection_stmt = select(Document.collection_id, func.count(Document.id)).group_by(Document.collection_id)
    coll_results = await db.execute(collection_stmt)
    counts = dict(coll_results.all())

    return CatalogMetricsResponse(
        total_documents=total_docs,
        total_papers=counts.get("papers", 0),
        total_theses=counts.get("theses", 0),
        total_reserves=counts.get("reserves", 0),
        total_press=counts.get("press", 0),
        last_sync="Active Sync · Fall Term 2026",
    )

@router.get("/acquisitions", response_model=AcquisitionsResponse)
async def get_acquisitions(
    collection: Optional[str] = Query(default="all", description="Collection filter: all, papers, theses, reserves, press"),
    search: Optional[str] = Query(default=None, description="Search keyword in title, author, field, or call number"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve catalog acquisitions with collection filtering, search, and pagination."""
    query = select(Document, Collection.name.label("collection_name")).join(
        Collection, Document.collection_id == Collection.id, isouter=True
    )

    if collection and collection.lower() != "all":
        query = query.where(Document.collection_id == collection.lower().strip())

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Document.title.ilike(term),
                Document.author.ilike(term),
                Document.field.ilike(term),
                Document.call_number.ilike(term),
            )
        )

    # Count total matching
    count_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_query)
    total = total_res.scalar_one_or_none() or 0

    # Paginate and order by created_at descending
    query = query.order_by(Document.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    rows = result.all()

    items = []
    for doc, coll_name in rows:
        items.append(
            DocumentSummaryResponse(
                id=doc.id,
                title=doc.title,
                author=doc.author,
                year=doc.year,
                field=doc.field,
                collection_id=doc.collection_id,
                collection_name=coll_name or doc.collection_id.title(),
                call_number=doc.call_number,
                doi=doc.doi,
                journal_or_press=doc.journal_or_press,
                total_pages=doc.total_pages,
                pages_label=f"{doc.total_pages} pp.",
            )
        )

    return AcquisitionsResponse(
        items=items,
        total=total,
        collection_filter=collection or "all",
    )

@router.get("/documents/{doc_id}", response_model=DocumentDetailResponse)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve complete metadata and chapter sections for a specific library document."""
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

    sections = [
        DocumentSectionResponse(
            id=s.id,
            chapter_num=s.chapter_num,
            chapter_title=s.chapter_title,
            start_page=s.start_page,
            end_page=s.end_page,
            content_text=s.content_text,
        )
        for s in doc.sections
    ]

    coll_name = doc.collection.name if doc.collection else doc.collection_id.title()

    return DocumentDetailResponse(
        id=doc.id,
        title=doc.title,
        author=doc.author,
        year=doc.year,
        field=doc.field,
        collection_id=doc.collection_id,
        collection_name=coll_name,
        call_number=doc.call_number,
        doi=doc.doi,
        journal_or_press=doc.journal_or_press,
        total_pages=doc.total_pages,
        pages_label=f"{doc.total_pages} pp.",
        sections=sections,
    )
