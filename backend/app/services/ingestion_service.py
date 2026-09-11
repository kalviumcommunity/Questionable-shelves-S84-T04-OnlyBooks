import re
import random
import uuid
from typing import List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.document import Document
from ..models.document_section import DocumentSection
from ..models.collection import Collection
from ..schemas.catalog import DocumentDepositRequest, DocumentDepositResponse, SectionDepositInput
from .chunk_models import LibraryChunk
from . import hybrid_retriever

FIELD_DEPT_MAP = {
    "philosophy": "PHIL",
    "cognitive": "COG",
    "neuroscience": "NEUR",
    "law": "LAW",
    "constitutional": "LAW",
    "earth": "EARTH",
    "climate": "ENV",
    "history": "HIST",
    "computer": "CS",
    "artificial": "AI",
    "literature": "LIT",
    "economics": "ECON",
}

COLLECTION_NAME_MAP = {
    "papers": "Faculty Research",
    "theses": "Doctoral Thesis",
    "reserves": "Course Reserve",
    "press": "University Press",
}

class IngestionService:
    """Service handling manuscript ingestion, chapter parsing, and dynamic vector & lexical indexing."""

    @staticmethod
    def extract_dept_code(field: str) -> str:
        f_lower = field.lower()
        for key, code in FIELD_DEPT_MAP.items():
            if key in f_lower:
                return code
        return "RES"

    @classmethod
    def generate_call_number(cls, collection_id: str, field: str, year: str) -> str:
        dept = cls.extract_dept_code(field)
        suffix = random.randint(100, 999)
        clean_year = re.sub(r"\D", "", year) or "2026"
        clean_year = clean_year[:4]

        if collection_id == "papers":
            return f"FAC-{clean_year}-{dept}-{suffix}"
        elif collection_id == "theses":
            return f"THES-{clean_year}-{dept}-{suffix}"
        elif collection_id == "reserves":
            return f"CR-{dept}-{suffix}"
        else:
            return f"UP-{clean_year}-{dept}-{suffix}"

    @classmethod
    def parse_manuscript_sections(cls, content_text: str, default_title: str) -> List[SectionDepositInput]:
        """
        Parses raw text into academic chapters based on headings:
        e.g. 'Chapter 1: ...', 'Chapter I: ...', '## Chapter ...', or '# Section ...'
        """
        clean_text = content_text.strip()
        if not clean_text:
            return [
                SectionDepositInput(
                    chapter_num="I",
                    chapter_title=f"Theoretical Framework: {default_title}",
                    content_text=f"Archival deposit text for {default_title}.",
                    start_page=1,
                    end_page=15,
                )
            ]

        # Pattern to detect chapter headers
        pattern = re.compile(
            r"(?:^|\n)(?:#+\s*)?(?:Chapter|Section|Part)\s+([0-9IVXLCDM]+)[:\.\-—\s]*(.*?)(?=\n|$)",
            re.IGNORECASE,
        )

        matches = list(pattern.finditer(clean_text))
        if not matches:
            # Single section fallback
            word_count = len(clean_text.split())
            page_count = max(1, (word_count // 250) + 1)
            return [
                SectionDepositInput(
                    chapter_num="I",
                    chapter_title=f"Core Manuscript: {default_title}",
                    content_text=clean_text,
                    start_page=1,
                    end_page=page_count,
                )
            ]

        sections: List[SectionDepositInput] = []
        current_page = 1

        for i, match in enumerate(matches):
            chapter_num = match.group(1).strip()
            chapter_title = match.group(2).strip() or f"Section {chapter_num}"
            
            start_pos = match.end()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(clean_text)
            body = clean_text[start_pos:end_pos].strip()

            words = len(body.split())
            section_pages = max(1, (words // 250) + 1)

            sections.append(
                SectionDepositInput(
                    chapter_num=chapter_num,
                    chapter_title=chapter_title,
                    content_text=body if body else f"Excerpts from Chapter {chapter_num}.",
                    start_page=current_page,
                    end_page=current_page + section_pages - 1,
                )
            )
            current_page += section_pages

        return sections

    @classmethod
    async def deposit(
        cls,
        db: AsyncSession,
        request: DocumentDepositRequest,
    ) -> DocumentDepositResponse:
        """Persist document, create sections, and index into the live hybrid retriever."""
        # 1. Verify collection
        coll_stmt = select(Collection).where(Collection.id == request.collection_id)
        coll_res = await db.execute(coll_stmt)
        collection = coll_res.scalars().first()
        if not collection:
            # Fallback collection
            collection_id = "papers"
            collection_name = COLLECTION_NAME_MAP.get(request.collection_id, "Faculty Research")
        else:
            collection_id = collection.id
            collection_name = collection.name

        # 2. Determine call number
        call_num = request.call_number.strip() if request.call_number and request.call_number.strip() else (
            cls.generate_call_number(collection_id, request.field, request.year)
        )

        # Ensure call number uniqueness
        existing_doc_stmt = select(Document).where(Document.call_number == call_num)
        existing_res = await db.execute(existing_doc_stmt)
        if existing_res.scalars().first():
            call_num = f"{call_num}-{random.randint(10, 99)}"

        # 3. Resolve sections
        sections_data: List[SectionDepositInput] = []
        if request.sections and len(request.sections) > 0:
            current_p = 1
            for s in request.sections:
                s_pages = max(1, (len(s.content_text.split()) // 250) + 1)
                start_p = s.start_page if s.start_page else current_p
                end_p = s.end_page if s.end_page else (start_p + s_pages - 1)
                current_p = end_p + 1
                sections_data.append(
                    SectionDepositInput(
                        chapter_num=s.chapter_num,
                        chapter_title=s.chapter_title,
                        content_text=s.content_text,
                        start_page=start_p,
                        end_page=end_p,
                    )
                )
        elif request.content_text and request.content_text.strip():
            sections_data = cls.parse_manuscript_sections(request.content_text, request.title)
        else:
            sections_data = [
                SectionDepositInput(
                    chapter_num="I",
                    chapter_title=f"Theoretical Foundations of {request.title}",
                    content_text=(
                        f"This manuscript, authored by {request.author} in {request.year}, "
                        f"investigates key methodologies in {request.field}. "
                        "Academic consensus is established through reproducible empirical trials."
                    ),
                    start_page=1,
                    end_page=18,
                )
            ]

        total_pages = request.total_pages or (
            sections_data[-1].end_page if sections_data else 25
        )

        # 4. Create Document
        doc = Document(
            id=f"doc-dep-{uuid.uuid4().hex[:8]}",
            title=request.title.strip(),
            author=request.author.strip(),
            year=request.year.strip(),
            field=request.field.strip(),
            collection_id=collection_id,
            call_number=call_num,
            doi=request.doi.strip() if request.doi else None,
            journal_or_press=request.journal_or_press.strip() if request.journal_or_press else collection_name,
            total_pages=total_pages,
            file_path=None,
        )
        db.add(doc)
        await db.flush()

        # 5. Create DocumentSection entities
        new_chunks: List[LibraryChunk] = []
        for s in sections_data:
            sec_id = f"sec-{uuid.uuid4().hex[:8]}"
            db_sec = DocumentSection(
                id=sec_id,
                document_id=doc.id,
                chapter_num=s.chapter_num,
                chapter_title=s.chapter_title,
                start_page=s.start_page or 1,
                end_page=s.end_page or (s.start_page or 1) + 5,
                content_text=s.content_text,
            )
            db.add(db_sec)

            chunk = LibraryChunk(
                chunk_id=f"{doc.id}_{sec_id}",
                document_id=doc.id,
                title=doc.title,
                author=doc.author,
                year=doc.year,
                collection_id=doc.collection_id,
                call_number=doc.call_number,
                page_number=s.start_page or 1,
                chapter_num=s.chapter_num,
                chapter_title=s.chapter_title,
                text_content=s.content_text,
            )
            new_chunks.append(chunk)

        await db.commit()
        await db.refresh(doc)

        # 6. Dynamically index into HybridRetriever (Dense + BM25)
        hybrid_retriever.add_chunks(new_chunks)

        return DocumentDepositResponse(
            document_id=doc.id,
            title=doc.title,
            author=doc.author,
            year=doc.year,
            collection_id=doc.collection_id,
            collection_name=collection_name,
            call_number=doc.call_number,
            total_pages=doc.total_pages,
            sections_count=len(sections_data),
            indexed=True,
            message=f"Successfully deposited and dynamically indexed into the {collection_name} archive.",
        )
