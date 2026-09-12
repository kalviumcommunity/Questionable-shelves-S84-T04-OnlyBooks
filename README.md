# OnlyBooks · University Library Archive & Citation-Backed RAG Platform

> **A citation-backed academic research platform** pairing scholarly library holdings with real-time hybrid vector-lexical retrieval, citation guardrails, dynamic chapter ingestion, and an interactive digital reading room.

---

## 🏛️ System Overview

**OnlyBooks** is designed for university researchers, faculty, and doctoral candidates who require research synthesis backed by verifiable library holdings. Unlike conventional conversational AI that risks hallucinating non-existent papers or misquoting page numbers, OnlyBooks guarantees:

1. **Hybrid Retrieval (Dense + BM25 + RRF)**: Simultaneously evaluates semantic dense embeddings and BM25 lexical token matches across catalog holdings, combining ranks via Reciprocal Rank Fusion ($k=60$).
2. **Strict Grounded Citation Guardrails**: Factual claims in the synthesis are mapped 1-to-1 to exact page excerpts and anchored using Unicode superscript markers (`¹`, `²`, `³`).
3. **Real-Time Token Streaming via SSE**: Server-Sent Events deliver incremental synthesis tokens, instantaneous bibliography generation, and typewriter streaming cadence.
4. **Digital Reading Room**: Clicking any citation superscript or bibliography card transports the researcher into the archival manuscript, automatically navigating to the referenced page and dynamically highlighting the exact extracted quote.
5. **Archival Deposit & Dynamic Ingestion Pipeline**: Faculty and researchers can deposit new manuscripts with multi-chapter text. The system extracts chapters, calculates pagination, assigns institutional call numbers, and dynamically updates dense vector and BM25 indices without server restarts.
6. **Persistent Research Trail**: All inquiries, syntheses, and citations are stored in a relational database, enabling researchers to revisit past inquiries or branch into follow-up research questions.

---

## 🏗️ Architecture & Technology Stack

```
Questionable-shelves-S84-T04-OnlyBooks/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entrypoint & middleware
│   │   ├── config.py                # Pydantic environment configuration
│   │   ├── database.py              # Async SQLAlchemy engine & session factory
│   │   ├── models/                  # Relational models (User, Document, Section, Inquiry, Synthesis, Citation)
│   │   ├── schemas/                 # Pydantic request/response validation schemas
│   │   ├── routes/                  # Modular APIRouters (auth, catalog, inquiries, reading_room)
│   │   ├── services/
│   │   │   ├── dense_indexer.py     # TF-IDF sublinear vectorizer & cosine similarity
│   │   │   ├── bm25_indexer.py      # BM25Okapi lexical retrieval with Porter stemming
│   │   │   ├── hybrid_retriever.py  # Reciprocal Rank Fusion (RRF) & multi-source ranking
│   │   │   ├── citation_guardrail.py# Verification of inline markers & quote overlaps
│   │   │   ├── synthesizer.py       # Grounded synthesis engine & SSE streaming generator
│   │   │   └── ingestion_service.py # Chapter regex parser, page estimator & dynamic indexer
│   │   └── seeds/                   # Catalog seed data with foundational computer science & philosophy holdings
│   └── tests/                       # Pytest test suite (19 test suites, 100% passing)
├── frontend/
│   ├── src/
│   │   ├── views/
│   │   │   ├── AuthPage.tsx         # Institutional sign-in & registration with SSO
│   │   │   ├── ResearchPortal.tsx   # Catalog search, metrics, filters, and manuscript deposit modal
│   │   │   ├── SynthesisView.tsx    # RAG synthesis with live SSE streaming & interactive footnotes
│   │   │   └── ReadingRoom.tsx      # Archival reader with page turns and quote highlighting
│   │   ├── components/
│   │   │   └── DepositModal.tsx     # Manuscript deposit modal with quick-fill presets
│   │   ├── services/
│   │   │   └── api.ts               # Typed API client with SSE fetch streaming & JWT management
│   │   └── index.css                # Curated serif/sans typography & glassmorphism design tokens
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

### Option B: Manual Startup

#### 1. Backend Setup & Run
```bash
cd backend
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

