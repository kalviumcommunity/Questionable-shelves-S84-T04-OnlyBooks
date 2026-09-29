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

  const collections: { id: FilterType; label: string; icon: string }[] = [
    { id: "all", label: "All Collections", icon: "🏛️" },
    { id: "papers", label: "Faculty Research", icon: "📄" },
    { id: "theses", label: "Doctoral Theses", icon: "🎓" },
    { id: "reserves", label: "Course Reserves", icon: "📚" },
  ];

  const fieldCategories: { id: string; label: string; icon: string }[] = [
    { id: "all", label: "All Fields", icon: "🌐" },
    { id: "Artificial Intelligence & Deep Learning", label: "AI & Computing", icon: "⚡" },
    { id: "Quantum Information & Computing", label: "Quantum Info", icon: "⚛️" },
    { id: "Molecular Biology & Genetics", label: "Genomics", icon: "🧬" },
    { id: "Agricultural Sciences & Public Health", label: "Food & Climate", icon: "🌾" },
    { id: "Game Theory & Mathematical Economics", label: "Economics & Games", icon: "📊" },
    { id: "Constitutional Law & Theory", label: "Law & Society", icon: "⚖️" },
    { id: "Philosophy of Science", label: "Philosophy", icon: "🏛️" },
  ];

  // Dynamic syllabus prompts reactive to chosen field
  const dynamicSuggestedPrompts: Record<string, { prompt: string; tag: string }[]> = {
    all: [
      {
        prompt: "Explain Kuhn's paradigm shift theory versus Popperian falsificationism",
        tag: "Philosophy",
      },
      {
        prompt: "How do scaled dot-product and multi-head attention improve Transformer throughput?",
        tag: "AI & Deep Learning",
      },
      {
        prompt: "Examine adult neuroplasticity in critical-period second language acquisition",
        tag: "Neuroscience",
      },
    ],
    "Artificial Intelligence & Deep Learning": [
      {
        prompt: "How do scaled dot-product and multi-head attention improve Transformer throughput?",
        tag: "Attention & LLMs",
      },
      {
        prompt: "Compare deep residual learning skip-connections with vanishing gradient stabilization",
        tag: "Computer Vision",
      },
      {
        prompt: "Explain the orthogonality thesis and coronal alignment in multi-agent safety",
        tag: "Value Alignment",
      },
    ],
    "Quantum Information & Computing": [
      {
        prompt: "What is the mathematical formulation of qubit superposition and entanglement?",
        tag: "Qubits & States",
      },
      {
        prompt: "How does Shor's algorithm achieve polynomial-time integer prime factorization?",
        tag: "Quantum Algorithms",
      },
      {
        prompt: "Explain quantum error-correcting codes and surface threshold theorems",
        tag: "Decoherence & Codes",
      },
    ],
    "Molecular Biology & Genetics": [
      {
        prompt: "How does Cas9 endonuclease induce double-stranded DNA target breaks via sgRNA?",
        tag: "CRISPR Mechanisms",
      },
      {
        prompt: "What mechanisms regulate PAM recognition and reduce off-target CRISPR cleavage?",
        tag: "Specificity & PAM",
      },
      {
        prompt: "Synthesize gene drive inheritance patterns compared to Mendelian genetics",
        tag: "Gene Editing",
      },
    ],
    "Agricultural Sciences & Public Health": [
      {
        prompt: "What are the quantitative planetary boundary targets for sustainable food production?",
        tag: "Earth Systems",
      },
      {
        prompt: "How do livestock emissions and nitrogen runoff drive biosphere degradation?",
        tag: "Anthropocene",
      },
      {
        prompt: "Explain viral spillover surveillance mechanisms in global pandemic preparedness",
        tag: "Epidemiology",
      },
    ],
    "Game Theory & Mathematical Economics": [
      {
        prompt: "Formulate the existence proof for Nash equilibria in non-cooperative finite games",
        tag: "Nash Equilibrium",
      },
      {
        prompt: "How does the revelation principle guarantee incentive compatibility in auction design?",
        tag: "Mechanism Design",
      },
      {
        prompt: "Analyze Piketty's r > g capital divergence dynamics versus labor share returns",
        tag: "Political Economy",
      },
    ],
    "Constitutional Law & Theory": [
      {
        prompt: "Explain constituent power versus constituted authority in post-conflict states",
        tag: "Constitutional Theory",
      },
      {
        prompt: "How does Habermasian discourse theory reconcile democratic legitimacy with constitutional law?",
        tag: "Legal Philosophy",
      },
      {
        prompt: "Critique algorithmic transparency in public administration under administrative law",
        tag: "Black Box Society",
      },
    ],
    "Philosophy of Science": [
      {
        prompt: "Explain Kuhn's paradigm shift theory versus Popperian falsificationism",
        tag: "Normal Science",
      },
      {
        prompt: "Analyze Feyerabend's methodological anarchism and the 'against method' critique",
        tag: "Epistemology",
      },
      {
        prompt: "What constitutes certified knowledge according to post-positivist science studies?",
        tag: "Scientific Consensus",
      },
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
        /* ── Unified Glass Filter Console ── */
        .filter-console {
          width: 100%;
          max-width: 800px;
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1.5px solid rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          padding: 0.85rem 1.15rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.8);
          margin-bottom: 1.1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          box-sizing: border-box;
        }
        body.dark .filter-console {
          background: rgba(15, 23, 42, 0.84);
          border-color: rgba(255, 255, 255, 0.12);
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
        }

        .collection-segmented-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .collection-pills {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          background: rgba(0, 0, 0, 0.04);
          padding: 0.22rem;
          border-radius: 9999px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          flex-wrap: wrap;
        }
        body.dark .collection-pills {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.08);
        }
        .collection-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.32rem 0.8rem;
          border-radius: 9999px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.76rem;
          font-weight: 500;
          font-family: var(--font-sans);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;
        }
        .collection-pill-btn:hover {
          color: var(--text-primary);
        }
        .collection-pill-btn.active {
          background: var(--accent);
          color: var(--bg-primary);
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        }

        .era-picker-wrap {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(0, 0, 0, 0.04);
          padding: 0.22rem 0.7rem;
          border-radius: 9999px;
          border: 1px solid rgba(0, 0, 0, 0.06);
        }
        body.dark .era-picker-wrap {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.08);
        }
        .era-picker-select {
          border: none;
          background: transparent;
          color: var(--text-primary);
          font-size: 0.74rem;
          font-family: var(--font-sans);
          font-weight: 600;
          outline: none;
          cursor: pointer;
        }

        .disciplines-ribbon {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          overflow-x: auto;
          padding-top: 0.55rem;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        body.dark .disciplines-ribbon {
          border-top-color: rgba(255, 255, 255, 0.08);
        }
        .disciplines-ribbon::-webkit-scrollbar {
          display: none;
        }
        .discipline-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.3rem 0.75rem;
          border-radius: 10px;
          border: 1px solid var(--border-light);
          background: rgba(255, 255, 255, 0.55);
          color: var(--text-secondary);
          font-size: 0.72rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;
          flex-shrink: 0;
        }
        body.dark .discipline-btn {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.08);
        }
        .discipline-btn:hover {
          background: var(--accent-light);
          color: var(--text-primary);
          border-color: var(--border-strong);
          transform: translateY(-1px);
        }
        .discipline-btn.active {
          background: var(--accent);
          color: var(--bg-primary);
          border-color: var(--accent);
          font-weight: 600;
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
        }

        /* ── Search Bar ── */
        .search-bar-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          max-width: 800px;
        }
        .search-bar-wrapper svg.search-icon {
          position: absolute;
          left: 1.1rem;
          width: 19px;
          height: 19px;
          color: var(--text-secondary);
          pointer-events: none;
          flex-shrink: 0;
        }
        .search-input {
          width: 100%;
          padding: 1rem 8.5rem 1rem 3.1rem;
          font-size: 0.96rem;
          font-family: var(--font-sans);
          border-radius: 16px;
          border: 1.5px solid rgba(255, 255, 255, 0.95);
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          color: var(--text-primary);
          outline: none;
          transition: all 0.22s ease;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05), inset 0 2px 4px rgba(0, 0, 0, 0.02);
          box-sizing: border-box;
        }
        .search-input::placeholder { color: var(--text-secondary); opacity: 0.65; }
        .search-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3.5px var(--accent-ring), 0 8px 28px rgba(0, 0, 0, 0.08);
        }
        body.dark .search-input {
          background: rgba(15, 23, 42, 0.88);
          border-color: rgba(255, 255, 255, 0.15);
          color: #f8fafc;
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
        }
        body.dark .search-input:focus {
          border-color: #f8fafc;
          box-shadow: 0 0 0 3px rgba(248, 250, 252, 0.18), 0 10px 32px rgba(0, 0, 0, 0.6);
        }
        .search-submit-btn {
          position: absolute;
          right: 0.55rem;
          padding: 0.55rem 1.25rem;
          border-radius: 12px;
          border: none;
          background: var(--accent);
          color: var(--bg-primary);
          font-size: 0.82rem;
          font-weight: 600;
          font-family: var(--font-sans);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .search-submit-btn:hover { opacity: 0.92; transform: translateY(-1px); }

        /* ── Suggestions Card Matrix ── */
        .suggestions-matrix {
          width: 100%;
          max-width: 800px;
          margin-top: 0.9rem;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        .suggestions-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 0.35rem;
        }
        .suggestions-label {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 700;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .suggestions-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.65rem;
        }
        @media (max-width: 768px) {
          .suggestions-grid {
            grid-template-columns: 1fr;
          }
        }
        .suggestion-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: left;
          padding: 0.8rem 0.95rem;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1.5px solid rgba(255, 255, 255, 0.95);
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
          box-sizing: border-box;
          min-height: 85px;
        }
        body.dark .suggestion-card {
          background: rgba(17, 24, 39, 0.88);
          border-color: rgba(255, 255, 255, 0.12);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }
        .suggestion-card:hover {
          transform: translateY(-3px);
          border-color: var(--accent);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.09);
          background: rgba(255, 255, 255, 0.98);
        }
        body.dark .suggestion-card:hover {
          border-color: rgba(255, 255, 255, 0.3);
          background: rgba(24, 32, 50, 0.95);
        }
        .suggestion-card-text {
          font-size: 0.77rem;
          line-height: 1.45;
          color: var(--text-primary);
          font-weight: 500;
          margin-bottom: 0.45rem;
        }
        .suggestion-card-action {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.66rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .suggestion-card:hover .suggestion-card-action {
          color: var(--accent);
        }

        .recent-q-item {
          padding: 0.75rem 1rem;
          background: rgba(255,255,255,0.65);
          border: 1.5px solid rgba(255,255,255,0.92);
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.25s ease;
          backdrop-filter: blur(14px);
        }
        body.dark .recent-q-item { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }
        .recent-q-item:hover {
          background: rgba(255,255,255,0.85);
          transform: translateX(4px);
          border-color: rgba(255,255,255,0.98);
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
        Search Hero: Elegant Filter Dock, High-Contrast Search Bar, and Card Matrix Suggestions
      */}
      <section className="search-hero flex flex-col items-center justify-center py-5">
        <Reveal delay={0}>
          <div className="flex flex-col items-center text-center max-w-4xl w-full">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 font-display tracking-tight text-primary">
              What are you researching today?
            </h1>
            <p className="text-xs text-gray-500 max-w-lg mb-4">
              Synthesize citation-grounded insights across 30 verified university holdings, doctoral theses, and course reserves.
            </p>

            {/* ── Unified Glass Filter Console ── */}
            <div className="filter-console">
              {/* Row 1: Collections Segmented Pills & Era Dropdown */}
              <div className="collection-segmented-bar">
                <div className="collection-pills">
                  {collections.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setFilter(c.id)}
                      className={`collection-pill-btn${filter === c.id ? " active" : ""}`}
                    >
                      <span>{c.icon}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>

                {/* Integrated Era Selector Badge */}
                <div className="era-picker-wrap">
                  <span style={{ fontSize: "0.72rem", opacity: 0.7 }}>📅</span>
                  <select
                    value={eraFilter}
                    onChange={(e) => setEraFilter(e.target.value)}
                    className="era-picker-select"
                    title="Filter by publication era"
                  >
                    <option value="all" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>All Eras</option>
                    <option value="classic" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>Classics (&lt;2015)</option>
                    <option value="modern" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>Modern (2015–2021)</option>
                    <option value="contemporary" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>Contemporary (2022–2026)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Academic Disciplines Ribbon */}
              <div className="disciplines-ribbon">
                {fieldCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setFieldFilter(cat.id)}
                    className={`discipline-btn${fieldFilter === cat.id ? " active" : ""}`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── High-Contrast Search Bar ── */}
            <div className="search-bar-wrapper">
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

            {/* ── Frosted Glass Suggestion Cards Matrix ── */}
            <div className="suggestions-matrix">
              <div className="suggestions-header">
                <span className="suggestions-label">
                  <span>✨</span>
                  <span>Suggested Scholarly Inquiries</span>
                </span>
                <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", opacity: 0.85 }}>
                  {fieldFilter !== "all" ? fieldFilter.split(" & ")[0] : "All Disciplines"}
                </span>
              </div>

              <div className="suggestions-grid">
                {activePrompts.slice(0, 3).map((item, pIdx) => (
                  <div
                    key={pIdx}
                    className="suggestion-card"
                    onClick={() => onQuery(item.prompt, filter, fieldFilter, eraFilter)}
                  >
                    <p className="suggestion-card-text">
                      {item.prompt}
                    </p>
                    <div className="suggestion-card-action">
                      <span style={{ fontSize: "0.62rem", background: "var(--accent-light)", padding: "0.1rem 0.4rem", borderRadius: "5px", color: "var(--text-primary)" }}>
                        {item.tag}
                      </span>
                      <span>Launch →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginTop: "0.85rem", opacity: 0.85 }}>
              Press{" "}
              <kbd style={{ background: "var(--accent-light)", padding: "2px 7px", borderRadius: "5px", color: "var(--text-primary)", fontFamily: "var(--font-sans)", fontSize: "0.68rem", border: "1px solid var(--border-strong)" }}>
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
                  background: "rgba(255,255,255,0.6)",
                  border: "1px solid var(--border-light)",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.6rem",
                  transition: "all 0.18s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-light)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.6)")}
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
