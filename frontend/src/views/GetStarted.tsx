import { User, ThemeToggle } from "../App";
import Reveal from "../components/Reveal";

interface Props {
  user?: User | null;
  onBack: () => void;
}

export default function GetStarted({ user, onBack }: Props) {
  return (
    <div
      className="flex flex-col"
      style={{ fontFamily: "var(--font-sans)", flex: 1 }}
    >
      <header
        className="glass-nav flex items-center justify-between px-8 py-5 flex-shrink-0"
        style={{ position: "relative", zIndex: 10 }}
      >
        <div
          onClick={onBack}
          title="Back to Archive"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1.25rem",
            letterSpacing: "-0.01em",
            cursor: "pointer",
            userSelect: "none",
            color: "var(--text-primary)"
          }}
        >
          OnlyBooks
        </div>
        <nav className="flex items-center gap-6">
          <button
            onClick={onBack}
            className="btn-ghost"
            style={{
              fontSize: "0.8rem",
              padding: "0.5rem 1rem",
            }}
          >
            ← Back to Archive
          </button>
          
          <ThemeToggle />
          
          {user && (
            <div
              title={user.name}
              style={{
                width: 34,
                height: 34,
                background: "var(--accent)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "var(--bg-primary)",
                userSelect: "none",
              }}
            >
              {user.initials}
            </div>
          )}
        </nav>
      </header>

      <main className="flex-1 px-8 py-16 max-w-4xl mx-auto w-full z-10">
        <Reveal delay={0}>
        <div style={{ marginBottom: "5rem", textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "3rem",
              lineHeight: 1.2,
              fontWeight: 700,
              marginBottom: "1.5rem",
              letterSpacing: "-0.02em",
              color: "var(--text-primary)"
            }}
          >
            Reader's Guide
          </h1>
          <p className="dense-text leading-relaxed" style={{ fontSize: "1.1rem", color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto" }}>
            Welcome to the OnlyBooks digital reading room. This guide will help you navigate our collections, submit inquiries, and verify academic claims through our citation-backed synthesis engine.
          </p>
        </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-x-12 md:gap-y-12">
          {/* Inquiry Submission */}
          <Reveal delay={0.1}>
          <section className="glass-panel glass-panel-hover floating-glass" style={{ animationDelay: "0s", padding: "2.5rem" }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem"
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "8px", background: "var(--accent-light)", color: "var(--text-primary)", fontSize: "1rem" }}>
                🔍
              </span>
              Inquiry Submission
            </h2>
            <p className="dense-text leading-relaxed" style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
              At the heart of the archive is the central search portal. Rather than searching for isolated keywords, phrase your research as a comprehensive question (e.g., <em style={{ color: "var(--text-primary)" }}>"What are the feminist critiques of Rawlsian distributive justice?"</em>). The engine will synthesize a unified answer from multiple academic sources across the university's holdings.
            </p>
          </section>
          </Reveal>

          {/* Collection Filtering */}
          <Reveal delay={0.2}>
          <section className="glass-panel glass-panel-hover floating-glass" style={{ animationDelay: "1.5s", padding: "2.5rem" }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem"
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "8px", background: "var(--accent-light)", color: "var(--text-primary)", fontSize: "1rem" }}>
                📚
              </span>
              Collection Filtering
            </h2>
            <p className="dense-text leading-relaxed" style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
              To narrow your research scope, utilize the collection filters positioned above the inquiry field. You can restrict the engine to draw solely from <strong style={{ color: "var(--text-primary)" }}>Research Papers</strong>, <strong style={{ color: "var(--text-primary)" }}>Theses & Dissertations</strong>, or <strong style={{ color: "var(--text-primary)" }}>Course Reserves</strong>. For an interdisciplinary approach, leave the filter on <strong style={{ color: "var(--text-primary)" }}>All Collections</strong>.
            </p>
          </section>
          </Reveal>

          {/* Citation Traceability */}
          <Reveal delay={0.3}>
          <section className="glass-panel glass-panel-hover floating-glass" style={{ animationDelay: "3s", padding: "2.5rem" }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem"
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "8px", background: "var(--accent-light)", color: "var(--text-primary)", fontSize: "1rem" }}>
                🎯
              </span>
              Citation Traceability
            </h2>
            <p className="dense-text leading-relaxed" style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
              Every claim generated by the engine is backed by a specific holding. You will notice inline superscript markers (e.g., <span className="fn-marker" style={{ display: "inline-block", padding: "0 4px", borderRadius: "4px" }}>¹</span>, <span className="fn-marker" style={{ display: "inline-block", padding: "0 4px", borderRadius: "4px" }}>²</span>) throughout the synthesized text. Clicking these markers will open the <strong style={{ color: "var(--text-primary)" }}>Reading Room</strong> side-panel, revealing the source document's metadata and the exact extracted excerpt used to substantiate the claim.
            </p>
          </section>
          </Reveal>

          {/* Manuscript Deposits */}
          <Reveal delay={0.4}>
          <section className="glass-panel glass-panel-hover floating-glass" style={{ animationDelay: "4.5s", padding: "2.5rem" }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem"
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "8px", background: "var(--accent-light)", color: "var(--text-primary)", fontSize: "1rem" }}>
                📄
              </span>
              Manuscript Deposits
            </h2>
            <p className="dense-text leading-relaxed" style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
              The archive is continually expanding. Faculty and students can contribute to the repository by clicking the <strong style={{ color: "var(--text-primary)" }}>+ Deposit</strong> button in the navigation header. This tool allows for the upload of new syllabi, doctoral theses, or peer-reviewed papers, which are instantly indexed for future inquiries.
            </p>
          </section>
          </Reveal>
        </div>

        <div style={{ marginTop: "5rem", textAlign: "center" }}>
          <button
            onClick={onBack}
            className="btn-primary"
            style={{
              padding: "1rem 2.5rem",
              fontSize: "1.05rem",
              borderRadius: "12px",
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
