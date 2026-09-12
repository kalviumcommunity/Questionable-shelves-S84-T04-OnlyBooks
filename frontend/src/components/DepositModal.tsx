import { useState } from "react";
import { catalogApi, DocumentDepositRequest, DocumentDepositResponse } from "../services/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deposited: DocumentDepositResponse) => void;
}

const SAMPLE_MANUSCRIPTS = [
  {
    title: "Neural Representation of Concept Drift and Latent Space Topology",
    author: "Dr. Evelyn Wright & Prof. Sanjay Mehta",
    year: "2026",
    field: "Machine Learning & Cognitive Architecture",
    collection_id: "papers",
    journal_or_press: "MIT Press · Advanced Computing Monograph Series",
    content_text: `Chapter 1: Geometric Distortions in Non-Stationary Latent Manifolds
Concept drift in non-stationary generative models induces continuous geometric distortion across latent representation manifolds.
Empirical probing across Riemannian curvature gradients reveals that sudden semantic shifts manifest as topological bifurcation events.
Rather than catastrophic forgetting, adaptive regularizers preserve geodesic distance metrics across successive temporal intervals.

Chapter 2: Dynamic Continual Alignment in Sparse Autoencoders
Sparse autoencoders equipped with localized homeostatic learning rules autonomously allocate latent capacity to emergent distribution shifts.
Controlled experiments on scholarly citation graphs demonstrate a thirty-four percent reduction in representation degradation compared to baseline dense transformers.
The resulting topological invariance ensures stable semantic retrieval across extended longitudinal academic corpora.`,
  },
  {
    title: "The Logic of Counterfactual Possibility in Historical Epistemology",
    author: "Claire DeWitt",
    year: "2026",
    field: "Philosophy of Science",
    collection_id: "theses",
    journal_or_press: "Oxford University Graduate Archive · Doctoral Dissertations",
    content_text: `Chapter I: Possible Worlds and Causal Asymmetry
Counterfactual assertions concerning historical contingencies depend fundamentally upon modal proximity rather than mere statistical regularity.
David Lewis's closest-world semantics requires epistemic calibration when applied to divergent historiographical interpretations.
A robust historical explanation isolates the minimal counterfactual antecedent capable of precluding the observed macro-historical trajectory.

Chapter II: Evidential Scaffolding in Archival Inferences
Archival silences and preserved documents exert an asymmetric constraint upon historical truth claims.
Historians employ abductive inferences where primary source fragments serve as boundary conditions rather than direct axiomatic proof.
Peer scrutiny functions as an epistemic filter, refining archival conjectures into stable historical consensus.`,
  },
];

