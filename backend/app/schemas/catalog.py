from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class CatalogMetricsResponse(BaseModel):
    total_documents: int
    total_papers: int
    total_theses: int
    total_reserves: int
    total_press: int
    last_sync: str

class DocumentSectionResponse(BaseModel):
    id: str
    chapter_num: str
    chapter_title: str
    start_page: int
    end_page: int
    content_text: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class DocumentSummaryResponse(BaseModel):
    id: str
    title: str
    author: str
    year: str
    field: str
    collection_id: str
    collection_name: Optional[str] = None
    call_number: str
    doi: Optional[str] = None
    journal_or_press: Optional[str] = None
    total_pages: int
    pages_label: str

    model_config = ConfigDict(from_attributes=True)

class DocumentDetailResponse(DocumentSummaryResponse):
    sections: List[DocumentSectionResponse] = []

class AcquisitionsResponse(BaseModel):
    items: List[DocumentSummaryResponse]
    total: int
    collection_filter: str

class SectionDepositInput(BaseModel):
    chapter_num: str
    chapter_title: str
    content_text: str
    start_page: Optional[int] = None
    end_page: Optional[int] = None

class DocumentDepositRequest(BaseModel):
    title: str
    author: str
    year: str
    field: str
    collection_id: str
    call_number: Optional[str] = None
    doi: Optional[str] = None
    journal_or_press: Optional[str] = None
    total_pages: Optional[int] = None
    content_text: Optional[str] = None
    sections: Optional[List[SectionDepositInput]] = None

class DocumentDepositResponse(BaseModel):
    document_id: str
    title: str
    author: str
    year: str
    collection_id: str
    collection_name: str
    call_number: str
    total_pages: int
    sections_count: int
    indexed: bool
    message: str

    model_config = ConfigDict(from_attributes=True)
