import { useState, useEffect } from "react";
import {
  CitationData,
  exportAllBibTeX,
  exportAllAPA,
  formatMLA,
  formatChicago,
  downloadBibTeXFile,
} from "../utils/citationFormatter";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  citations: CitationData[];
  inquiryTitle?: string;
}

type ExportStyle = "bibtex" | "apa" | "mla" | "chicago";

export default function ExportBibliographyModal({
  isOpen,
  onClose,
  citations,
  inquiryTitle = "OnlyBooks-Bibliography",
}: Props) {
  const [style, setStyle] = useState<ExportStyle>("bibtex");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let formattedContent = "";
  if (style === "bibtex") {
    formattedContent = exportAllBibTeX(citations);
  } else if (style === "apa") {
    formattedContent = exportAllAPA(citations);
  } else if (style === "mla") {
    formattedContent = citations.map((c) => formatMLA(c)).join("\n\n");
  } else if (style === "chicago") {
    formattedContent = citations.map((c) => formatChicago(c)).join("\n\n");
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = formattedContent;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const cleanName = inquiryTitle.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
    downloadBibTeXFile(`${cleanName}_citations.bib`, exportAllBibTeX(citations));
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1.5rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card-academic"
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "14px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
          overflow: "hidden",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-strong)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "1.15rem",
                fontWeight: 600,
                fontFamily: "var(--font-display)",
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Export Bibliography & Citations
            </h2>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                margin: "0.25rem 0 0 0",
              }}
            >
              {citations.length} cited archival holdings ready for academic attribution
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost"
            style={{
              padding: "0.4rem",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Style Selector Tabs */}
        <div
          style={{
            padding: "0.75rem 1.5rem 0",
            display: "flex",
            gap: "0.5rem",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-secondary)",
          }}
        >
          {[
            { id: "bibtex", label: "BibTeX (.bib)" },
            { id: "apa", label: "APA 7th" },
            { id: "mla", label: "MLA 9th" },
            { id: "chicago", label: "Chicago" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStyle(tab.id as ExportStyle)}
              style={{
                padding: "0.5rem 0.9rem",
                fontSize: "0.8rem",
                fontWeight: 500,
                border: "none",
                background: "transparent",
                color: style === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
                borderBottom: style === tab.id ? "2px solid var(--accent-primary, #b45309)" : "2px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Code / Text Area */}
        <div style={{ padding: "1.25rem 1.5rem", flex: 1, overflowY: "auto" }}>
          <pre
            style={{
              margin: 0,
              padding: "1rem",
              borderRadius: "8px",
              background: "var(--bg-primary)",
              border: "1px solid var(--border-subtle)",
              fontFamily: style === "bibtex" ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" : "var(--font-sans)",
              fontSize: style === "bibtex" ? "0.78rem" : "0.85rem",
              lineHeight: 1.6,
              color: "var(--text-primary)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: "340px",
              overflowY: "auto",
            }}
          >
            {formattedContent}
          </pre>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-secondary)",
          }}
        >
          <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            Format: {style.toUpperCase()}
          </span>

          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              onClick={handleDownload}
              className="btn-secondary"
              style={{
                padding: "0.45rem 0.9rem",
                fontSize: "0.8rem",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
              title="Download entire bibliography as .bib file"
            >
              📥 Download .bib
            </button>
            <button
              onClick={handleCopy}
              className="btn-primary"
              style={{
                padding: "0.45rem 1rem",
                fontSize: "0.8rem",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              {copied ? "✓ Copied!" : "📋 Copy to Clipboard"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
