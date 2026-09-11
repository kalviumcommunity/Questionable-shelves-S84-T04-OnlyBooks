import { useState, useEffect, KeyboardEvent } from "react";
import type { Query, User } from "../App";
import { ACQUISITIONS, LibraryItem } from "../data/libraryKnowledge";
import { catalogApi, CatalogMetrics, CatalogDocument } from "../services/api";
import DepositModal from "../components/DepositModal";

type FilterType = "all" | "papers" | "theses" | "reserves";

interface Props {
  user: User;
  onQuery: (question: string, collectionFilter?: string) => void;
  recentQueries: Query[];
  onSignOut: () => void;
}

export default function ResearchPortal({ user, onQuery, recentQueries, onSignOut }: Props) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
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
    <div
      className="min-h-full flex flex-col"
      style={{ fontFamily: "var(--font-sans)", background: "#FAFAFA" }}
    >
      {/* ── Navigation ── */}
      <header
        className="flex items-center justify-between px-8 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid #E5E7EB" }}
      >
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: "1.05rem",
            color: "#0F172A",
            letterSpacing: "-0.01em",
          }}
        >
          OnlyBooks · University Library Archive
        </div>
        <nav className="flex items-center gap-6">
          <NavLink onClick={() => setFilter("papers")}>Research Papers</NavLink>
          <NavLink onClick={() => setFilter("theses")}>Theses & Dissertations</NavLink>
          <NavLink onClick={() => setFilter("reserves")}>Course Reserves</NavLink>

          <button
            onClick={() => setIsDepositOpen(true)}
            style={{
              background: "#1C1C1C",
              color: "#FAFAFA",
              border: "1px solid #1C1C1C",
              padding: "0.25rem 0.65rem",
              fontSize: "0.68rem",
              letterSpacing: "0.03em",
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 0.12s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#0F172A")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#1C1C1C")}
            title="Deposit scholarly paper, thesis or syllabus to university archives"
          >
            + Deposit Manuscript
          </button>

          <button
            onClick={onSignOut}
            style={{
              background: "none",
              border: "none",
              fontSize: "0.75rem",
              color: "#9CA3AF",
              cursor: "pointer",
              padding: 0,
              transition: "color 0.12s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#1C1C1C")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#9CA3AF")}
          >
            Sign Out
          </button>
          <div
            style={{
              width: 30,
              height: 30,
              border: "1px solid #1C1C1C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.65rem",
              fontWeight: 600,
              color: "#1C1C1C",
              letterSpacing: "0.05em",
              cursor: "default",
              userSelect: "none",
            }}
            title={user.name}
          >
            {user.initials}
          </div>
        </nav>
      </header>

      {/* ── Main Grid ── */}
      <div className="flex-1 px-8 pt-14 pb-8">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: 0,
            borderBottom: "1px solid #E5E7EB",
            paddingBottom: "4rem",
          }}
        >
          {/* Left — manifesto */}
          <div style={{ paddingRight: "4rem", borderRight: "1px solid #E5E7EB" }}>
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.75rem",
                lineHeight: 1.35,
                fontStyle: "italic",
                fontWeight: 400,
                color: "#1C1C1C",
                marginBottom: "1.5rem",
              }}
            >
              "Synthesize university library holdings in seconds. Ask a question to begin."
            </p>
            <p
              style={{
                fontSize: "0.8rem",
                lineHeight: 1.7,
                color: "#6B7280",
                marginBottom: "2.5rem",
              }}
            >
              OnlyBooks connects university research papers, doctoral theses, and course materials
              into concise, citation-backed explanations — saving students from scrolling through dozens
              of unrelated documents for one verified answer.
            </p>

            <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: "1.5rem" }}>
              <p
                style={{
                  fontSize: "0.6rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "#6B7280",
                  marginBottom: "0.875rem",
                }}
              >
                Holdings at a Glance
              </p>
              {holdingsStats.map(([val, label]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid #E5E7EB",
                  }}
                >
                  <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#1C1C1C" }}>{val}</span>
                  <span style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — search */}
          <div style={{ paddingLeft: "4rem" }}>
            <p
              style={{
                fontSize: "0.6rem",
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "#6B7280",
                marginBottom: "1.25rem",
              }}
            >
              Begin Your Inquiry
            </p>

            {/* Collection Filter Chips */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
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
                    style={{
                      background: active ? "#1C1C1C" : "transparent",
                      color: active ? "#FAFAFA" : "#6B7280",
                      border: "1px solid " + (active ? "#1C1C1C" : "#E5E7EB"),
                      padding: "0.3rem 0.75rem",
                      fontSize: "0.68rem",
                      letterSpacing: "0.03em",
                      cursor: "pointer",
                      transition: "all 0.12s",
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* The key input — bottom border only, 2px, no rounding */}
            <div style={{ position: "relative", marginBottom: "1.25rem" }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Inquire about a research paper, thesis topic, or course reading…"
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${focused || input ? "#1C1C1C" : "#6B7280"}`,
                  outline: "none",
                  fontSize: "1.25rem",
                  fontFamily: "var(--font-serif)",
                  color: "#1C1C1C",
                  padding: "0.25rem 0 0.625rem",
                  transition: "border-color 0.15s",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
              <span style={{ fontSize: "0.68rem", color: "#9CA3AF" }}>
                Tip: Press <kbd style={{ border: "1px solid #E5E7EB", padding: "1px 4px", fontSize: "0.62rem" }}>Enter</kbd> to generate a citation-backed synthesis
              </span>
              <button
                onClick={submit}
                style={{
                  background: "#1C1C1C",
                  color: "#FAFAFA",
                  border: "none",
                  padding: "0.5rem 1.25rem",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-sans)",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#0F172A")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#1C1C1C")}
              >
                Submit Inquiry
              </button>
            </div>

            {/* Recent queries */}
            <div>
              <p
                style={{
                  fontSize: "0.6rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "#6B7280",
                  marginBottom: "0.625rem",
                }}
              >
                Recent Inquiries in the Archive
              </p>
              {recentQueries.slice(0, 4).map((q) => (
                <div
                  key={q.id}
                  onClick={() => onQuery(q.question, q.collectionFilter || "all")}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    padding: "0.75rem 0",
                    borderBottom: "1px solid #E5E7EB",
                    cursor: "pointer",
                  }}
                  onMouseOver={(e) => {
                    const el = e.currentTarget.querySelector(".ql") as HTMLElement;
                    if (el) el.style.color = "#1C1C1C";
                  }}
                  onMouseOut={(e) => {
                    const el = e.currentTarget.querySelector(".ql") as HTMLElement;
                    if (el) el.style.color = "#6B7280";
                  }}
                >
                  <span
                    className="ql"
                    style={{
                      fontSize: "0.8rem",
                      fontStyle: "italic",
                      color: "#6B7280",
                      transition: "color 0.12s",
                      flex: 1,
                    }}
                  >
                    {q.question}
                  </span>
                  <span style={{ fontSize: "0.65rem", color: "#9CA3AF", marginLeft: "1rem", flexShrink: 0 }}>
                    {q.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Recent Acquisitions & Trending Theses ── */}
        <div style={{ paddingTop: "3rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              borderBottom: "1px solid #E5E7EB",
              paddingBottom: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            <p
              style={{
                fontSize: "0.6rem",
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "#6B7280",
              }}
            >
              Curated University Holdings & Trending Dissertations
            </p>
            <p style={{ fontSize: "0.65rem", color: "#9CA3AF" }}>
              Showing {displayAcquisitions.length} cataloged resources
            </p>
          </div>

          {/* Masonry grid */}
          <div style={{ columns: "3", columnGap: "1rem" }}>
            {displayAcquisitions.map((item) => (
              <div
                key={item.id}
                onClick={() => onQuery(item.title)}
                style={{
                  breakInside: "avoid",
                  marginBottom: "1rem",
                  padding: "1.1rem",
                  border: "1px solid #E5E7EB",
                  background: "#FFFFFF",
                  cursor: "pointer",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "#1C1C1C";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "#E5E7EB";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span
                    style={{
                      fontSize: "0.58rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.14em",
                      color: "#9CA3AF",
                    }}
                  >
                    {item.field}
                  </span>
                  <span
                    style={{
                      fontSize: "0.54rem",
                      fontWeight: 600,
                      color: "#0F172A",
                      border: "1px solid #E5E7EB",
                      padding: "0.08rem 0.35rem",
                      background: "#F9FAFB",
                    }}
                  >
                    {item.collectionType}
                  </span>
                </div>

                <p
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "0.92rem",
                    lineHeight: 1.4,
                    color: "#1C1C1C",
                    fontWeight: 400,
                    marginBottom: "0.75rem",
                  }}
                >
                  {item.title}
                </p>

                <div
                  style={{
                    borderTop: "1px solid #F3F4F6",
                    paddingTop: "0.5rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.65rem", color: "#6B7280" }}>{item.author}</span>
                  <span style={{ fontSize: "0.6rem", color: "#9CA3AF" }}>
                    {item.callNumber} · {item.year}
                  </span>
                </div>
              </div>
            ))}
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

function NavLink({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
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
        fontSize: "0.8rem",
        color: hovered ? "#1C1C1C" : "#6B7280",
        textDecoration: "none",
        transition: "color 0.12s",
      }}
    >
      {children}
    </a>
  );
}