### Backend Unit & Integration Tests (19 tests)
The backend test suite verifies database transactions, hybrid retrieval, reciprocal rank fusion, manuscript deposit, zero-restart re-indexing, SSE streaming, and citation guardrails:
```bash
cd backend
.\venv\Scripts\python -m pytest -v
```
Output:
```
tests/test_auth.py::test_healthcheck PASSED
tests/test_auth.py::test_auth_full_cycle PASSED
tests/test_catalog.py::test_catalog_metrics PASSED
tests/test_catalog.py::test_catalog_acquisitions_all_and_filtering PASSED
tests/test_catalog.py::test_catalog_document_detail_and_404 PASSED
tests/test_deposit.py::test_deposit_manuscript_endpoint PASSED
tests/test_deposit.py::test_deposit_call_number_collision_handling PASSED
tests/test_deposit.py::test_immediate_hybrid_retrieval_of_deposited_document PASSED
tests/test_deposit.py::test_end_to_end_synthesis_citing_new_deposit PASSED
tests/test_reading_room.py::test_reading_room_endpoint PASSED
tests/test_reading_room.py::test_raw_page_endpoint PASSED
tests/test_retrieval.py::test_dense_vector_indexer PASSED
tests/test_retrieval.py::test_bm25_lexical_indexer PASSED
tests/test_retrieval.py::test_hybrid_retrieval_rrf PASSED
tests/test_retrieval.py::test_database_indexing_and_retrieval PASSED
tests/test_streaming_and_history.py::test_synthesize_stream_endpoint_and_db_persistence PASSED
tests/test_streaming_and_history.py::test_inquiry_history_endpoint PASSED
tests/test_synthesis.py::test_citation_guardrail_mechanisms PASSED
tests/test_synthesis.py::test_synthesize_endpoint_and_db_persistence PASSED
============================= 19 passed in 5.17s ==============================
```

### Frontend Typecheck & Production Build
```bash
cd frontend
pnpm run build
```
Output:
```
✓ built in 2.06s (0 errors, 0 warnings)
```

---

## 🔑 Key Features Walkthrough

### 1. Research Portal & Catalog Discovery
- Search archival manuscripts across collections: **Faculty Research**, **Doctoral Theses**, **Course Reserves**, and **University Press**.
- View real-time library collection metrics (total documents, catalog distribution).
- Single-click quick fill for classic research topics (Attention mechanisms, Epistemology of consensus, Relational databases, Distributed consensus).

### 2. Real-Time Streaming RAG Synthesis (SSE)
- When a question is submitted, `POST /api/inquiries/synthesize/stream` initiates an asynchronous event stream.
- Emits `event: "metadata"` (byline, confidence score) and `event: "citations"` (full bibliographic holdings).
- Streams tokens one by one with a live typewriter effect and interactive footnote superscripts (`¹`, `²`, `³`).
- Saves inquiry, synthesis paragraphs, and citations in the relational database upon completion.

### 3. Interactive Digital Reading Room
- Clicking any footnote superscript in the synthesis text or clicking any entry in the bibliography sidebar opens the Archival Reading Room.
- Automatically opens the exact page of the manuscript.
- Features dynamic text highlighting for the exact quote that backed the claim.
- Full page-turning and chapter navigation (`Pg. 1` through `Pg. N`).

### 4. Document Deposit & Dynamic Zero-Restart Re-Indexing
- Click **"Deposit Manuscript"** in the top navigation of the portal.
- Fill out manuscript details or click one of the quick-fill templates (e.g. *Quantum Coherence in Photosynthetic Reaction Complexes*).
- The `IngestionService` parses chapter headings (e.g., `Chapter 1: ...`), calculates page boundaries, and generates an official call number.
- Newly deposited documents are immediately retrievable in subsequent searches and cited in live RAG syntheses without restarting the application!

---

## 🔒 Default Authentication Credentials

For testing and demonstration, you can sign in directly with the following default academic account or use Google Scholar / ORCID SSO:

- **Email**: `researcher@university.edu`
- **Password**: `LibraryPass2026!`
- **Name**: Dr. Julian Vance
- **Affiliation**: Department of Epistemology & Theoretical Informatics

You may also register a new institutional profile at any time via the registration interface.