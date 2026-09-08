from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    affiliation: Optional[str] = "University Scholar"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class SSOLogin(BaseModel):
    provider: str # google_scholar, orcid, institutional_sso
    email: EmailStr
    name: Optional[str] = None
    affiliation: Optional[str] = "University Scholar"

class UserResponse(BaseModel):
    id: str
    name: str
    initials: str
    email: str
    affiliation: Optional[str] = "University Scholar"
    role: str = "student"
    provider: str = "local"

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
