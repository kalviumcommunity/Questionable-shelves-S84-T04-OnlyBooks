from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional

class InquiryRequest(BaseModel):
    question: str = Field(..., min_length=3, description="Scholarly research question")
    collection_filter: Optional[str] = Field(default="all", description="Collection filter: all, papers, theses, reserves, press")
    field_filter: Optional[str] = Field(default="all", description="Discipline/field filter: all, cs_ai, environmental, law, philosophy, economics, biomed, quantum")
    era_filter: Optional[str] = Field(default="all", description="Publication era filter: all, classic, modern, contemporary")
    user_id: Optional[str] = Field(default=None, description="Optional user ID for inquiry tracking")
    top_k: int = Field(default=4, ge=1, le=10, description="Number of source passages to retrieve")

class CitationItem(BaseModel):
    id: int
    marker: str  # Unicode superscript e.g. "¹", "²", "³"
    document_id: str
    title: str
    author: str
    year: str
    journal: Optional[str] = None
    call_number: str
    collection_type: str
    page: str
    extracted_quote: str
    confidence_score: float = 1.0

    model_config = ConfigDict(from_attributes=True)

class SynthesisParagraph(BaseModel):
    text: str

class RecommendedReadingItem(BaseModel):
    document_id: str
    title: str
    author: str
    year: str
    field: str
    collection_type: str
    call_number: str
    total_pages: int
    recommendation_reason: str
    category: Optional[str] = Field(default="Core Reserve", description="Core Reserve, Seminal Paper, or Interdisciplinary")

    model_config = ConfigDict(from_attributes=True)

class SynthesisResponse(BaseModel):
    inquiry_id: str
    question: str
    summary_byline: str
    paragraphs: List[SynthesisParagraph]
    citations: List[CitationItem]
    attribution_score: float = 1.0
    recommended_readings: Optional[List[RecommendedReadingItem]] = []

    model_config = ConfigDict(from_attributes=True)

class InquirySummaryItem(BaseModel):
    id: str
    question: str
    collection_filter: Optional[str] = "all"
    field_filter: Optional[str] = "all"
    era_filter: Optional[str] = "all"
    summary_byline: Optional[str] = None
    citations_count: int = 0
    attribution_score: float = 1.0
    timestamp: str

    model_config = ConfigDict(from_attributes=True)

class InquiryHistoryResponse(BaseModel):
    items: List[InquirySummaryItem]
    total: int
