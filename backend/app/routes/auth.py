from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models.user import User
from ..schemas.auth import UserRegister, UserLogin, SSOLogin, TokenResponse, UserResponse
from ..utils.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
async def register(user_in: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check if user with this email already exists
    stmt = select(User).where(User.email == user_in.email.lower().strip())
    result = await db.execute(stmt)
    existing_user = result.scalars().first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )
    
    # Hash password and create user
    hashed_pwd = get_password_hash(user_in.password)
    user_role = user_in.role or ("faculty" if "faculty" in user_in.email.lower() else "student")
    new_user = User(
        name=user_in.name.strip(),
        email=user_in.email.lower().strip(),
        hashed_password=hashed_pwd,
        affiliation=user_in.affiliation or ("Faculty Research Fellow" if user_role == "faculty" else "University Scholar"),
        role=user_role,
        provider="local",
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    access_token = create_access_token(data={"sub": new_user.id, "email": new_user.email})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=new_user.id,
            name=new_user.name,
            initials=new_user.initials,
            email=new_user.email,
            affiliation=new_user.affiliation,
            role=new_user.role,
            provider=new_user.provider,
        ),
    )

@router.post("/login", response_model=TokenResponse)
async def login(user_in: UserLogin, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == user_in.email.lower().strip())
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={"sub": user.id, "email": user.email})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            name=user.name,
            initials=user.initials,
            email=user.email,
            affiliation=user.affiliation,
            role=user.role,
            provider=user.provider,
        ),
    )

@router.post("/sso", response_model=TokenResponse)
async def sso_login(sso_in: SSOLogin, db: AsyncSession = Depends(get_db)):
    email_clean = sso_in.email.lower().strip()
    stmt = select(User).where(User.email == email_clean)
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    # If user doesn't exist yet, auto-provision institutional user profile
    if not user:
        provider_name = sso_in.provider.replace("_", " ").title()
        default_name = sso_in.name or f"Researcher ({provider_name})"
        user = User(
            name=default_name,
            email=email_clean,
            hashed_password=None,
            affiliation=sso_in.affiliation or "Institutional Research Fellow",
            role="researcher",
            provider=sso_in.provider,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    access_token = create_access_token(data={"sub": user.id, "email": user.email})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            name=user.name,
            initials=user.initials,
            email=user.email,
            affiliation=user.affiliation,
            role=user.role,
            provider=user.provider,
        ),
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        initials=current_user.initials,
        email=current_user.email,
        affiliation=current_user.affiliation,
        role=current_user.role,
        provider=current_user.provider,
    )
