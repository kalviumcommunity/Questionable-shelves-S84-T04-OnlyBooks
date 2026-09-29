import React, { useState } from "react";
import type { User } from "../../App";

interface FacultyDashboardProps {
  user: User;
  onOpenDeposit?: () => void;
  onQuery?: (question: string) => void;
}

const DEPOSITED_MANUSCRIPTS = [
  {
    id: "doc-a1",
    title: "The Epistemology of Scientific Consensus Formation",
    callNumber: "Q175.K84 2024",
    chapters: 3,
    pages: 218,
    year: "2024",
    citationsCount: 78,
    status: "Indexed & Active",
    field: "Philosophy of Science",
  },
  {
    id: "doc-a2",
    title: "Adult Neuroplasticity and Second-Language Acquisition",
    callNumber: "THES-2024-COG-092",
    chapters: 3,
    pages: 194,
    year: "2024",
    citationsCount: 52,
    status: "Indexed & Active",
    field: "Cognitive Neuroscience",
  },
  {
    id: "doc-a3",
    title: "Constituent Power and Constitutional Design in Post-Conflict States",
    callNumber: "K3165.L68 2024",
    chapters: 3,
    pages: 341,
    year: "2024",
    citationsCount: 18,
    status: "Indexed & Active",
    field: "Constitutional Law",
  },
];

const CITATION_BREAKDOWN = [
  { section: "Ch. 2: Incommensurability & Epistemology", count: 48, percentage: 62 },
  { section: "Ch. 1: Critical Period Hypotheses Re-examined", count: 34, percentage: 44 },
  { section: "Ch. 3: Consensus Formation in High-Stakes Inquiry", count: 26, percentage: 33 },
  { section: "Part I: The Paradox of Constituent Authority", count: 18, percentage: 23 },
];

const RECENT_STUDENT_INQUIRIES = [
  { question: "How do anomalies destabilize institutional certainty in scientific paradigms?", time: "28 mins ago", citedDoc: "Epistemology of Scientific Consensus" },
  { question: "Adult neuroplasticity pathways in late bilingual acquisition", time: "2 hours ago", citedDoc: "Adult Neuroplasticity & L2" },
  { question: "Judicial review of constitutional amendability and basic structure", time: "5 hours ago", citedDoc: "Constituent Power in Post-Conflict States" },
];

