import { useState, useEffect, KeyboardEvent } from "react";
import { ThemeToggle, type Query, type User } from "../App";
import { ACQUISITIONS } from "../data/libraryKnowledge";
import { catalogApi, CatalogMetrics, CatalogDocument } from "../services/api";
import DepositModal from "../components/DepositModal";
import Reveal from "../components/Reveal";
import UserMenu from "../components/UserMenu";
import NotificationPopover from "../components/NotificationPopover";

type FilterType = "all" | "papers" | "theses" | "reserves" | "press";

interface Props {
  user: User;
  onQuery: (question: string, collectionFilter?: string, fieldFilter?: string, eraFilter?: string) => void;
  recentQueries: Query[];
  onSignOut: () => void;
  onOpenGuide?: () => void;
}

export default function ResearchPortal({ user, onQuery, recentQueries, onSignOut, onOpenGuide }: Props) {
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [fieldFilter, setFieldFilter] = useState<string>("all");
  const [eraFilter, setEraFilter] = useState<string>("all");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [metrics, setMetrics] = useState<CatalogMetrics | null>(null);
  const [liveAcquisitions, setLiveAcquisitions] = useState<CatalogDocument[]>([]);
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  function getYearRange() {
    if (eraFilter === "classic") return { yearTo: "2014" };
    if (eraFilter === "modern") return { yearFrom: "2015", yearTo: "2021" };
    if (eraFilter === "contemporary") return { yearFrom: "2022" };
    return {};
  }

  function handleRefreshCatalog() {
    const { yearFrom, yearTo } = getYearRange();
    catalogApi.getMetrics().then((m) => setMetrics(m)).catch(() => {});
    catalogApi.getAcquisitions(
      filter,
      catalogSearch,
      sortBy,
      yearFrom,
      yearTo,
      60,
      0,
      fieldFilter !== "all" ? fieldFilter : undefined
    ).then((res) => {
      if (res.items && res.items.length > 0) setLiveAcquisitions(res.items);
    }).catch(() => {});
  }

  useEffect(() => {
    catalogApi.getMetrics().then((m) => setMetrics(m)).catch(() => {});
  }, []);

  useEffect(() => {
    const { yearFrom, yearTo } = getYearRange();
    catalogApi.getAcquisitions(
      filter,
      catalogSearch,
      sortBy,
      yearFrom,
      yearTo,
      60,
      0,
      fieldFilter !== "all" ? fieldFilter : undefined
    ).then((res) => {
      if (res.items) setLiveAcquisitions(res.items);
    }).catch(() => {});
  }, [filter, fieldFilter, eraFilter, catalogSearch, sortBy]);

  function submit() {
    const trimmed = input.trim();
    if (trimmed) onQuery(trimmed, filter, fieldFilter, eraFilter);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") submit();
  }

  const displayAcquisitions = liveAcquisitions.length > 0
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

  const holdingsStats = [
    { value: metrics ? `${metrics.total_papers.toLocaleString()}+` : "148,000+", label: "Research Papers", icon: "📄" },
    { value: metrics ? `${metrics.total_theses.toLocaleString()}+` : "24,500+", label: "Doctoral Theses", icon: "🎓" },
    { value: metrics ? `${metrics.total_reserves.toLocaleString()}+` : "6,200+", label: "Course Reserves", icon: "📚" },
    { value: metrics ? metrics.last_sync : "Live", label: "Catalog Sync", icon: "🔄" },
  ];

  const filters: { id: FilterType; label: string }[] = [
    { id: "all",      label: "All Collections" },
    { id: "papers",   label: "Research Papers" },
    { id: "theses",   label: "Theses & Dissertations" },
    { id: "reserves", label: "Course Reserves" },
  ];

  return (
    <div className="flex flex-col flex-1">
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
        .stat-card {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 1rem 1.25rem;
          border-radius: 16px;
          background: var(--glass-bg);
          border: 1.5px solid rgba(255,255,255,0.88);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          transition: all 0.25s ease;
        }
        body.dark .stat-card { border-color: rgba(255,255,255,0.1); }
        .stat-card:hover { transform: translateY(-2px); box-shadow: var(--glass-shadow-hover); }
        .search-bar-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-bar-wrapper svg.search-icon {
          position: absolute;
          left: 1rem;
          width: 18px; height: 18px;
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
        .recent-q-item {
          padding: 0.9rem 1.25rem;
          background: rgba(255,255,255,0.55);
          border: 1.5px solid rgba(255,255,255,0.88);
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          transition: all 0.25s ease;
          backdrop-filter: blur(12px);
        }
        body.dark .recent-q-item { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }
        .recent-q-item:hover {
          background: rgba(255,255,255,0.75);
          transform: translateX(4px);
          border-color: rgba(255,255,255,0.95);
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
        }
        body.dark .recent-q-item:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.14); }
      `}</style>

      {/* ── Navigation ── */}
      <header className="glass-nav flex items-center justify-between px-6 py-3 flex-shrink-0 relative z-10">
        <button
          onClick={onOpenGuide}
          style={{
            display: "flex", alignItems: "center", gap: "0.45rem",
            background: "none", border: "none", padding: 0,
            cursor: "pointer", color: "var(--text-primary)",
          }}
        >
          <div style={{ width: "26px", height: "26px", borderRadius: "7px", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="var(--bg-primary)">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.025em" }}>
            OnlyBooks
          </span>
        </button>

        <nav className="flex items-center gap-5">
          <NavLink active={filter === "papers"} onClick={() => setFilter("papers")}>Research Papers</NavLink>
          <NavLink active={filter === "theses"} onClick={() => setFilter("theses")}>Theses</NavLink>
          <NavLink active={filter === "reserves"} onClick={() => setFilter("reserves")}>Reserves</NavLink>

          <div style={{ width: "1px", height: "16px", background: "var(--border-strong)", opacity: 0.6 }} />

          <button
            onClick={() => setIsDepositOpen(true)}
            className="btn-primary"
            style={{ padding: "0.38rem 0.9rem", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.3rem" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Deposit
          </button>

          <button onClick={onOpenGuide} className="btn-ghost" style={{ fontSize: "0.78rem", padding: "0.38rem 0.75rem" }}>
            Guide
          </button>

          <ThemeToggle />
          <NotificationPopover />
          <UserMenu user={user} onSignOut={onSignOut} />
        </nav>
      </header>

      {/* ── Main Content ── */}
      <div className="flex-1 px-8 pt-12 pb-12 z-10">
        <div className="max-w-7xl mx-auto">

          <div className="grid grid-cols-3 gap-12 mb-12">
            {/* ── Left Column ── */}
            <div className="col-span-1">
              <Reveal delay={0}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0.8rem", background: "var(--accent-light)", border: "1px solid var(--border-strong)", borderRadius: "20px", marginBottom: "1.25rem" }}>
                  <span style={{ fontSize: "0.8rem" }}>🎓</span>
                  <span style={{ fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, color: "var(--text-primary)" }}>
                    Academic Research Engine
                  </span>
                </div>

                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.85rem", lineHeight: 1.25, fontWeight: 700, marginBottom: "1rem", letterSpacing: "-0.035em", color: "var(--text-primary)" }}>
                  Stop scrolling through dozens of disconnected documents.
                </h2>
                <p style={{ fontSize: "0.875rem", lineHeight: 1.75, color: "var(--text-secondary)", marginBottom: "2rem" }}>
                  University libraries hold research papers, theses, and course reserves — yet finding one direct, citation-backed explanation used to require hours of manual skimming. OnlyBooks synthesizes holdings with verified footnotes and curated literature recommendations.
                </p>

                {/* Stat Cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "0.25rem", opacity: 0.7 }}>
                    Holdings at a Glance
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                    {holdingsStats.map(({ value, label, icon }) => (
                      <div key={label} className="stat-card">
                        <span style={{ fontSize: "1.1rem" }}>{icon}</span>
                        <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{value}</span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", lineHeight: 1.3 }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>

            {/* ── Right Column ── */}
            <div className="col-span-2">
              <Reveal delay={0.15}>
                <div className="glass-panel" style={{ padding: "2.5rem", marginBottom: "2.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
                    <p style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--text-secondary)", margin: 0, fontWeight: 700, opacity: 0.75 }}>
                      Begin Your Inquiry
                    </p>
                    
                    {/* Publication Era Selector */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 600 }}>Era:</span>
                      <select
                        value={eraFilter}
                        onChange={(e) => setEraFilter(e.target.value)}
                        style={{
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-strong)",
                          borderRadius: "8px",
                          padding: "0.2rem 0.6rem",
                          fontSize: "0.72rem",
                          color: "var(--text-primary)",
                          outline: "none",
                          cursor: "pointer",
                        }}
                      >
                        <option value="all">All Eras</option>
                        <option value="classic">Classics (&lt;2015)</option>
                        <option value="modern">Modern (2015–2021)</option>
                        <option value="contemporary">Contemporary (2022–2026)</option>
                      </select>
                    </div>
                  </div>

                  {/* Collection Filter Chips */}
                  <div style={{ display: "flex", gap: "0.45rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                    {[
                      { id: "all",      label: "All Collections" },
                      { id: "reserves", label: "📚 Course Reserves" },
                      { id: "papers",   label: "📄 Faculty Research" },
                      { id: "theses",   label: "🎓 Theses & Dissertations" },
                      { id: "press",    label: "🏛️ University Press" },
                    ].map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setFilter(c.id as FilterType)}
                        className={`portal-filter-chip${filter === c.id ? " active" : ""}`}
                        style={{ fontSize: "0.74rem", padding: "0.3rem 0.8rem" }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  {/* Academic Discipline Ribbon */}
                  <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1.25rem", flexWrap: "wrap", borderTop: "1px solid var(--border-light)", paddingTop: "0.85rem" }}>
                    <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-secondary)", alignSelf: "center", marginRight: "0.4rem", fontWeight: 700 }}>
                      Discipline:
                    </span>
                    {[
                      { id: "all", label: "All Disciplines", icon: "🌐" },
                      { id: "Computer Science", label: "AI & Computing", icon: "⚡" },
                      { id: "Quantum", label: "Quantum Info", icon: "⚛️" },
                      { id: "Biomedical", label: "Genomics", icon: "🧬" },
                      { id: "Agricultural", label: "Food & Climate", icon: "🌱" },
                      { id: "Economics", label: "Economics & Games", icon: "📈" },
                      { id: "Law", label: "Law & Society", icon: "⚖️" },
                      { id: "Philosophy", label: "Philosophy", icon: "🔬" },
                    ].map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setFieldFilter(d.id)}
                        className="btn-ghost"
                        style={{
                          fontSize: "0.7rem",
                          padding: "0.22rem 0.6rem",
                          borderRadius: "14px",
                          border: "1px solid",
                          borderColor: fieldFilter === d.id ? "var(--accent)" : "var(--border-strong)",
                          background: fieldFilter === d.id ? "var(--accent-light)" : "var(--bg-secondary)",
                          color: fieldFilter === d.id ? "var(--text-primary)" : "var(--text-secondary)",
                          fontWeight: fieldFilter === d.id ? 700 : 500,
                          cursor: "pointer",
                          transition: "all 0.18s ease",
                        }}
                      >
                        <span style={{ marginRight: "0.25rem" }}>{d.icon}</span>
                        <span>{d.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Search Bar */}
                  <div className="search-bar-wrapper" style={{ marginBottom: "1.25rem" }}>
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
                        fieldFilter === "Quantum"
                          ? "Inquire about qubits, Shor's algorithm, error correction…"
                          : fieldFilter === "Biomedical"
                          ? "Inquire about CRISPR-Cas9, RNA editing, epidemic modeling…"
                          : fieldFilter === "Agricultural"
                          ? "Inquire about planetary health diet, food security, tipping points…"
                          : fieldFilter === "Economics"
                          ? "Inquire about Nash equilibrium, r > g capital wealth, mechanism design…"
                          : fieldFilter === "Law"
                          ? "Inquire about Habermas legal legitimacy, constitutional design…"
                          : fieldFilter === "Philosophy"
                          ? "Inquire about paradigm shifts, Popper falsification, normal science…"
                          : "Inquire about a research topic, thesis, or reading…"
                      }
                    />
                    <button className="search-submit-btn" onClick={submit}>Submit</button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                      Press{" "}
                      <kbd style={{ background: "var(--accent-light)", padding: "2px 7px", borderRadius: "5px", color: "var(--text-primary)", fontFamily: "var(--font-sans)", fontSize: "0.7rem", border: "1px solid var(--border-strong)" }}>
                        Enter
                      </kbd>{" "}
                      to generate a citation-grounded response
                    </span>
                    {(fieldFilter !== "all" || filter !== "all" || eraFilter !== "all") && (
                      <button
                        onClick={() => { setFilter("all"); setFieldFilter("all"); setEraFilter("all"); }}
                        className="btn-ghost"
                        style={{ fontSize: "0.68rem", color: "var(--accent)", textDecoration: "underline", padding: 0 }}
                      >
                        Reset active filters
                      </button>
                    )}
                  </div>

                  {/* Recommended Student Research Topics */}
                  <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "1.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "0.8rem" }}>💡</span>
                      <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-secondary)" }}>
                        {fieldFilter === "all" ? "Curated Syllabus Topics & Recommended Inquiries:" : `Recommended ${fieldFilter} Inquiries:`}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {(
                        fieldFilter === "Quantum"
                          ? [
                              { label: "⚛️ Qubit Superposition & Entangled States", q: "What is quantum superposition and how do entangled multi-qubit systems behave?" },
                              { label: "🔑 Quantum Fourier Transform & Shor's Factoring", q: "How does Shor's algorithm achieve polynomial time factoring via quantum Fourier transform?" },
                              { label: "🛡️ Quantum Error Correction & Threshold Theorems", q: "How do quantum error-correcting codes protect logical qubits from phase-flip decoherence?" },
                            ]
                          : fieldFilter === "Biomedical"
                          ? [
                              { label: "🧬 CRISPR-Cas9 Dual-RNA-Guided Endonuclease", q: "How does CRISPR-Cas9 endonuclease achieve targeted double-strand breaks?" },
                              { label: "🦠 Compartmental SEIR Modeling in Epidemic Surveillance", q: "How do SEIR differential models estimate basic reproduction numbers in pandemics?" },
                              { label: "🧠 Synaptic Plasticity & Long-Term Potentiation", q: "What cellular mechanisms govern synaptic plasticity in memory consolidation?" },
                            ]
                          : fieldFilter === "Agricultural"
                          ? [
                              { label: "🌱 Planetary Health Diets & Agricultural Boundaries", q: "food" },
                              { label: "🌾 Food Sovereignty & Corporate Agroecology Commons", q: "What is food sovereignty and how does it challenge speculative grain regimes?" },
                              { label: "🌍 Nine Planetary Boundaries Safe Operating Space", q: "What are the planetary boundaries identified by Rockström and Steffen?" },
                              { label: "🧊 Cryosphere Tipping Points & Climate Feedbacks", q: "What are the non-linear tipping points in Earth's climate system?" },
                            ]
                          : fieldFilter === "Economics"
                          ? [
                              { label: "📈 Nash Equilibrium in Non-Cooperative Games", q: "What defines a Nash equilibrium in finite N-person non-cooperative games?" },
                              { label: "💰 Capital in the 21st Century & Wealth Divergence (r > g)", q: "How does Thomas Piketty formulate the fundamental inequality of wealth concentration?" },
                              { label: "🧠 System 1 & System 2 Cognitive Biases in Decisions", q: "How do cognitive heuristics and prospect theory explain human decision making?" },
                            ]
                          : fieldFilter === "Law"
                          ? [
                              { label: "⚖️ Discourse Theory of Democratic Legitimacy", q: "How does Habermas ground legal legitimacy in discursive procedure?" },
                              { label: "🏛️ Constituent Power in Post-Conflict Transitions", q: "How does constituent power operate in post-conflict constitutional design?" },
                              { label: "💻 Algorithmic Scoring Opacity in Digital Finance", q: "How does Frank Pasquale critique black-box algorithmic governance?" },
                            ]
                          : fieldFilter === "Philosophy"
                          ? [
                              { label: "🔬 Paradigm Shifts & Incommensurability (Kuhn)", q: "How do scientific paradigms shift according to Thomas Kuhn?" },
                              { label: "🧪 Deductive Falsification & Demarcation (Popper)", q: "How does Karl Popper formulate empirical falsification versus inductivism?" },
                            ]
                          : [
                              { label: "🌱 Sustainable Food Systems & Planetary Health", q: "food" },
                              { label: "⚡ Attention Mechanisms in Transformers", q: "How does self-attention mechanism eliminate recurrence bottlenecks?" },
                              { label: "⚛️ Quantum Qubits & Shor's Factoring", q: "How does Shor's algorithm achieve polynomial time factoring via quantum Fourier transform?" },
                              { label: "🧬 CRISPR-Cas9 RNA-Guided Gene Editing", q: "How does CRISPR-Cas9 endonuclease achieve targeted double-strand breaks?" },
                              { label: "📈 Nash Equilibrium in Non-Cooperative Games", q: "What defines a Nash equilibrium in finite N-person non-cooperative games?" },
                              { label: "⚖️ Deliberative Democratic Legitimacy", q: "How does Habermas ground legal legitimacy in discursive procedure?" },
                              { label: "🔬 Paradigm Shifts & Normal Science", q: "How do scientific paradigms shift according to Thomas Kuhn?" },
                            ]
                      ).map((topic) => (
                        <button
                          key={topic.label}
                          onClick={() => onQuery(topic.q, filter, fieldFilter, eraFilter)}
                          className="btn-ghost"
                          style={{
                            fontSize: "0.72rem",
                            padding: "0.35rem 0.75rem",
                            borderRadius: "16px",
                            border: "1px solid var(--border-strong)",
                            background: "var(--bg-secondary)",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            textAlign: "left",
                          }}
                        >
                          {topic.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Inquiries */}
                <div>
                  <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-secondary)", marginBottom: "0.75rem", fontWeight: 700, opacity: 0.75 }}>
                    Recent Inquiries
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
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
                          <span style={{ fontSize: "0.855rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.question}</span>
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", flexShrink: 0 }}>{q.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>

          {/* ── Acquisitions ── */}
          <div style={{ paddingTop: "2rem", borderTop: "1px solid var(--border-light)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
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
                      Filtered: {[filter !== "all" ? filter : null, fieldFilter !== "all" ? fieldFilter : null, eraFilter !== "all" ? eraFilter : null].filter(Boolean).join(" · ")}
                    </span>
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
                <Reveal key={item.id} delay={0.06 * (index % 3)}>
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
      </div>

      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onSuccess={() => { handleRefreshCatalog(); }}
      />
    </div>
  );
}

function NavLink({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="#"
      onClick={(e) => { e.preventDefault(); if (onClick) onClick(); }}
      onMouseOver={() => setHovered(true)}
      onMouseOut={() => setHovered(false)}
      style={{
        fontSize: "0.82rem",
        fontWeight: active ? 600 : 500,
        color: active || hovered ? "var(--text-primary)" : "var(--text-secondary)",
        textDecoration: "none",
        transition: "color 0.18s",
        position: "relative",
        letterSpacing: "0.005em",
      }}
    >
      {children}
      {active && (
        <span className="nav-active-dot" />
      )}
    </a>
  );
}
