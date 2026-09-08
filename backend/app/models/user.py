import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from ..database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True) # None for SSO logins
    affiliation = Column(String(255), nullable=True, default="University Scholar")
    role = Column(String(50), default="student") # student, researcher, faculty, librarian
    provider = Column(String(50), default="local") # local, google_scholar, orcid, institutional_sso
    created_at = Column(DateTime, default=datetime.utcnow)

    @property
    def initials(self) -> str:
        parts = self.name.strip().split()
        if not parts:
            return self.email[:2].upper()
        if len(parts) == 1:
            return parts[0][:2].upper()
        return (parts[0][0] + parts[-1][0]).upper()
