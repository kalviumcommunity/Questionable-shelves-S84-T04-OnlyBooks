from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from .config import settings
from .database import engine, Base, AsyncSessionLocal
from .models.user import User
from .utils.security import get_password_hash
from .routes import auth_router, catalog_router
from .seeds.catalog_seed import seed_initial_catalog

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Pre-seed demo users & library catalog if not present
    async with AsyncSessionLocal() as session:
        await seed_initial_catalog(session)

        result = await session.execute(select(User).where(User.email == "katherine@university.edu"))
        existing_demo = result.scalars().first()
        if not existing_demo:
            demo_student = User(
                name="Katherine Sharma",
                email="katherine@university.edu",
                hashed_password=get_password_hash("scholar2026"),
                affiliation="Dept. of Philosophy & Science",
                role="student",
                provider="local",
            )
            demo_librarian = User(
                name="Dr. Marcus Vance",
                email="vance@library.university.edu",
                hashed_password=get_password_hash("archive2026"),
                affiliation="University Library Rare Archives",
                role="librarian",
                provider="local",
            )
            session.add_all([demo_student, demo_librarian])
            await session.commit()
            
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="University Library Research Assistant & Citation Intelligence API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(catalog_router, prefix=settings.API_V1_STR)

@app.get("/api/health", tags=["Health"])
async def health():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
    }