export default function DepositModal({ isOpen, onClose, onSuccess }: Props) {
  const [activeTab, setActiveTab] = useState<"upload" | "manual">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [year, setYear] = useState("2026");
  const [field, setField] = useState("");
  const [collectionId, setCollectionId] = useState("papers");
  const [journal, setJournal] = useState("");
  const [contentText, setContentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentDepositResponse | null>(null);

  if (!isOpen) return null;

  function handleFileSelect(selectedFile: File) {
    setFile(selectedFile);
    setError(null);
    // Auto-populate Title from file name if empty
    if (!title.trim()) {
      const base = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTitle(base.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  function handleFillSample(idx: number = 0) {
    const s = SAMPLE_MANUSCRIPTS[idx];
    setTitle(s.title);
    setAuthor(s.author);
    setYear(s.year);
    setField(s.field);
    setCollectionId(s.collection_id);
    setJournal(s.journal_or_press);
    setContentText(s.content_text);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (activeTab === "upload") {
      if (!file) {
        setError("Please select or drop an academic manuscript file (.pdf, .txt, .md).");
        return;
      }
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);
      if (title.trim()) formData.append("title", title.trim());
      if (author.trim()) formData.append("author", author.trim());
      if (year.trim()) formData.append("year", year.trim());
      if (field.trim()) formData.append("field", field.trim());
      if (collectionId) formData.append("collection_id", collectionId);
      if (journal.trim()) formData.append("journal_or_press", journal.trim());

      try {
        const res = await catalogApi.uploadFile(formData);
        setResult(res);
        onSuccess(res);
      } catch (err: any) {
        setError(err?.message || "Failed to upload and parse document.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Manual text mode
    if (!title.trim() || !author.trim() || !field.trim() || !contentText.trim()) {
      setError("Please fill in Title, Author, Academic Field, and Manuscript Content.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload: DocumentDepositRequest = {
      title: title.trim(),
      author: author.trim(),
      year: year.trim() || "2026",
      field: field.trim(),
      collection_id: collectionId,
      journal_or_press: journal.trim() || undefined,
      content_text: contentText.trim(),
    };

    try {
      const res = await catalogApi.deposit(payload);
      setResult(res);
      onSuccess(res);
    } catch (err: any) {
      setError(err?.message || "Failed to deposit manuscript to university archive.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setTitle("");
    setAuthor("");
    setYear("2026");
    setField("");
    setJournal("");
    setContentText("");
    setResult(null);
    setError(null);
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          maxHeight: "90vh",
          backgroundColor: "#FAFAFA",
          border: "1px solid #1C1C1C",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--font-sans)",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.75rem",
            borderBottom: "1px solid #E5E7EB",
            background: "#FFFFFF",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "#0F172A",
                margin: 0,
              }}
            >
              Deposit Academic Manuscript
            </h2>
            <p style={{ fontSize: "0.68rem", color: "#6B7280", margin: "0.2rem 0 0" }}>
              OnlyBooks Institutional Archives · Dynamic Chunking & In-Situ Hybrid Indexing
            </p>
          </div>

          <button
            onClick={handleReset}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.25rem",
              color: "#9CA3AF",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.75rem" }}>
          {result ? (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  backgroundColor: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  marginBottom: "1rem",
                  color: "#059669",
                  fontSize: "1.5rem",
                }}
              >
                ✓
              </div>

              <h3
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "1.4rem",
                  color: "#0F172A",
                  marginBottom: "0.5rem",
                }}
              >
                Manuscript Deposited Successfully
              </h3>

              <p style={{ fontSize: "0.82rem", color: "#4B5563", maxWidth: 480, margin: "0 auto 1.5rem" }}>
                {result.message} It has been segmented into {result.sections_count} chapters ({result.total_pages} pp.) and added to the hybrid vector and BM25 catalog indices.
              </p>

              <div
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  padding: "1rem 1.5rem",
                  maxWidth: 440,
                  margin: "0 auto 2rem",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <span style={{ fontSize: "0.68rem", color: "#6B7280" }}>Official Call Number:</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#0F172A" }}>{result.call_number}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <span style={{ fontSize: "0.68rem", color: "#6B7280" }}>Collection Holding:</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#0F172A" }}>{result.collection_name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.68rem", color: "#6B7280" }}>Index Status:</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#059669" }}>Active & Citable</span>
                </div>
              </div>

              <button
                onClick={handleReset}
                style={{
                  background: "#1C1C1C",
                  color: "#FAFAFA",
                  border: "none",
                  padding: "0.5rem 1.5rem",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                }}
              >
                Return to Research Portal
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Mode Tab Switcher */}
              <div style={{ display: "flex", borderBottom: "1px solid #E5E7EB", marginBottom: "1.25rem" }}>
                <button
                  type="button"
                  onClick={() => setActiveTab("upload")}
                  style={{
                    padding: "0.5rem 1rem",
                    fontSize: "0.74rem",
                    fontWeight: activeTab === "upload" ? 600 : 400,
                    color: activeTab === "upload" ? "#0F172A" : "#6B7280",
                    borderBottom: activeTab === "upload" ? "2px solid #0F172A" : "2px solid transparent",
                    background: "none",
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <span>📄</span>
                  <span>Upload Document File (.pdf, .txt, .md)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("manual")}
                  style={{
                    padding: "0.5rem 1rem",
                    fontSize: "0.74rem",
                    fontWeight: activeTab === "manual" ? 600 : 400,
                    color: activeTab === "manual" ? "#0F172A" : "#6B7280",
                    borderBottom: activeTab === "manual" ? "2px solid #0F172A" : "2px solid transparent",
                    background: "none",
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <span>✍️</span>
                  <span>Manual Text / Chapter Input</span>
                </button>
              </div>

              {/* Drag-and-drop zone if in Upload tab */}
              {activeTab === "upload" && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-upload-input")?.click()}
                  style={{
                    border: dragActive ? "2px dashed #2563EB" : "2px dashed #CBD5E1",
                    background: dragActive ? "#EFF6FF" : file ? "#F8FAFC" : "#FFFFFF",
                    padding: "1.75rem 1.5rem",
                    textAlign: "center",
                    cursor: "pointer",
                    marginBottom: "1.25rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  <input
                    id="file-upload-input"
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    style={{ display: "none" }}
                  />
                  {file ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}>
                      <span style={{ fontSize: "1.75rem" }}>{file.name.toLowerCase().endsWith(".pdf") ? "📕" : "📄"}</span>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0F172A" }}>{file.name}</span>
                      <span style={{ fontSize: "0.68rem", color: "#64748B" }}>
                        {(file.size / 1024).toFixed(1)} KB · Click or drop another file to replace
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: "1.75rem", display: "block", marginBottom: "0.4rem" }}>📁</span>
                      <p style={{ fontSize: "0.825rem", fontWeight: 500, color: "#1E293B", margin: "0 0 0.2rem" }}>
                        Drop academic document here or <span style={{ color: "#2563EB", textDecoration: "underline" }}>browse files</span>
                      </p>
                      <p style={{ fontSize: "0.68rem", color: "#64748B", margin: 0 }}>
                        Supports Adobe PDF (.pdf), Plain Text (.txt), and Markdown (.md)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Quick sample bar if in Manual tab */}
              {activeTab === "manual" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "1.25rem",
                    padding: "0.6rem 1rem",
                    background: "#EFF6FF",
                    border: "1px solid #DBEAFE",
                  }}
                >
                  <span style={{ fontSize: "0.68rem", color: "#1E40AF" }}>
                    Faculty or Librarian Demo? Populate sample manuscript:
                  </span>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => handleFillSample(0)}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #BFDBFE",
                        fontSize: "0.65rem",
                        color: "#1E40AF",
                        padding: "2px 8px",
                        cursor: "pointer",
                      }}
                    >
                      Paper (AI/Neuro)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillSample(1)}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #BFDBFE",
                        fontSize: "0.65rem",
                        color: "#1E40AF",
                        padding: "2px 8px",
                        cursor: "pointer",
                      }}
                    >
                      Thesis (Philosophy)
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div
                  style={{
                    padding: "0.6rem 1rem",
                    marginBottom: "1.25rem",
                    backgroundColor: "#FEF2F2",
                    border: "1px solid #FCA5A5",
                    color: "#B91C1C",
                    fontSize: "0.75rem",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Title & Author */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#4B5563", marginBottom: "0.35rem" }}>
                    Document Title {activeTab === "manual" ? "*" : "(Optional override)"}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Epistemic Humility in Clinical Trials"
                    style={{
                      width: "100%",
                      padding: "0.45rem 0.6rem",
                      border: "1px solid #D1D5DB",
                      fontSize: "0.8rem",
                      outline: "none",
                      background: "#FFFFFF",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#4B5563", marginBottom: "0.35rem" }}>
                    Lead Scholar / Author {activeTab === "manual" ? "*" : "(Optional override)"}
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="e.g. Dr. Arthur Vance & Dr. S. Lin"
                    style={{
                      width: "100%",
                      padding: "0.45rem 0.6rem",
                      border: "1px solid #D1D5DB",
                      fontSize: "0.8rem",
                      outline: "none",
                      background: "#FFFFFF",
                    }}
                  />
                </div>
              </div>

              {/* Field, Collection, Year */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.6fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#4B5563", marginBottom: "0.35rem" }}>
                    Academic Field {activeTab === "manual" ? "*" : ""}
                  </label>
                  <input
                    type="text"
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                    placeholder="e.g. Cognitive Neuroscience"
                    style={{
                      width: "100%",
                      padding: "0.45rem 0.6rem",
                      border: "1px solid #D1D5DB",
                      fontSize: "0.8rem",
                      outline: "none",
                      background: "#FFFFFF",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#4B5563", marginBottom: "0.35rem" }}>
                    Collection Holding *
                  </label>
                  <select
                    value={collectionId}
                    onChange={(e) => setCollectionId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.45rem 0.6rem",
                      border: "1px solid #D1D5DB",
                      fontSize: "0.8rem",
                      outline: "none",
                      background: "#FFFFFF",
                    }}
                  >
                    <option value="papers">Faculty Research Paper</option>
                    <option value="theses">Doctoral / Master's Thesis</option>
                    <option value="reserves">Course Reserve Material</option>
                    <option value="press">University Press Monograph</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#4B5563", marginBottom: "0.35rem" }}>
                    Year
                  </label>
                  <input
                    type="text"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.45rem 0.6rem",
                      border: "1px solid #D1D5DB",
                      fontSize: "0.8rem",
                      outline: "none",
                      background: "#FFFFFF",
                    }}
                  />
                </div>
              </div>

              {/* Journal / Press */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#4B5563", marginBottom: "0.35rem" }}>
                  Journal, Press, or Department Archive (Optional)
                </label>
                <input
                  type="text"
                  value={journal}
                  onChange={(e) => setJournal(e.target.value)}
                  placeholder="e.g. University Press / Graduate Division Archive"
                  style={{
                    width: "100%",
                    padding: "0.45rem 0.6rem",
                    border: "1px solid #D1D5DB",
                    fontSize: "0.8rem",
                    outline: "none",
                    background: "#FFFFFF",
                  }}
                />
              </div>

              {/* Manuscript Text Content if in Manual tab */}
              {activeTab === "manual" && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.35rem" }}>
                    <label style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#4B5563" }}>
                      Manuscript Text (with Chapter / Section Headings) *
                    </label>
                    <span style={{ fontSize: "0.62rem", color: "#9CA3AF" }}>
                      Prefix chapters with "Chapter 1: ...", "Chapter II: ...", or "# "
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                    placeholder={"Chapter 1: Introduction\nState the central scholarly inquiry and theoretical foundation...\n\nChapter 2: Empirical Methodologies\nDetail the experimental trials and archival analysis..."}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      border: "1px solid #D1D5DB",
                      fontSize: "0.8rem",
                      fontFamily: "var(--font-serif)",
                      lineHeight: 1.6,
                      outline: "none",
                      background: "#FFFFFF",
                      resize: "vertical",
                    }}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid #E5E7EB", paddingTop: "1.25rem" }}>
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    background: "none",
                    border: "1px solid #D1D5DB",
                    padding: "0.5rem 1.25rem",
                    fontSize: "0.75rem",
                    color: "#4B5563",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: "#1C1C1C",
                    color: "#FAFAFA",
                    border: "none",
                    padding: "0.5rem 1.5rem",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading
                    ? (activeTab === "upload" ? "Extracting & Indexing…" : "Parsing & Indexing…")
                    : (activeTab === "upload" ? "Upload & Ingest Manuscript" : "Deposit to Library")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
