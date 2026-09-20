from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class LibraryChunk(BaseModel):
    chunk_id: str
    document_id: str
    title: str
    author: str
    year: str
    collection_id: str
    call_number: str
    page_number: int
    chapter_num: str
    chapter_title: str
    text_content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

class RetrievalResult(BaseModel):
    chunk: LibraryChunk
    dense_score: float = 0.0
    bm25_score: float = 0.0
    rrf_score: float = 0.0
    rerank_score: float = 0.0
    rank: int = 0
