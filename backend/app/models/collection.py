from sqlalchemy import Column, String, Text
from sqlalchemy.orm import relationship
from ..database import Base

class Collection(Base):
    __tablename__ = "collections"

    id = Column(String(50), primary_key=True)  # e.g. 'papers', 'theses', 'reserves', 'press'
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    documents = relationship("Document", back_populates="collection", cascade="all, delete-orphan")
