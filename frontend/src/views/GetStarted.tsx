import { User } from "../App";

interface Props {
  user?: User | null;
  onBack: () => void;
}

export default function GetStarted({ user, onBack }: Props) {
  return (
    <div
      className="min-h-full flex flex-col"
      style={{ fontFamily: "var(--font-sans)", background: "#FAFAFA" }}
    >
      <header
        className="flex items-center justify-between px-8 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid #E5E7EB" }}
      >
        <div
          onClick={onBack}
          title="Back to Archive"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: "1.05rem",
            color: "#0F172A",
            letterSpacing: "-0.01em",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          OnlyBooks · University Library Archive
        </div>
        <nav className="flex items-center gap-6">
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              fontSize: "0.75rem",
              color: "#6B7280",
              cursor: "pointer",
              padding: 0,
              transition: "color 0.12s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#1C1C1C")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#6B7280")}
          >
            ← Back to Archive
          </button>
          {user && (
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
          )}
        </nav>
      </header>

      <main className="flex-1 px-8 py-14 max-w-4xl mx-auto w-full">
        <div style={{ marginBottom: "4rem" }}>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "2.5rem",
              lineHeight: 1.2,
              fontWeight: 500,
              color: "#1C1C1C",
              marginBottom: "1rem",
            }}
          >
            Reader's Guide to the Archive
          </h1>
          <p className="dense-text leading-relaxed" style={{ fontSize: "1.05rem", color: "#6B7280" }}>
            Welcome to the OnlyBooks digital reading room. This guide will help you navigate our collections, submit inquiries, and verify academic claims through our citation-backed synthesis engine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-x-20 md:gap-y-16">
          {/* Inquiry Submission */}
          <section className="p-6 border border-gray-200 bg-white/50">
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "#1C1C1C",
                marginBottom: "0.75rem",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              Inquiry Submission
            </h2>
            <p className="dense-text leading-relaxed" style={{ fontSize: "0.9rem" }}>
              At the heart of the archive is the central search portal. Rather than searching for isolated keywords, phrase your research as a comprehensive question (e.g., <em>"What are the feminist critiques of Rawlsian distributive justice?"</em>). The engine will synthesize a unified answer from multiple academic sources across the university's holdings.
            </p>
          </section>

          {/* Collection Filtering */}
          <section className="p-6 border border-gray-200 bg-white/50">
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "#1C1C1C",
                marginBottom: "0.75rem",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              Collection Filtering
            </h2>
            <p className="dense-text leading-relaxed" style={{ fontSize: "0.9rem" }}>
              To narrow your research scope, utilize the collection filters positioned above the inquiry field. You can restrict the engine to draw solely from <strong>Research Papers</strong>, <strong>Theses & Dissertations</strong>, or <strong>Course Reserves</strong>. For an interdisciplinary approach, leave the filter on <strong>All Collections</strong>.
            </p>
          </section>

          {/* Citation Traceability */}
          <section className="p-6 border border-gray-200 bg-white/50">
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "#1C1C1C",
                marginBottom: "0.75rem",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              Citation Traceability
            </h2>
            <p className="dense-text leading-relaxed" style={{ fontSize: "0.9rem" }}>
              Every claim generated by the engine is backed by a specific holding. You will notice inline superscript markers (e.g., <span className="fn-marker">¹</span>, <span className="fn-marker">²</span>) throughout the synthesized text. Clicking these markers will open the <strong>Reading Room</strong> side-panel, revealing the source document's metadata and the exact extracted excerpt used to substantiate the claim.
            </p>
          </section>

          {/* Manuscript Deposits */}
          <section className="p-6 border border-gray-200 bg-white/50">
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "#1C1C1C",
                marginBottom: "0.75rem",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              Manuscript Deposits
            </h2>
            <p className="dense-text leading-relaxed" style={{ fontSize: "0.9rem" }}>
              The archive is continually expanding. Faculty and students can contribute to the repository by clicking the <strong>+ Deposit Manuscript</strong> button in the navigation header. This tool allows for the upload of new syllabi, doctoral theses, or peer-reviewed papers, which are instantly indexed for future inquiries.
            </p>
          </section>
        </div>

        <div style={{ marginTop: "5rem", textAlign: "center" }}>
          <button
            onClick={onBack}
            className="academic-btn-primary"
            style={{
              padding: "0.6rem 1.5rem",
              fontSize: "0.8rem",
            }}
          >
            Begin Research
          </button>
        </div>
      </main>
    </div>
  );
}
export default function GetStarted() { return <div>Get Started</div>; }

// polished design elements
