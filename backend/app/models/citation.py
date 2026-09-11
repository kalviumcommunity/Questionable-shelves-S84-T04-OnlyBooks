import uuid
from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class Citation(Base):
    __tablename__ = "citations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    synthesis_id = Column(String(36), ForeignKey("syntheses.id", ondelete="CASCADE"), nullable=False, index=True)
    marker_number = Column(Integer, nullable=False)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=True)
    page_ref = Column(String(50), nullable=False)
    extracted_quote = Column(Text, nullable=False)
    chapter_num = Column(String(50), nullable=True)
    confidence_score = Column(Float, default=1.0)

    synthesis = relationship("Synthesis", back_populates="citations")
    document = relationship("Document", back_populates="citations")
