# OnlyBooks · University Library Archive & Citation-Backed RAG Platform

> **A citation-backed academic research platform** pairing scholarly library holdings with real-time hybrid vector-lexical retrieval, citation guardrails, multi-dimensional search filtering, categorized pedagogical recommendations, dynamic chapter ingestion, and an interactive digital reading room.

---

## 🏛️ System Overview

**OnlyBooks** is designed for university researchers, faculty, and students who require concise, factual research synthesis backed by verifiable library holdings. Rather than scrolling through dozens of disconnected documents or risking LLM hallucinations, OnlyBooks guarantees:

1. **30 Authentic Academic Holdings & 79 Indexed Sections**: Spanning Quantum Computing, Molecular Biology (CRISPR), Behavioral Game Theory, AI Value Alignment, Epidemiology, Philosophy of Science, and Planetary Boundaries.
2. **Hybrid Retrieval (Dense + BM25 + RRF)**: Simultaneously evaluates sublinear TF-IDF / dense embeddings and Porter-stemmed BM25 lexical token matches across catalog holdings, combining ranks via Reciprocal Rank Fusion ($k=60$).
3. **Multi-Dimensional Search & Analysis Filters**: Filter by collection tier (Faculty Research, Doctoral Theses, Course Reserves), academic discipline (AI & Computing, Quantum Info, Genomics, Food & Climate, Economics & Games, Law & Society, Philosophy), and publication era (Classics, Modern, Contemporary).
4. **Three-Stream Pedagogical Recommendations**: Classifies follow-up reading into **📚 Course Reserves** (syllabus coursework), **🏛️ Seminal Foundations** (breakthrough faculty research), and **🌐 Interdisciplinary Bridges** (cross-field synthesis).
5. **Strict Grounded Citation Guardrails**: Factual claims in the synthesis are mapped 1-to-1 to exact page excerpts and anchored using Unicode superscript markers (`¹`, `²`, `³`).
6. **Real-Time Token Streaming via SSE**: Server-Sent Events deliver incremental synthesis tokens, instantaneous bibliography generation, and typewriter streaming cadence with Gemini 1.5 fallback.
7. **Digital Reading Room**: Clicking any citation superscript or bibliography card transports the researcher into the archival manuscript, automatically navigating to the referenced page and dynamically highlighting the exact extracted quote.
8. **Archival Deposit & Dynamic Ingestion Pipeline**: Faculty and researchers can deposit new manuscripts with multi-chapter text or uploaded PDFs. The system extracts chapters, calculates pagination, assigns institutional call numbers, and dynamically updates dense vector and BM25 indices without server restarts.
9. **Role-Based Portals & Dashboards**: Dedicated Faculty Dashboard (manuscript deposits, citation analytics) and Student Dashboard (unified glass filter console, reactive syllabus inquiry cards, course reserves).
10. **Dual Database Architecture**: SQLite for lightweight zero-dependency local development and Neon PostgreSQL (`asyncpg`) for production serverless deployments.

---

## 🏗️ Architecture & Technology Stack

```
Questionable-shelves-S84-T04-OnlyBooks/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entrypoint & middleware
│   │   ├── config.py                # Pydantic environment configuration (SQLite / Neon PostgreSQL)
│   │   ├── database.py              # Async SQLAlchemy engine (aiosqlite & asyncpg support)
│   │   ├── models/                  # Relational models (User, Document, Section, Inquiry, Synthesis, Citation)
│   │   ├── schemas/                 # Pydantic request/response validation schemas
│   │   ├── routes/                  # Modular APIRouters (auth, catalog, inquiries, reading_room)
│   │   ├── services/
│   │   │   ├── dense_indexer.py     # Sublinear vectorizer with discipline/era metadata filtering
│   │   │   ├── bm25_indexer.py      # BM25Okapi lexical retrieval with metadata filtering
│   │   │   ├── hybrid_retriever.py  # Reciprocal Rank Fusion (RRF) & multi-source ranking
│   │   │   ├── citation_guardrail.py# Verification of inline markers & quote overlaps
│   │   │   ├── synthesizer.py       # Grounded synthesis engine, Gemini integration & categorized recommendations
│   │   │   ├── email_service.py     # Resend HTTP API & SMTP email OTP dispatcher
│   │   │   └── ingestion_service.py # Chapter regex parser, page estimator & dynamic indexer
│   │   └── seeds/                   # Catalog seed data with 30 authentic university holdings
│   └── tests/                       # Pytest test suite (33 test suites, 100% passing)
├── frontend/
│   ├── src/
│   │   ├── views/
│   │   │   ├── AuthPage.tsx         # Institutional sign-in & registration with OTP verification
│   │   │   ├── ResearchPortal.tsx   # Catalog shell with role-based routing (Faculty vs. Student)
│   │   │   ├── SynthesisView.tsx    # RAG synthesis with live SSE streaming & categorized recommendation tabs
│   │   │   └── ReadingRoom.tsx      # Archival reader with page turns and quote highlighting
│   │   ├── components/
│   │   │   ├── dashboards/
│   │   │   │   ├── StudentDashboard.tsx # Unified glass filter console & frosted suggestion cards
│   │   │   │   └── FacultyDashboard.tsx # Deposit overview, citation breakdown & student trail monitoring
│   │   │   ├── DepositModal.tsx     # Manuscript deposit modal with quick-fill presets
│   │   │   ├── SettingsModal.tsx    # Institutional profile & notification preferences
│   │   │   ├── AvatarModal.tsx      # Live webcam avatar capture & cropping
│   │   │   └── NotificationPopover.tsx # Real-time notification drawer
│   │   ├── services/
│   │   │   └── api.ts               # Typed API client with SSE fetch streaming & JWT management
│   │   └── index.css                # Obsidian glassmorphic design tokens & light/dark bubble themes
│   ├── netlify.toml                 # Netlify deployment configuration
│   └── vite.config.ts               # Vite bundler configuration
├── render.yaml                      # Render cloud deployment blueprint
├── start.bat                        # Windows 1-click batch launcher
├── start.ps1                        # PowerShell unified launcher with health check
└── README.md
```

