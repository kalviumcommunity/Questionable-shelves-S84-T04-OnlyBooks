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
              {/* Quick sample bar */}
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
                    Document Title *
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
                    Lead Scholar / Author *
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
                    Academic Field *
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

              {/* Manuscript Text Content */}
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
                  {loading ? "Parsing & Indexing…" : "Deposit to Library"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
