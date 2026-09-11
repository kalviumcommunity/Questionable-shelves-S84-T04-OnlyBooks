import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class Synthesis(Base):
    __tablename__ = "syntheses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    inquiry_id = Column(String(36), ForeignKey("inquiries.id", ondelete="CASCADE"), nullable=False, index=True)
    summary_byline = Column(String(255), nullable=True)
    body_text = Column(Text, nullable=False)
    attribution_score = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    inquiry = relationship("Inquiry", back_populates="syntheses")
    citations = relationship("Citation", back_populates="synthesis", cascade="all, delete-orphan", order_by="Citation.marker_number")
