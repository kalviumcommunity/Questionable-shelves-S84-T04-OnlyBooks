import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class Inquiry(Base):
    __tablename__ = "inquiries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    question = Column(Text, nullable=False)
    collection_filter = Column(String(50), default="all")
    timestamp = Column(DateTime, default=datetime.utcnow)

    syntheses = relationship("Synthesis", back_populates="inquiry", cascade="all, delete-orphan")