export const FacultyDashboard: React.FC<FacultyDashboardProps> = ({ user, onOpenDeposit, onQuery }) => {
  const [facultySearch, setFacultySearch] = useState("");

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (facultySearch.trim() && onQuery) {
      onQuery(facultySearch.trim());
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      {/* ── Console Header Banner ── */}
      <section className="glass-panel p-6 rounded-2xl border border-gray-200 dark:border-gray-800 relative overflow-hidden">
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: "9999px", background: "var(--accent-light)", color: "var(--text-primary)" }}>
                  Institutional Faculty Portal
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  {user.affiliation || "Faculty of Research"}
                </span>
              </div>
              <h1 className="text-2xl font-bold font-display mb-1 text-primary">
                Faculty Archive Console
              </h1>
              <p className="text-sm text-gray-500 max-w-2xl">
                Deposit academic manuscripts, curate course reserves for enrolled cohorts, and track student citation reach across the university archive.
              </p>
            </div>

            <div className="flex gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={onOpenDeposit}
                className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5"
              >
                <span>+</span> Upload Manuscript
              </button>
              <button
                type="button"
                className="btn-secondary px-4 py-2 text-sm"
                onClick={() => alert("Course Reserve syllabus linking module will open in the upcoming term.")}
              >
                📚 Create Course Reserve
              </button>
            </div>
          </div>

          {/* Quick Library Search for Faculty */}
          <form onSubmit={handleSearchSubmit} className="mt-5" style={{ display: "flex", gap: "0.5rem", maxWidth: "680px" }}>
            <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
              <svg style={{ position: "absolute", left: "0.85rem", width: "16px", height: "16px", color: "var(--text-secondary)" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={facultySearch}
                onChange={(e) => setFacultySearch(e.target.value)}
                placeholder="Search archive or run citation verification query..."
                className="input-minimal"
                style={{ width: "100%", paddingLeft: "2.4rem", paddingRight: "1rem", fontSize: "0.85rem", height: "38px" }}
              />
            </div>
            <button type="submit" className="btn-secondary px-4 py-1.5 text-xs font-semibold">
              Inquire
            </button>
          </form>
        </div>
      </section>

      {/* ── Key Performance Metrics ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Citations", value: "148", note: "+14% this academic term", icon: "📊" },
          { label: "Deposited Works", value: `${DEPOSITED_MANUSCRIPTS.length}`, note: "All indexed in vector DB", icon: "📄" },
          { label: "Student Inquiries", value: "312", note: "Across 8 disciplines", icon: "🎓" },
          { label: "Grounding Score", value: "98.4%", note: "Verified quote accuracy", icon: "🛡️" },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel p-4 rounded-xl flex flex-col justify-between">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600 }}>{stat.label}</span>
              <span style={{ fontSize: "1.1rem" }}>{stat.icon}</span>
            </div>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              {stat.value}
            </p>
            <span style={{ fontSize: "0.68rem", color: "#16a34a", marginTop: "0.25rem", fontWeight: 500 }}>
              {stat.note}
            </span>
          </div>
        ))}
      </div>

      {/* ── Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Deposited Manuscripts */}
        <section className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 className="text-base font-bold font-display text-primary flex items-center gap-2">
                <span>📚</span> My Deposited Manuscripts
              </h2>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                {DEPOSITED_MANUSCRIPTS.length} archived holdings
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {DEPOSITED_MANUSCRIPTS.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    padding: "0.9rem 1rem",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.4)",
                    border: "1px solid var(--border-light)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-light)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.4)")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-secondary)" }}>
                      {doc.field}
                    </span>
                    <span style={{ fontSize: "0.65rem", color: "#16a34a", fontWeight: 600, background: "rgba(22,163,74,0.1)", padding: "0.15rem 0.5rem", borderRadius: "9999px" }}>
                      ● {doc.status}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-serif)" }}>
                    {doc.title}
                  </p>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem", paddingTop: "0.35rem", borderTop: "1px solid var(--border-light)", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                    <span>{doc.callNumber} · {doc.chapters} ch · {doc.pages} pg</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{doc.citationsCount} citations</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-light)" }}>
            <button
              onClick={onOpenDeposit}
              className="btn-secondary w-full py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <span>+</span> Ingest New Publication or Reading Pack
            </button>
          </div>
        </section>

        {/* Right Column: Citation Analytics & Inquiries */}
        <section className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 className="text-base font-bold font-display text-primary flex items-center gap-2">
                <span>📈</span> Citation Analytics &amp; Scholarly Reach
              </h2>
              <span style={{ fontSize: "0.72rem", color: "#16a34a", fontWeight: 600 }}>
                Live Streamed
              </span>
            </div>

            {/* Top Cited Sections */}
            <div style={{ marginBottom: "1.25rem" }}>
              <p style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.6rem" }}>
                Top Cited Sections by Students
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {CITATION_BREAKDOWN.map((item) => (
                  <div key={item.section} style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <span style={{ color: "var(--text-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%" }}>
                        {item.section}
                      </span>
                      <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                        {item.count} citations
                      </span>
                    </div>
                    <div style={{ width: "100%", height: "4px", background: "var(--border-strong)", borderRadius: "9999px", overflow: "hidden" }}>
                      <div style={{ width: `${item.percentage}%`, height: "100%", background: "var(--accent)", borderRadius: "9999px" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Inquiries */}
            <div>
              <p style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Recent Student Inquiries Citing Your Work
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {RECENT_STUDENT_INQUIRIES.map((inq, idx) => (
                  <div
                    key={idx}
                    onClick={() => onQuery && onQuery(inq.question)}
                    style={{
                      padding: "0.55rem 0.75rem",
                      borderRadius: "10px",
                      background: "rgba(255,255,255,0.45)",
                      border: "1px solid var(--border-light)",
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-light)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.45)")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem" }}>
                      <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        &ldquo;{inq.question}&rdquo;
                      </p>
                      <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", flexShrink: 0 }}>
                        {inq.time}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)", opacity: 0.8 }}>
                      Cited: {inq.citedDoc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FacultyDashboard;