---

## 🚀 Quick Start Guide

### Option A: 1-Click Launchers (Windows)

#### Using Batch File:
Double-click `start.bat` in the project root directory, or run from command prompt:
```cmd
start.bat
```

#### Using PowerShell:
Run `start.ps1` in PowerShell:
```powershell
.\start.ps1
```
The script will automatically start the backend API on port `8000`, launch the frontend dev server on port `5173`, wait for the backend health check to pass, and display access links.

---

### Option B: Docker Containerized Orchestration (Production Ready)

Run the entire platform (FastAPI backend + React frontend + persistent volume) with a single command:
```bash
docker compose up --build
```

- **Frontend Portal**: [http://localhost:5173](http://localhost:5173)
- **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Persistent Volume**: Relational catalog and vector data are safely preserved in `onlybooks_data`.

---

### Option C: Manual Startup

#### 1. Backend Setup & Run
```bash
cd backend
copy .env.example .env        # Optionally add GEMINI_API_KEY and RESEND_API_KEY
python -m venv venv
.\venv\Scripts\activate          # On Windows (or 'source venv/bin/activate' on Unix)
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000 --host 127.0.0.1
```
- API Health: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- OpenAPI Swagger Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

#### 2. Frontend Setup & Run
```bash
cd frontend
pnpm install                     # or 'npm install'
pnpm run dev                     # or 'npm run dev'
```
- Web Application: [http://localhost:5173](http://localhost:5173)

---

## 🧪 Automated Testing

### Backend Unit & Integration Tests (33 tests, 100% passing)
The backend test suite verifies database transactions, hybrid retrieval with metadata filtering, manuscript deposit, zero-restart re-indexing, SSE streaming, Gemini synthesis integration, and citation guardrails:
```bash
cd backend
.\venv\Scripts\python -m pytest tests -v
```
All 33 tests execute in under 10 seconds with 100% passing status.

### Frontend Typecheck & Production Build
```bash
cd frontend
pnpm run build
```
Builds cleanly with zero TypeScript errors or bundling warnings.

---

## 🔑 Key Features Walkthrough

### 1. Unified Glass Filter Console & Dynamic Inquiry Cards
- **Segmented Collection Switcher**: Quick toggle across **All Collections**, **Faculty Research**, **Doctoral Theses**, and **Course Reserves**.
- **Integrated Era Selector**: Filter by publication date range (`All Eras`, `Classics <2015`, `Modern 2015–2021`, `Contemporary 2022–2026`).
- **Academic Discipline Ribbon**: One-click filtering across AI & Computing, Quantum Info, Genomics, Food & Climate, Economics & Games, Law & Society, and Philosophy.
- **Discipline-Reactive Inquiry Starters**: Selecting an academic field immediately loads tailored scholarly prompts formatted as frosted glass cards with 1-click launch.

### 2. Three-Tier Categorized Recommendation Engine
- Following every research synthesis, OnlyBooks generates 6 curated recommendations grouped into:
  - 📚 **Course Reserves**: Essential syllabus readings directly assigned in curriculum.
  - 🏛️ **Seminal Foundations**: Groundbreaking faculty papers that originated the paradigm.
  - 🌐 **Interdisciplinary Bridges**: Cross-cutting treatises connecting disparate fields.
- Includes interactive category tabs and direct reader navigation.

### 3. Real-Time Streaming RAG Synthesis (SSE)
- Initiates an asynchronous event stream via `POST /api/inquiries/synthesize/stream`.
- Emits real-time tokens with interactive footnote superscripts (`¹`, `²`, `³`), confidence scores, and strict citation guardrail verification against extracted passage text.

### 4. Interactive Digital Reading Room
- Clicking any footnote superscript opens the archival reader, auto-navigating to the referenced manuscript page and highlighting the exact extracted quote.
- In-document search, quote copying, and page turning navigation.

### 5. Document Deposit & Dynamic Zero-Restart Re-Indexing
- Faculty and researchers can deposit manuscripts or upload academic `.pdf`, `.txt`, and `.md` files.
- The `IngestionService` segments chapters, estimates pagination, generates an LC call number, and updates dense vector and BM25 indices dynamically without server downtime.

### 6. Citation Bibliography Exporter
- Export references in standardized **BibTeX (.bib)** for LaTeX, Zotero, or Mendeley.
- One-click copy in **APA 7th**, **MLA 9th**, and **Chicago** citation formats.

---

## 🔒 Default Authentication Credentials

For testing and demonstration, you can sign in directly with the following default academic accounts:

- **Faculty Profile**:
  - **Email**: `faculty@university.edu`
  - **Password**: `LibraryPass2026!`
  - **Role**: Faculty (access to manuscript deposit & citation metrics)
- **Researcher Profile**:
  - **Email**: `researcher@university.edu`
  - **Password**: `LibraryPass2026!`
  - **Role**: Student / Candidate (access to inquiry portal & study notebooks)

You may also register a new institutional profile at any time with real-time email OTP verification.