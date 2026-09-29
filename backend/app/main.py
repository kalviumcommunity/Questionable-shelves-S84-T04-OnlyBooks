from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from .config import settings
from .database import engine, Base, AsyncSessionLocal
from .models.user import User
from .utils.security import get_password_hash
from .routes import (
    auth_router,
    catalog_router,
    inquiries_router,
    reading_room_router,
)
from .seeds.catalog_seed import seed_initial_catalog
from .services import hybrid_retriever

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Pre-seed demo users, library catalog & index into hybrid retriever
    async with AsyncSessionLocal() as session:
        await seed_initial_catalog(session)
        await hybrid_retriever.index_from_database(session)

        # Seed or ensure student@university.edu with password demo123
        stu_res = await session.execute(select(User).where(User.email == "student@university.edu"))
        existing_stu = stu_res.scalars().first()
        if not existing_stu:
            demo_student_user = User(
                name="Demo Student",
                email="student@university.edu",
                hashed_password=get_password_hash("demo123"),
                affiliation="Undergraduate Scholar &middot; Academic Archive",
                role="student",
                provider="local",
            )
            session.add(demo_student_user)
            await session.commit()
        else:
            existing_stu.hashed_password = get_password_hash("demo123")
            existing_stu.role = "student"
            await session.commit()

        # Seed or ensure faculty@university.edu with password demo123
        fac_res = await session.execute(select(User).where(User.email == "faculty@university.edu"))
        existing_fac = fac_res.scalars().first()
        if not existing_fac:
            demo_faculty = User(
                name="Prof. Eleanor Vance",
                email="faculty@university.edu",
                hashed_password=get_password_hash("demo123"),
                affiliation="Faculty of Cognitive Science & Archive Fellow",
                role="faculty",
                provider="local",
            )
            session.add(demo_faculty)
            await session.commit()
        else:
            existing_fac.hashed_password = get_password_hash("demo123")
            existing_fac.role = "faculty"
            await session.commit()

        # Seed legacy demo student and librarian
        result = await session.execute(select(User).where(User.email == "katherine@university.edu"))
        existing_demo = result.scalars().first()
        if not existing_demo:
            demo_katherine = User(
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
            session.add_all([demo_katherine, demo_librarian])
            await session.commit()

        # Seed researcher@university.edu from documentation
        res_user = await session.execute(select(User).where(User.email == "researcher@university.edu"))
        existing_res = res_user.scalars().first()
        if not existing_res:
            demo_researcher = User(
                name="Dr. Julian Vance",
                email="researcher@university.edu",
                hashed_password=get_password_hash("LibraryPass2026!"),
                affiliation="Department of Epistemology & Theoretical Informatics",
                role="faculty",
                provider="local",
            )
            session.add(demo_researcher)
            await session.commit()
        else:
            existing_res.hashed_password = get_password_hash("LibraryPass2026!")
            await session.commit()
            
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="University Library Research Assistant & Citation Intelligence API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware - permits deployed and local web frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(catalog_router, prefix=settings.API_V1_STR)
app.include_router(inquiries_router, prefix=settings.API_V1_STR)
app.include_router(reading_room_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health"])
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
    }
