from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class ReadingRoomBlock(BaseModel):
    type: str  # "heading" | "paragraph" | "highlight" | "blockquote" | "rule"
    text: Optional[str] = None
    page_ref: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ReadingRoomSection(BaseModel):
    chapter_num: str
    chapter_title: str
    start_page: int
    end_page: int
    blocks: List[ReadingRoomBlock] = []

    model_config = ConfigDict(from_attributes=True)

class ReadingRoomResponse(BaseModel):
    document_id: str
    title: str
    author: str
    call_number: str
    collection_type: str
    total_pages: int
    active_page: int
    active_chapter: str
    sections: List[ReadingRoomSection]

    model_config = ConfigDict(from_attributes=True)

class RawPageResponse(BaseModel):
    document_id: str
    title: str
    page_number: int
    chapter_title: str
    text_content: str

    model_config = ConfigDict(from_attributes=True)
