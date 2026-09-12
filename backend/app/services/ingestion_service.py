import re
import io
import random
import uuid
from typing import List, Tuple, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

try:
    import pypdf
except ImportError:
    pypdf = None

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

    @classmethod
    def extract_file_content(
        cls,
        file_bytes: bytes,
        filename: str,
        default_title: Optional[str] = None,
    ) -> Tuple[str, List[SectionDepositInput], Dict[str, Any]]:
        """
        Extract textual content, page-level sections, and metadata from uploaded files (.pdf, .txt, .md).
        """
        lower_name = filename.lower()
        metadata: Dict[str, Any] = {}
        fallback_title = default_title or re.sub(r"[\-_]", " ", lower_name.rsplit(".", 1)[0]).title()

        if lower_name.endswith(".pdf") and pypdf is not None:
            try:
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                total_pages = len(reader.pages)

                # Extract PDF metadata if present
                if reader.metadata:
                    if reader.metadata.title:
                        metadata["title"] = str(reader.metadata.title).strip()
                    if reader.metadata.author:
                        metadata["author"] = str(reader.metadata.author).strip()
                    if reader.metadata.subject:
                        metadata["field"] = str(reader.metadata.subject).strip()

                page_texts: List[Tuple[int, str]] = []
                full_text_parts: List[str] = []

                for page_idx, page in enumerate(reader.pages, start=1):
                    t = page.extract_text() or ""
                    clean_t = t.strip()
                    if clean_t:
                        page_texts.append((page_idx, clean_t))
                        full_text_parts.append(clean_t)

                full_text = "\n\n".join(full_text_parts)

                # Chapter pattern across pages
                pattern = re.compile(
                    r"(?:^|\n)(?:#+\s*)?(?:Chapter|Section|Part)\s+([0-9IVXLCDM]+)[:\.\-—\s]*(.*?)(?=\n|$)",
                    re.IGNORECASE,
                )

                sections: List[SectionDepositInput] = []
                current_chapter_num = "1"
                current_chapter_title = f"Archival Section 1: {fallback_title}"
                current_start_page = 1
                current_texts: List[str] = []

                for page_num, text in page_texts:
                    match = pattern.search(text)
                    if match and current_texts:
                        sections.append(
                            SectionDepositInput(
                                chapter_num=current_chapter_num,
                                chapter_title=current_chapter_title,
                                content_text="\n\n".join(current_texts),
                                start_page=current_start_page,
                                end_page=max(current_start_page, page_num - 1),
                            )
                        )
                        current_chapter_num = match.group(1).strip()
                        current_chapter_title = match.group(2).strip() or f"Section {current_chapter_num}"
                        current_start_page = page_num
                        current_texts = [text]
                    else:
                        if match and not current_texts:
                            current_chapter_num = match.group(1).strip()
                            current_chapter_title = match.group(2).strip() or f"Section {current_chapter_num}"
                            current_start_page = page_num
                        current_texts.append(text)

                if current_texts:
                    last_page = page_texts[-1][0] if page_texts else total_pages
                    sections.append(
                        SectionDepositInput(
                            chapter_num=current_chapter_num,
                            chapter_title=current_chapter_title,
                            content_text="\n\n".join(current_texts),
                            start_page=current_start_page,
                            end_page=max(current_start_page, last_page),
                        )
                    )

                if not sections:
                    sections = [
                        SectionDepositInput(
                            chapter_num="1",
                            chapter_title=f"Core Manuscript: {fallback_title}",
                            content_text=full_text if full_text else f"Uploaded archival manuscript: {fallback_title}",
                            start_page=1,
                            end_page=max(1, total_pages),
                        )
                    ]

                return full_text, sections, metadata
            except Exception as e:
                print(f"Warning: PDF extraction error: {e}")

        # Plain text / Markdown / Fallback
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = file_bytes.decode("latin-1")
            except Exception:
                text = file_bytes.decode("utf-8", errors="replace")

        sections = cls.parse_manuscript_sections(text, fallback_title)
        return text, sections, metadata

    @classmethod
    async def ingest_file(
        cls,
        db: AsyncSession,
        file_bytes: bytes,
        filename: str,
        title: Optional[str] = None,
        author: Optional[str] = None,
        year: Optional[str] = None,
        field: Optional[str] = None,
        collection_id: Optional[str] = None,
        call_number: Optional[str] = None,
        doi: Optional[str] = None,
        journal_or_press: Optional[str] = None,
    ) -> DocumentDepositResponse:
        """Process an uploaded academic file and deposit it into the catalog and hybrid retriever."""
        full_text, sections, meta = cls.extract_file_content(file_bytes, filename, default_title=title)

        resolved_title = title.strip() if title and title.strip() else meta.get("title")
        if not resolved_title:
            base_name = filename.rsplit(".", 1)[0]
            resolved_title = re.sub(r"[\-_]", " ", base_name).strip().title()

        resolved_author = author.strip() if author and author.strip() else meta.get("author", "University Scholar")
        resolved_year = year.strip() if year and year.strip() else "2026"
        resolved_field = field.strip() if field and field.strip() else meta.get("field", "University Library Archive")
        resolved_collection = collection_id.strip() if collection_id and collection_id.strip() else "papers"

        total_pages = sections[-1].end_page if sections else 1

        request = DocumentDepositRequest(
            title=resolved_title,
            author=resolved_author,
            year=resolved_year,
            field=resolved_field,
            collection_id=resolved_collection,
            call_number=call_number.strip() if call_number and call_number.strip() else None,
            doi=doi.strip() if doi and doi.strip() else None,
            journal_or_press=journal_or_press.strip() if journal_or_press and journal_or_press.strip() else None,
            total_pages=total_pages,
            sections=sections,
        )

        return await cls.deposit(db, request)
