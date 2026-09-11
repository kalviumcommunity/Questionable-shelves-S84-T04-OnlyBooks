import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base

class DocumentSection(Base):
    __tablename__ = "document_sections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chapter_num = Column(String(50), nullable=False)
    chapter_title = Column(String(500), nullable=False)
    start_page = Column(Integer, nullable=False)
    end_page = Column(Integer, nullable=False)
    content_text = Column(Text, nullable=True)

    document = relationship("Document", back_populates="sections")
