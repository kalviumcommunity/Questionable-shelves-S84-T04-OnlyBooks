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
