import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(500), nullable=False, index=True)
    author = Column(String(500), nullable=False, index=True)
    year = Column(String(50), nullable=False)
    field = Column(String(255), nullable=False, index=True)
    collection_id = Column(String(50), ForeignKey("collections.id"), nullable=False, index=True)
    call_number = Column(String(100), unique=True, nullable=False, index=True)
    doi = Column(String(150), nullable=True)
    journal_or_press = Column(String(255), nullable=True)
    total_pages = Column(Integer, nullable=False, default=1)
    file_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    collection = relationship("Collection", back_populates="documents")
    sections = relationship("DocumentSection", back_populates="document", cascade="all, delete-orphan", order_by="DocumentSection.start_page")
    citations = relationship("Citation", back_populates="document")
