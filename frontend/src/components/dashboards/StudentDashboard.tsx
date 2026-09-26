import React, { useState, useEffect, KeyboardEvent } from "react";
import type { User, Query } from "../../App";
import { ACQUISITIONS } from "../../data/libraryKnowledge";
import { catalogApi, CatalogDocument } from "../../services/api";
import Reveal from "../Reveal";

export type FilterType = "all" | "papers" | "theses" | "reserves";

interface StudentDashboardProps {
  user: User;
  onQuery: (question: string, collectionFilter?: string) => void;
  recentQueries?: Query[];
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  onQuery,
  recentQueries = [],
}) => {
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [liveAcquisitions, setLiveAcquisitions] = useState<CatalogDocument[]>([]);

  useEffect(() => {
    catalogApi
      .getAcquisitions(filter)
      .then((res) => {
        if (res.items && res.items.length > 0) setLiveAcquisitions(res.items);
      })
      .catch(() => {});
  }, [filter]);

  function submit() {
    const trimmed = input.trim();
    if (trimmed) onQuery(trimmed, filter);
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
          padding: 0.4rem 1rem;
          border-radius: 9999px;
          border: 1.5px solid var(--border-strong);
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.78rem;
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
        .search-bar-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          max-width: 720px;
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
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.14);
        }
        body.dark .search-input:focus { border-color: var(--accent); }
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
      <section className="search-hero flex flex-col items-center justify-center py-8">
        <Reveal delay={0}>
          <div className="flex flex-col items-center text-center">
            <h1 className="text-3xl font-bold mb-3 font-display tracking-tight text-primary">
              What are you researching today?
            </h1>
            <p className="text-sm text-gray-500 max-w-lg mb-6">
              OnlyBooks connects research papers, theses, and course materials into concise, citation-backed explanations.
            </p>

            {/* Filter Chips */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap", justifyContent: "center" }}>
              {filters.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFilter(c.id)}
                  className={`portal-filter-chip${filter === c.id ? " active" : ""}`}
                >
                  {c.label}
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
                placeholder="Inquire about a research topic, thesis, or reading…"
              />
              <button className="search-submit-btn" onClick={submit}>
                Submit
              </button>
            </div>

            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
              Press{" "}
              <kbd style={{ background: "var(--accent-light)", padding: "2px 7px", borderRadius: "5px", color: "var(--text-primary)", fontFamily: "var(--font-sans)", fontSize: "0.7rem", border: "1px solid var(--border-strong)" }}>
                Enter
              </kbd>{" "}
              to generate a synthesised response
            </span>
          </div>
        </Reveal>
      </section>

      {/* Grid: Course Reserves & Study Notebooks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <section className="glass-panel p-5 rounded-xl">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
            <h2 className="text-base font-bold font-display text-primary flex items-center gap-2">
              <span>📖</span> Assigned Course Reserves
            </h2>
            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
              Term Syllabus
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {[
              {
                code: "PHIL-401",
                title: "The Epistemology of Scientific Consensus Formation",
                prof: "Prof. Eleanor Vance",
                callNumber: "Q175.K84",
                required: true,
              },
              {
                code: "COG-502",
                title: "Adult Neuroplasticity and Second-Language Acquisition",
                prof: "Dept. of Cognitive Science",
                callNumber: "THES-2024",
                required: false,
              },
              {
                code: "ATM-310",
                title: "Climate Feedback Loops and Irreversible Tipping Points",
                prof: "Atmospheric Systems",
                callNumber: "CR-ATM-502",
                required: true,
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
          <h2 className="text-lg font-semibold mb-4 text-primary">Study Notebooks &amp; Trails</h2>
          {/* Map through recent bookmarked syntheses/inquiries */}
          {recentQueries.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {recentQueries.slice(0, 4).map((q) => (
                <div
                  key={q.id}
                  className="recent-q-item"
                  onClick={() => onQuery(q.question, q.collectionFilter || "all")}
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
            <div className="text-sm text-gray-500 italic">Your saved research trails will appear here.</div>
          )}
        </section>
      </div>

      {/* Curated Holdings / Dissertations */}
      <div style={{ paddingTop: "2rem", borderTop: "1px solid var(--border-light)", marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-primary)", fontWeight: 700 }}>
            Curated Holdings &amp; Trending Dissertations
          </p>
          <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            {displayAcquisitions.length} resources
          </p>
        </div>

        <div style={{ columns: "3", columnGap: "1.25rem" }}>
          {displayAcquisitions.map((item, index) => (
            <Reveal key={item.id} delay={0.05 * (index % 3)}>
              <div className="acq-card" onClick={() => onQuery(item.title)}>
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
