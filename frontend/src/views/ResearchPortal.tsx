import { useState, useEffect, KeyboardEvent } from "react";
import { ThemeToggle, type Query, type User } from "../App";
import { ACQUISITIONS, LibraryItem } from "../data/libraryKnowledge";
import { catalogApi, CatalogMetrics, CatalogDocument } from "../services/api";
import DepositModal from "../components/DepositModal";
import Reveal from "../components/Reveal";
import UserMenu from "../components/UserMenu";

type FilterType = "all" | "papers" | "theses" | "reserves";

interface Props {
  user: User;
  onQuery: (question: string, collectionFilter?: string) => void;
  recentQueries: Query[];
  onSignOut: () => void;
  onOpenGuide?: () => void;
}

export default function ResearchPortal({ user, onQuery, recentQueries, onSignOut, onOpenGuide }: Props) {
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [metrics, setMetrics] = useState<CatalogMetrics | null>(null);
  const [liveAcquisitions, setLiveAcquisitions] = useState<CatalogDocument[]>([]);
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  function handleRefreshCatalog() {
    catalogApi.getMetrics().then((m) => setMetrics(m)).catch(() => {});
    catalogApi.getAcquisitions(filter).then((res) => {
      if (res.items && res.items.length > 0) setLiveAcquisitions(res.items);
    }).catch(() => {});
  }

  useEffect(() => {
    catalogApi.getMetrics()
      .then((m) => setMetrics(m))
      .catch(() => {});
  }, []);

  useEffect(() => {
    catalogApi.getAcquisitions(filter)
      .then((res) => {
        if (res.items && res.items.length > 0) {
          setLiveAcquisitions(res.items);
        }
      })
      .catch(() => {});
  }, [filter]);

  function submit() {
    const trimmed = input.trim();
    if (trimmed) {
      onQuery(trimmed, filter);
    }
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
    [metrics ? `${metrics.total_papers.toLocaleString()}+` : "148,000+", "University research papers"],
    [metrics ? `${metrics.total_theses.toLocaleString()}+` : "24,500+", "Doctoral & master's theses"],
    [metrics ? `${metrics.total_reserves.toLocaleString()}+` : "6,200+", "Course syllabus reserves"],
    [metrics ? metrics.last_sync : "Live Sync", "University library catalogs"],
  ];

  return (
    <div className="flex flex-col flex-1">
      {/* ── Navigation ── */}
      <header className="glass-nav flex items-center justify-between px-8 py-4 flex-shrink-0 relative z-10">
        <button
          onClick={onOpenGuide}
          title="Reader's Guide"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1.2rem",
            letterSpacing: "-0.02em",
            cursor: "pointer",
            color: "var(--text-primary)"
          }}
        >
          OnlyBooks
        </button>
        <nav className="flex items-center gap-6">
          <NavLink active={filter === "papers"} onClick={() => setFilter("papers")}>Research Papers</NavLink>
          <NavLink active={filter === "theses"} onClick={() => setFilter("theses")}>Theses</NavLink>
          <NavLink active={filter === "reserves"} onClick={() => setFilter("reserves")}>Reserves</NavLink>

          <button
            onClick={() => setIsDepositOpen(true)}
            className="btn-primary"
            style={{ padding: "0.4rem 1rem", fontSize: "0.75rem", letterSpacing: "0.03em" }}
          >
            + Deposit
          </button>

          <button
            onClick={onOpenGuide}
            className="btn-ghost"
            style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem" }}
          >
            Guide
          </button>
          
          <ThemeToggle />

          <UserMenu user={user} onSignOut={onSignOut} />
        </nav>
      </header>

      {/* ── Main Grid ── */}
      <div className="flex-1 px-8 pt-16 pb-12 z-10">
        <div className="max-w-7xl mx-auto">
          
          <div className="grid grid-cols-3 gap-16 mb-16">
            {/* Left — manifesto */}
            <div className="col-span-1">
              <Reveal delay={0}>
                <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "2rem",
                  lineHeight: 1.2,
                  fontWeight: 600,
                  marginBottom: "1.5rem",
                  letterSpacing: "-0.03em",
                  color: "var(--text-primary)"
                }}
              >
                Synthesize library holdings in seconds.
              </h2>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: "2.5rem" }}>
                OnlyBooks connects research papers, theses, and course materials into concise, citation-backed explanations.
              </p>

              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                  Holdings at a Glance
                </p>
                {holdingsStats.map(([val, label], i) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      padding: "0.75rem 0",
                      borderBottom: i === holdingsStats.length - 1 ? "none" : "1px solid var(--border-light)",
                    }}
                  >
                    <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>{val}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{label}</span>
                  </div>
                ))}
              </div>
              </Reveal>
            </div>

            {/* Right — search */}
            <div className="col-span-2">
              <Reveal delay={0.2}>
              <div className="glass-panel" style={{ padding: "3rem", marginBottom: "3rem" }}>
                <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--text-primary)", marginBottom: "1.5rem", fontWeight: 600 }}>
                  Begin Your Inquiry
                </p>

                {/* Collection Filter Chips */}
                <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", flexWrap: "wrap" }}>
                  {[
                    { id: "all", label: "All Collections" },
                    { id: "papers", label: "Research Papers" },
                    { id: "theses", label: "Theses & Dissertations" },
                    { id: "reserves", label: "Course Reserves" },
                  ].map((c) => {
                    const active = filter === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setFilter(c.id as FilterType)}
                        className={active ? "btn-primary" : "btn-ghost"}
                        style={{ padding: "0.5rem 1.25rem", fontSize: "0.75rem", border: active ? "none" : "1px solid rgba(255,255,255,0.8)" }}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ marginBottom: "2rem" }}>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKey}
                    className="input-minimal"
                    style={{ width: "100%", fontSize: "1.1rem", padding: "1rem 1.25rem", borderRadius: "12px" }}
                    placeholder="Inquire about a research topic, thesis, or reading…"
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Press <kbd style={{ background: "var(--accent-light)", padding: "2px 6px", borderRadius: "4px", color: "var(--text-primary)" }}>Enter</kbd> to generate synthesis
                  </span>
                  <button onClick={submit} className="btn-primary" style={{ padding: "0.75rem 2rem", fontSize: "0.9rem" }}>
                    Submit Inquiry
                  </button>
                </div>
              </div>

              {/* Recent queries */}
              <div>
                <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                  Recent Inquiries
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {recentQueries.slice(0, 4).map((q) => (
                    <div
                      key={q.id}
                      className="glass-panel-hover"
                      onClick={() => onQuery(q.question, q.collectionFilter || "all")}
                      style={{
                        padding: "1rem 1.5rem",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "rgba(255, 255, 255, 0.6)",
                        borderRadius: "16px",
                        border: "1px solid rgba(255, 255, 255, 0.9)"
                      }}
                    >
                      <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", flex: 1 }}>
                        {q.question}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginLeft: "1rem", flexShrink: 0 }}>
                        {q.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              </Reveal>
            </div>
          </div>

          {/* ── Recent Acquisitions ── */}
          <div style={{ paddingTop: "2rem", borderTop: "1px solid var(--border-light)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2rem" }}>
              <p style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--text-primary)", fontWeight: 600 }}>
                Curated Holdings & Trending Dissertations
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Showing {displayAcquisitions.length} resources
              </p>
            </div>

            {/* Masonry grid */}
            <div style={{ columns: "3", columnGap: "1.5rem" }}>
              {displayAcquisitions.map((item, index) => (
                <Reveal key={item.id} delay={0.1 * (index % 3)}>
                <div
                  className="glass-panel glass-panel-hover"
                  onClick={() => onQuery(item.title)}
                  style={{
                    breakInside: "avoid",
                    marginBottom: "1.5rem",
                    padding: "1.5rem",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--text-secondary)", fontWeight: 600 }}>
                      {item.field}
                    </span>
                    <span style={{ fontSize: "0.6rem", fontWeight: 600, color: "var(--text-primary)", border: "1px solid var(--border-strong)", padding: "0.2rem 0.5rem", borderRadius: "12px", background: "var(--accent-light)" }}>
                      {item.collectionType}
                    </span>
                  </div>

                  <p style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", lineHeight: 1.4, color: "var(--text-primary)", fontWeight: 500, marginBottom: "1rem" }}>
                    {item.title}
                  </p>

                  <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{item.author}</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                      {item.callNumber} · {item.year}
                    </span>
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
        onSuccess={() => {
          handleRefreshCatalog();
        }}
      />
    </div>
  );
}

function NavLink({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        if (onClick) onClick();
      }}
      onMouseOver={() => setHovered(true)}
      onMouseOut={() => setHovered(false)}
      style={{
        fontSize: "0.85rem",
        fontWeight: active ? 600 : 400,
        color: active || hovered ? "var(--text-primary)" : "var(--text-secondary)",
        textDecoration: "none",
        transition: "color 0.2s",
        position: "relative"
      }}
    >
      {children}
      {active && (
        <div style={{ position: "absolute", bottom: "-4px", left: "0", width: "100%", height: "2px", background: "var(--accent)", borderRadius: "2px" }} />
      )}
    </a>
  );
}
