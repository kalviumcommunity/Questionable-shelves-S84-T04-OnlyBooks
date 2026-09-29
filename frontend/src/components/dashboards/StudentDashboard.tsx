import React, { useState, useEffect, KeyboardEvent } from "react";
import type { User, Query } from "../../App";
import { ACQUISITIONS } from "../../data/libraryKnowledge";
import { catalogApi, CatalogDocument } from "../../services/api";
import Reveal from "../Reveal";

export type FilterType = "all" | "papers" | "theses" | "reserves" | "press";

interface StudentDashboardProps {
  user: User;
  onQuery: (question: string, collectionFilter?: string, fieldFilter?: string, eraFilter?: string) => void;
  recentQueries?: Query[];
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  onQuery,
  recentQueries = [],
}) => {
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [fieldFilter, setFieldFilter] = useState<string>("all");
  const [eraFilter, setEraFilter] = useState<string>("all");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [liveAcquisitions, setLiveAcquisitions] = useState<CatalogDocument[]>([]);

  function getYearRange() {
    if (eraFilter === "classic") return { yearTo: "2014" };
    if (eraFilter === "modern") return { yearFrom: "2015", yearTo: "2021" };
    if (eraFilter === "contemporary") return { yearFrom: "2022" };
    return {};
  }

  useEffect(() => {
    const { yearFrom, yearTo } = getYearRange();
    catalogApi
      .getAcquisitions(
        filter,
        catalogSearch,
        sortBy,
        yearFrom,
        yearTo,
        60,
        0,
        fieldFilter !== "all" ? fieldFilter : undefined
      )
      .then((res) => {
        if (res.items) setLiveAcquisitions(res.items);
      })
      .catch(() => {});
  }, [filter, fieldFilter, eraFilter, catalogSearch, sortBy]);

  function submit() {
    const trimmed = input.trim();
    if (trimmed) onQuery(trimmed, filter, fieldFilter, eraFilter);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") submit();
  }

  const filters: { id: FilterType; label: string }[] = [
    { id: "all", label: "All Collections" },
    { id: "papers", label: "Research Papers" },
    { id: "theses", label: "Theses & Dissertations" },
    { id: "reserves", label: "Course Reserves" },
  ];

  const fieldCategories: { id: string; label: string }[] = [
    { id: "all", label: "All Fields" },
    { id: "Artificial Intelligence & Deep Learning", label: "AI & Computing" },
    { id: "Quantum Information & Computing", label: "Quantum Info" },
    { id: "Molecular Biology & Genetics", label: "Genomics" },
    { id: "Agricultural Sciences & Public Health", label: "Food & Climate" },
    { id: "Game Theory & Mathematical Economics", label: "Economics & Games" },
    { id: "Constitutional Law & Theory", label: "Law & Society" },
    { id: "Philosophy of Science", label: "Philosophy" },
  ];

  // Dynamic syllabus prompts reactive to chosen field
  const dynamicSuggestedPrompts: Record<string, string[]> = {
    all: [
      "Explain Kuhn's paradigm shift theory versus Popperian falsificationism",
      "How do scaled dot-product and multi-head attention improve Transformer throughput?",
      "Examine adult neuroplasticity in critical-period second language acquisition",
      "What are the cryosphere-ocean feedback loops pushing climate tipping points?",
    ],
    "Artificial Intelligence & Deep Learning": [
      "How do scaled dot-product and multi-head attention improve Transformer throughput?",
      "Compare deep residual learning skip-connections with vanishing gradient stabilization",
      "Explain the orthogonality thesis and coronal alignment in multi-agent safety",
    ],
    "Quantum Information & Computing": [
      "What is the mathematical formulation of qubit superposition and entanglement?",
      "How does Shor's algorithm achieve polynomial-time integer prime factorization?",
      "Explain quantum error-correcting codes and surface threshold theorems",
    ],
    "Molecular Biology & Genetics": [
      "How does Cas9 endonuclease induce double-stranded DNA target breaks via sgRNA?",
      "What mechanisms regulate PAM recognition and reduce off-target CRISPR cleavage?",
      "Synthesize gene drive inheritance patterns compared to Mendelian genetics",
    ],
    "Agricultural Sciences & Public Health": [
      "What are the quantitative planetary boundary targets for sustainable food production?",
      "How do livestock methane emissions and nitrogen runoff drive biosphere degradation?",
      "Explain viral spillover surveillance mechanisms in global pandemic preparedness",
    ],
    "Game Theory & Mathematical Economics": [
      "Formulate the existence proof for Nash equilibria in non-cooperative finite games",
      "How does the revelation principle guarantee incentive compatibility in auction design?",
      "Analyze Piketty's r > g capital divergence dynamics versus labor share returns",
    ],
    "Constitutional Law & Theory": [
      "Explain constituent power versus constituted authority in post-conflict states",
      "How does Habermasian discourse theory reconcile democratic legitimacy with constitutional law?",
      "Critique algorithmic transparency in public administration under administrative law",
    ],
    "Philosophy of Science": [
      "Explain Kuhn's paradigm shift theory versus Popperian falsificationism",
      "Analyze Feyerabend's methodological anarchism and the 'against method' critique",
      "What constitutes certified knowledge according to post-positivist science studies?",
    ],
  };

  const activePrompts = dynamicSuggestedPrompts[fieldFilter] || dynamicSuggestedPrompts["all"];

  const displayAcquisitions =
    liveAcquisitions.length > 0
      ? liveAcquisitions.map((doc) => ({
          id: doc.id,
          field: doc.field,
          title: doc.title,
          author: doc.author,
          year: doc.year,
          pages: doc.pages_label,
          callNumber: doc.call_number,
          collectionType: doc.collection_name || "Library Holding",
        }))
      : ACQUISITIONS.filter((item) => {
          if (filter === "papers") return item.collectionType === "Faculty Research";
          if (filter === "theses") return item.collectionType === "Doctoral Thesis";
          if (filter === "reserves") return item.collectionType === "Course Reserve";
          return true;
        });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <style>{`
        .portal-filter-chip {
          padding: 0.35rem 0.9rem;
          border-radius: 9999px;
          border: 1.5px solid var(--border-strong);
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.76rem;
          font-weight: 500;
          font-family: var(--font-sans);
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }
        .portal-filter-chip:hover {
          background: var(--accent-light);
          color: var(--text-primary);
          border-color: var(--text-secondary);
        }
        .portal-filter-chip.active {
          background: var(--accent);
          color: var(--bg-primary);
          border-color: var(--accent);
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        }
        .field-filter-chip {
          padding: 0.28rem 0.75rem;
          border-radius: 8px;
          border: 1px solid var(--border-light);
          background: rgba(255,255,255,0.4);
          color: var(--text-secondary);
          font-size: 0.72rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.18s ease;
          white-space: nowrap;
        }
        body.dark .field-filter-chip {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.1);
        }
        .field-filter-chip:hover {
          background: var(--accent-light);
          color: var(--text-primary);
        }
        .field-filter-chip.active {
          background: var(--accent);
          color: var(--bg-primary);
          border-color: var(--accent);
          font-weight: 600;
        }
        .search-bar-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          max-width: 760px;
        }
        .search-bar-wrapper svg.search-icon {
          position: absolute;
          left: 1rem;
          width: 18px;
          height: 18px;
          color: var(--text-secondary);
          pointer-events: none;
          flex-shrink: 0;
        }
        .search-input {
          width: 100%;
          padding: 0.95rem 8rem 0.95rem 2.85rem;
          font-size: 0.95rem;
          font-family: var(--font-sans);
          border-radius: 14px;
          border: 1.5px solid rgba(255,255,255,0.92);
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          color: var(--text-primary);
          outline: none;
          transition: all 0.22s ease;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.03);
          box-sizing: border-box;
        }
        .search-input::placeholder { color: var(--text-secondary); opacity: 0.65; }
        .search-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-ring), inset 0 2px 4px rgba(0,0,0,0.02);
        }
        body.dark .search-input {
          background: rgba(14, 18, 26, 0.85);
          border-color: rgba(255, 255, 255, 0.16);
          color: #f8fafc;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }
        body.dark .search-input:focus {
          border-color: #f8fafc;
          box-shadow: 0 0 0 3px rgba(248, 250, 252, 0.15), 0 4px 24px rgba(0, 0, 0, 0.6);
        }
        .search-submit-btn {
          position: absolute;
          right: 0.5rem;
          padding: 0.5rem 1.1rem;
          border-radius: 10px;
          border: none;
          background: var(--accent);
          color: var(--bg-primary);
          font-size: 0.8rem;
          font-weight: 600;
          font-family: var(--font-sans);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .search-submit-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .recent-q-item {
          padding: 0.75rem 1rem;
          background: rgba(255,255,255,0.55);
          border: 1.5px solid rgba(255,255,255,0.88);
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.25s ease;
          backdrop-filter: blur(12px);
        }
        body.dark .recent-q-item { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }
        .recent-q-item:hover {
          background: rgba(255,255,255,0.75);
          transform: translateX(4px);
          border-color: rgba(255,255,255,0.95);
        }
        body.dark .recent-q-item:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.14); }
        .acq-card {
          break-inside: avoid;
          margin-bottom: 1.25rem;
          padding: 1.4rem;
          background: var(--glass-bg);
          border: 1.5px solid rgba(255,255,255,0.88);
          border-radius: 18px;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          cursor: pointer;
          transition: all 0.32s cubic-bezier(0.16,1,0.3,1);
          box-shadow: var(--glass-shadow);
        }
        body.dark .acq-card { border-color: rgba(255,255,255,0.08); }
        .acq-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--glass-shadow-hover);
          border-color: rgba(255,255,255,0.96);
          background: var(--glass-hover);
        }
        body.dark .acq-card:hover { border-color: rgba(255,255,255,0.16); }
      `}</style>

      {/* 
        Search Hero: Large input box, query logic, and filter chips
      */}
      <section className="search-hero flex flex-col items-center justify-center py-6">
        <Reveal delay={0}>
          <div className="flex flex-col items-center text-center max-w-3xl">
            <h1 className="text-3xl font-bold mb-2 font-display tracking-tight text-primary">
              What are you researching today?
            </h1>
            <p className="text-xs text-gray-500 max-w-lg mb-4">
              OnlyBooks synthesizes citations across 30 verified university holdings, doctoral theses, and syllabus reserves.
            </p>

            {/* Collection Filter Chips & Era Selector */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.85rem", flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
              {filters.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFilter(c.id)}
                  className={`portal-filter-chip${filter === c.id ? " active" : ""}`}
                >
                  {c.label}
                </button>
              ))}

              {/* Era Selector */}
              <select
                value={eraFilter}
                onChange={(e) => setEraFilter(e.target.value)}
                style={{
                  padding: "0.32rem 0.75rem",
                  borderRadius: "9999px",
                  border: "1.5px solid var(--border-strong)",
                  background: eraFilter !== "all" ? "var(--accent)" : "transparent",
                  color: eraFilter !== "all" ? "var(--bg-primary)" : "var(--text-secondary)",
                  fontSize: "0.74rem",
                  fontFamily: "var(--font-sans)",
                  outline: "none",
                  cursor: "pointer",
                  fontWeight: eraFilter !== "all" ? 600 : 500,
                }}
                title="Filter by publication era"
              >
                <option value="all" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>All Eras</option>
                <option value="classic" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>Classics (&lt;2015)</option>
                <option value="modern" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>Modern (2015–2021)</option>
                <option value="contemporary" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>Contemporary (2022–2026)</option>
              </select>
            </div>

            {/* Academic Discipline Ribbon */}
            <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1.2rem", flexWrap: "wrap", justifyContent: "center" }}>
              {fieldCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFieldFilter(cat.id)}
                  className={`field-filter-chip${fieldFilter === cat.id ? " active" : ""}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="search-bar-wrapper" style={{ marginBottom: "0.85rem" }}>
              <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                className="search-input"
                placeholder={
                  fieldFilter === "Quantum Information & Computing"
                    ? "Inquire on qubits, Shor's factorization, or superdense coding..."
                    : fieldFilter === "Molecular Biology & Genetics"
                    ? "Inquire on CRISPR Cas-9 mechanics, sgRNA design, or gene therapy..."
                    : fieldFilter === "Game Theory & Mathematical Economics"
                    ? "Inquire on Nash equilibrium, mechanism design, or capital return..."
                    : "Inquire about a research topic, thesis, or syllabus reading…"
                }
              />
              <button className="search-submit-btn" onClick={submit}>
                Synthesize
              </button>
            </div>

            {/* Discipline-Reactive Suggested Prompts */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center", maxWidth: "760px", marginBottom: "0.5rem" }}>
              {activePrompts.slice(0, 3).map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => onQuery(prompt, filter, fieldFilter, eraFilter)}
                  style={{
                    background: "rgba(255,255,255,0.45)",
                    border: "1px dashed var(--border-strong)",
                    borderRadius: "8px",
                    padding: "0.22rem 0.6rem",
                    fontSize: "0.7rem",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    textAlign: "left",
                    lineHeight: 1.3,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                >
                  💡 {prompt}
                </button>
              ))}
            </div>

            <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Press{" "}
              <kbd style={{ background: "var(--accent-light)", padding: "2px 7px", borderRadius: "5px", color: "var(--text-primary)", fontFamily: "var(--font-sans)", fontSize: "0.7rem", border: "1px solid var(--border-strong)" }}>
                Enter
              </kbd>{" "}
              to generate a citation-grounded synthesis
            </span>
          </div>
        </Reveal>
      </section>

      {/* Grid: Course Reserves & Study Notebooks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-1">
        <section className="glass-panel p-5 rounded-xl">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
            <h2 className="text-base font-bold font-display text-primary flex items-center gap-2">
              <span>📖</span> Assigned Course Reserves
            </h2>
            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
              Fall 2026 Syllabus
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {[
              {
                code: "PHYS-440",
                title: "Quantum Computation and Quantum Information",
                prof: "Nielsen & Chuang",
                callNumber: "QA76.889.N54 2010",
                required: true,
              },
              {
                code: "BIO-520",
                title: "CRISPR-Cas9 Endonucleases & RNA-Guided Gene Editing",
                prof: "Doudna & Charpentier",
                callNumber: "QP624.D68 2020",
                required: true,
              },
              {
                code: "PHIL-401",
                title: "The Epistemology of Scientific Consensus Formation",
                prof: "Prof. Eleanor Vance",
                callNumber: "Q175.K84",
                required: true,
              },
              {
                code: "ATM-310",
                title: "Climate Feedback Loops and Irreversible Tipping Points",
                prof: "Atmospheric Systems",
                callNumber: "CR-ATM-502",
                required: false,
              },
            ].map((res) => (
              <div
                key={res.code}
                onClick={() => onQuery(res.title, "reserves")}
                style={{
                  padding: "0.65rem 0.85rem",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.45)",
                  border: "1px solid var(--border-light)",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.6rem",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-light)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.45)")}
              >
                <div style={{ overflow: "hidden", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.15rem" }}>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-primary)" }}>{res.code}</span>
                    {res.required && (
                      <span style={{ fontSize: "0.6rem", color: "#dc2626", background: "rgba(239,68,68,0.1)", padding: "0.05rem 0.35rem", borderRadius: "4px", fontWeight: 600 }}>
                        Required
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {res.title}
                  </p>
                </div>
                <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", flexShrink: 0 }}>
                  {res.callNumber}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel p-5 rounded-xl">
          <h2 className="text-base font-bold font-display text-primary flex items-center gap-2 mb-4">
            <span>🔖</span> Study Notebooks &amp; Trails
          </h2>
          {recentQueries.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {recentQueries.slice(0, 4).map((q) => (
                <div
                  key={q.id}
                  className="recent-q-item"
                  onClick={() => onQuery(q.question, q.collectionFilter || "all", q.fieldFilter, q.eraFilter)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: 1, overflow: "hidden" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="var(--text-secondary)" style={{ flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <span style={{ fontSize: "0.855rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {q.question}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", flexShrink: 0 }}>
                    {q.timestamp}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic">Your saved research trails will appear here.</div>
          )}
        </section>
      </div>

      {/* Curated Holdings / Dissertations */}
      <div style={{ paddingTop: "2rem", borderTop: "1px solid var(--border-light)", marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <p style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-primary)", fontWeight: 700, margin: 0 }}>
              Curated Holdings &amp; Trending Dissertations
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
              <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", margin: 0 }}>
                {displayAcquisitions.length} indexed manuscript{displayAcquisitions.length !== 1 ? "s" : ""}
              </p>
              {(fieldFilter !== "all" || filter !== "all" || eraFilter !== "all") && (
                <span style={{ fontSize: "0.65rem", background: "var(--accent-light)", border: "1px solid var(--border-strong)", borderRadius: "10px", padding: "0.1rem 0.5rem", color: "var(--text-primary)", fontWeight: 600 }}>
                  Active Filter: {[filter !== "all" ? filter : null, fieldFilter !== "all" ? fieldFilter.split(" & ")[0] : null, eraFilter !== "all" ? eraFilter : null].filter(Boolean).join(" · ")}
                </span>
              )}
              {(fieldFilter !== "all" || filter !== "all" || eraFilter !== "all" || catalogSearch) && (
                <button
                  onClick={() => {
                    setFilter("all");
                    setFieldFilter("all");
                    setEraFilter("all");
                    setCatalogSearch("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-secondary)",
                    textDecoration: "underline",
                    fontSize: "0.68rem",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Reset active filters
                </button>
              )}
            </div>
          </div>

          {/* Filtering and Sorting controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "var(--bg-secondary)", border: "1px solid var(--border-strong)", borderRadius: "8px", padding: "0.25rem 0.6rem" }}>
              <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>🔍</span>
              <input
                type="text"
                placeholder="Search holdings..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "0.78rem",
                  color: "var(--text-primary)",
                  width: "140px",
                }}
              />
              {catalogSearch && (
                <button
                  onClick={() => setCatalogSearch("")}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--text-secondary)", padding: 0 }}
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-strong)",
                borderRadius: "8px",
                padding: "0.3rem 0.6rem",
                fontSize: "0.78rem",
                color: "var(--text-primary)",
                outline: "none",
                cursor: "pointer",
              }}
              title="Sort catalog holdings"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="title">Sort: Title (A-Z)</option>
              <option value="author">Sort: Author (A-Z)</option>
              <option value="pages">Sort: Page Count</option>
            </select>
          </div>
        </div>

        <div style={{ columns: "3", columnGap: "1.25rem" }}>
          {displayAcquisitions.map((item, index) => (
            <Reveal key={item.id} delay={0.05 * (index % 3)}>
              <div className="acq-card" onClick={() => onQuery(item.title, "all", item.field)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-secondary)", fontWeight: 700, lineHeight: 1.3 }}>
                    {item.field}
                  </span>
                  <span className="chip" style={{ flexShrink: 0 }}>{item.collectionType}</span>
                </div>

                <p style={{ fontFamily: "var(--font-serif)", fontSize: "1rem", lineHeight: 1.45, color: "var(--text-primary)", fontWeight: 500, marginBottom: "1rem", marginTop: 0 }}>
                  {item.title}
                </p>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-light)", paddingTop: "0.85rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 500 }}>{item.author}</span>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", opacity: 0.7 }}>{item.callNumber} · {item.year}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
