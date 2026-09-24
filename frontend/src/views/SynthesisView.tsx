import { useState, useEffect, KeyboardEvent } from "react";
import ReadingRoom from "./ReadingRoom";
import { ThemeToggle, type Query, type User } from "../App";
import { getSynthesisForQuery, Citation, DocumentRecord } from "../data/libraryKnowledge";
import { inquiryApi } from "../services/api";
import Reveal from "../components/Reveal";
import UserMenu from "../components/UserMenu";
import NotificationPopover from "../components/NotificationPopover";
import ExportBibliographyModal from "../components/ExportBibliographyModal";
import { formatAPA } from "../utils/citationFormatter";

export type { Citation };

interface Paragraph {
  text: string; // may contain Unicode superscripts ¹²³⁴⁵ as inline footnote markers
}

interface Props {
  user: User;
  activeQuery: Query;
  queryHistory: Query[];
  onSelectQuery: (q: Query) => void;
  onNewSearch: () => void;
  onQuery: (question: string, collectionFilter?: string) => void;
  onOpenGuide?: () => void;
  onSignOut: () => void;
}

// Unicode superscript map for footnote markers 1–9
const SUP: Record<number, string> = { 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
const SUP_REVERSE: Record<string, number> = Object.fromEntries(
  Object.entries(SUP).map(([k, v]) => [v, Number(k)])
);
const SUP_PATTERN = /([¹²³⁴⁵⁶⁷⁸⁹])/;

// ── Paragraph renderer — splits on Unicode superscript markers ─────────────
function RichParagraph({
  text,
  activeFootnote,
  onHover,
  onOpen,
}: {
  text: string;
  activeFootnote: number | null;
  onHover: (n: number | null) => void;
  onOpen: (n: number) => void;
}) {
  const parts = text.split(SUP_PATTERN);
  return (
    <>
      {parts.map((part, i) => {
        const fnId = SUP_REVERSE[part];
        if (fnId !== undefined) {
          const isActive = activeFootnote === fnId;
          return (
            <span
              key={i}
              className={`fn-marker${isActive ? " active" : ""}`}
              onMouseEnter={() => onHover(fnId)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onOpen(fnId)}
              title={`View citation ${part} in Reading Room`}
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function SynthesisView({
  user,
  activeQuery,
  queryHistory,
  onSelectQuery,
  onNewSearch,
  onQuery,
  onOpenGuide,
  onSignOut,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeFootnote, setActiveFootnote] = useState<number | null>(null);
  const [openCitation, setOpenCitation] = useState<Citation | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [synthesis, setSynthesis] = useState<{
    summaryByline: string;
    paragraphs: { text: string }[];
    citations: Citation[];
    attributionScore: number;
    inquiryId?: string;
    documents: Record<number, DocumentRecord>;
  } | null>(null);

  // Fetch or stream live RAG synthesis with fallback to library catalog knowledge
  useEffect(() => {
    let isCancelled = false;
    let abortStream: (() => void) | null = null;
    setLoading(true);
    setOpenCitation(null);
    setActiveFootnote(null);

    const localFallback = getSynthesisForQuery(activeQuery.question);

    if (activeQuery.id.startsWith("inq-")) {
      inquiryApi
        .getSavedInquiry(activeQuery.id)
        .then((res) => {
          if (isCancelled) return;
          const mappedCitations: Citation[] = res.citations.map((c) => ({
            id: c.id,
            title: c.title,
            author: c.author,
            year: c.year,
            journal: c.journal || "Library Archive",
            page: c.page,
            callNumber: c.call_number,
            collectionType: c.collection_type,
            documentId: c.document_id,
            extractedQuote: c.extracted_quote,
            marker: c.marker,
          }));

          setSynthesis({
            summaryByline: res.summary_byline,
            paragraphs: res.paragraphs,
            citations: mappedCitations,
            attributionScore: res.attribution_score,
            inquiryId: res.inquiry_id,
            documents: localFallback.documents,
          });
          setLoading(false);
          setIsStreaming(false);
        })
        .catch((err) => {
          console.warn("Could not load saved inquiry, generating fresh:", err);
          executeStream();
        });
    } else {
      executeStream();
    }

    function executeStream() {
      setIsStreaming(true);
      abortStream = inquiryApi.synthesizeStream(
        {
          question: activeQuery.question,
          collection_filter: activeQuery.collectionFilter || "all",
        },
        {
          onMetadata: (meta) => {
            if (isCancelled) return;
            setSynthesis((prev) => ({
              summaryByline: meta.summary_byline,
              paragraphs: prev?.paragraphs && prev.paragraphs.length > 0 ? prev.paragraphs : [{ text: "" }],
              citations: prev?.citations || [],
              attributionScore: meta.attribution_score,
              inquiryId: meta.inquiry_id,
              documents: localFallback.documents,
            }));
          },
          onCitations: (cits) => {
            if (isCancelled) return;
            const mapped: Citation[] = cits.map((c) => ({
              id: c.id,
              title: c.title,
              author: c.author,
              year: c.year,
              journal: c.journal || "Library Archive",
              page: c.page,
              callNumber: c.call_number,
              collectionType: c.collection_type,
              documentId: c.document_id,
              extractedQuote: c.extracted_quote,
              marker: c.marker,
            }));
            setSynthesis((prev) => ({
              summaryByline: prev?.summaryByline || "University Library Synthesis",
              paragraphs: prev?.paragraphs || [{ text: "" }],
              citations: mapped,
              attributionScore: prev?.attributionScore || 1.0,
              inquiryId: prev?.inquiryId,
              documents: localFallback.documents,
            }));
          },
          onToken: (token, paragraphIdx) => {
            if (isCancelled) return;
            setLoading(false);
            setSynthesis((prev) => {
              const currentParas = prev ? [...prev.paragraphs] : [];
              while (currentParas.length <= paragraphIdx) {
                currentParas.push({ text: "" });
              }
              currentParas[paragraphIdx] = {
                text: currentParas[paragraphIdx].text + token,
              };
              return {
                summaryByline: prev?.summaryByline || "University Library Synthesis",
                paragraphs: currentParas,
                citations: prev?.citations || [],
                attributionScore: prev?.attributionScore || 1.0,
                inquiryId: prev?.inquiryId,
                documents: prev?.documents || localFallback.documents,
              };
            });
          },
          onParagraphBreak: (paragraphIdx) => {
            if (isCancelled) return;
            setSynthesis((prev) => {
              if (!prev) return prev;
              const currentParas = [...prev.paragraphs];
              while (currentParas.length <= paragraphIdx + 1) {
                currentParas.push({ text: "" });
              }
              return {
                ...prev,
                paragraphs: currentParas,
              };
            });
          },
          onDone: (done) => {
            if (isCancelled) return;
            setIsStreaming(false);
            setLoading(false);
            setSynthesis((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                summaryByline: done.summary_byline,
                attributionScore: done.attribution_score,
                inquiryId: done.inquiry_id,
              };
            });
          },
          onError: (err) => {
            console.warn("Stream error, falling back to batch synthesis:", err);
            if (isCancelled) return;
            inquiryApi
              .synthesize({
                question: activeQuery.question,
                collection_filter: activeQuery.collectionFilter || "all",
              })
              .then((res) => {
                if (isCancelled) return;
                const mappedCitations: Citation[] = res.citations.map((c) => ({
                  id: c.id,
                  title: c.title,
                  author: c.author,
                  year: c.year,
                  journal: c.journal || "Library Archive",
                  page: c.page,
                  callNumber: c.call_number,
                  collectionType: c.collection_type,
                  documentId: c.document_id,
                  extractedQuote: c.extracted_quote,
                  marker: c.marker,
                }));

                setSynthesis({
                  summaryByline: res.summary_byline,
                  paragraphs: res.paragraphs,
                  citations: mappedCitations,
                  attributionScore: res.attribution_score,
                  inquiryId: res.inquiry_id,
                  documents: localFallback.documents,
                });
                setLoading(false);
                setIsStreaming(false);
              })
              .catch((err2) => {
                console.warn("Batch synthesis offline, using catalog knowledge fallback:", err2);
                if (isCancelled) return;
                setSynthesis({
                  summaryByline: localFallback.summaryByline,
                  paragraphs: localFallback.paragraphs,
                  citations: localFallback.citations,
                  attributionScore: 1.0,
                  documents: localFallback.documents,
                });
                setLoading(false);
                setIsStreaming(false);
              });
          },
        }
      );
    }

    return () => {
      isCancelled = true;
      if (abortStream) abortStream();
    };
  }, [activeQuery.id, activeQuery.question, activeQuery.collectionFilter]);

  function submitFollowUp() {
    const t = followUp.trim();
    if (t) {
      onQuery(t, activeQuery.collectionFilter || "all");
      setFollowUp("");
    }
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") submitFollowUp();
  }

  function openDoc(id: number) {
    const found = synthesis?.citations.find((c) => c.id === id) ?? null;
    setOpenCitation(found);
  }

  const rightColWidth = openCitation ? "60%" : "25%";
  const activeDocRecord = openCitation && synthesis ? synthesis.documents[openCitation.id] : undefined;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
      }}
    >
      {/* ── Top nav ── */}
      <header
        className="glass-nav"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1.5rem",
          flexShrink: 0,
          position: "relative",
          zIndex: 10
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={onNewSearch}
            className="btn-ghost"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              padding: 0
            }}
            title="Back to Search"
          >
            <span style={{ fontSize: "1rem" }}>←</span>
          </button>
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
              letterSpacing: "-0.01em",
              cursor: "pointer",
              marginLeft: "1rem",
              color: "var(--text-primary)"
            }}
          >
            OnlyBooks
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{activeQuery.timestamp}</span>
          <ThemeToggle />
          <NotificationPopover />
          <UserMenu user={user} onSignOut={onSignOut} />
        </div>
      </header>

      {/* ── Three-column body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative", zIndex: 5 }}>
        {/* Left — Research Trail (20%) */}
        <aside
          style={{
            width: "20%",
            flexShrink: 0,
            borderRight: "1px solid var(--border-light)",
            background: "var(--bg-secondary)",
            overflowY: "auto",
            padding: "1.5rem 1.5rem",
          }}
        >
          <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--text-secondary)", marginBottom: "1rem", fontWeight: 600 }}>
            Research Trail
          </p>
          {queryHistory.map((q) => {
            const isActive = q.id === activeQuery.id;
            return (
              <Reveal key={q.id} delay={0.1}>
              <div
                onClick={() => {
                  onSelectQuery(q);
                  setOpenCitation(null);
                }}
                className={isActive ? "glass-panel" : "glass-panel-hover"}
                style={{
                  padding: "1rem",
                  marginBottom: "0.5rem",
                  cursor: "pointer",
                  background: isActive ? "var(--accent-light)" : "transparent",
                  border: isActive ? "1px solid var(--border-strong)" : "1px solid transparent",
                  borderRadius: "8px"
                }}
              >
                <p style={{ fontSize: "0.8rem", lineHeight: 1.45, color: isActive ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: isActive ? 600 : 400, marginBottom: "0.4rem" }}>
                  {q.question}
                </p>
                <p style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>{q.timestamp}</p>
              </div>
              </Reveal>
            );
          })}
        </aside>

        {/* Center — Document (flex: 1) */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            position: "relative"
          }}
        >
          {/* Scrollable article */}
          <div style={{ flex: 1, padding: "3rem 4rem", maxWidth: 840, margin: "0 auto", width: "100%" }}>
            {/* H1 — the query */}
            <Reveal delay={0}>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "2.25rem",
                lineHeight: 1.25,
                fontWeight: 600,
                marginBottom: "2rem",
                letterSpacing: "-0.02em",
                color: "var(--text-primary)"
              }}
            >
              {activeQuery.question}
            </h1>
            </Reveal>

            {loading || !synthesis ? (
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.5rem 1rem",
                    background: "var(--accent-light)",
                    border: "1px solid var(--border-light)",
                    borderRadius: "20px",
                    marginBottom: "2rem",
                  }}
                >
                  <div className="loader-minimal" style={{ width: 12, height: 12, borderWidth: 2 }} />
                  <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-primary)", fontWeight: 600 }}>
                    Synthesizing Hybrid Retrieval…
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem", opacity: 0.5 }}>
                  <div style={{ height: 16, background: "var(--border-strong)", width: "100%", borderRadius: 4 }} className="animate-pulse" />
                  <div style={{ height: 16, background: "var(--border-strong)", width: "94%", borderRadius: 4 }} className="animate-pulse" />
                  <div style={{ height: 16, background: "var(--border-strong)", width: "98%", borderRadius: 4 }} className="animate-pulse" />
                  <div style={{ height: 16, background: "var(--border-strong)", width: "82%", borderRadius: 4, marginBottom: "1rem" }} className="animate-pulse" />

                  <div style={{ height: 16, background: "var(--border-strong)", width: "100%", borderRadius: 4 }} className="animate-pulse" />
                  <div style={{ height: 16, background: "var(--border-strong)", width: "91%", borderRadius: 4 }} className="animate-pulse" />
                  <div style={{ height: 16, background: "var(--border-strong)", width: "87%", borderRadius: 4 }} className="animate-pulse" />
                </div>
              </div>
            ) : (
              <>
                {/* Metadata byline */}
                <div style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: "1.5rem", marginBottom: "2.5rem", display: "flex", gap: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
                  <MetaTag>Library Synthesis</MetaTag>
                  <MetaTag>
                    {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </MetaTag>
                  <MetaTag>{synthesis.citations.length} verified citations</MetaTag>
                  
                  <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-primary)", background: "var(--accent-light)", border: "1px solid var(--border-strong)", padding: "0.2rem 0.6rem", borderRadius: "12px", fontWeight: 600 }}>
                    Attribution: {Math.round(synthesis.attributionScore * 100)}% Grounded
                  </span>
                  
                  {isStreaming && (
                    <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-primary)", background: "var(--accent-light)", border: "1px solid var(--border-strong)", padding: "0.2rem 0.6rem", borderRadius: "12px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                      <div className="loader-minimal" style={{ width: 8, height: 8, borderWidth: 1 }} />
                      Streaming Live…
                    </span>
                  )}
                </div>

                {/* Article body */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {synthesis.paragraphs.map((p, i) => (
                    <Reveal key={i} delay={0.1 * (i + 1)}>
                      <p style={{ fontSize: "1.05rem", lineHeight: 1.85, color: "var(--text-primary)", marginBottom: "1.5rem", fontFamily: "var(--font-serif)" }}>
                        <RichParagraph text={p.text} activeFootnote={activeFootnote} onHover={setActiveFootnote} onOpen={openDoc} />
                        {isStreaming && i === synthesis.paragraphs.length - 1 && (
                          <span style={{ display: "inline-block", marginLeft: "4px", color: "var(--accent)", fontWeight: 700, animation: "pulse-glow 1s infinite" }}>▍</span>
                        )}
                      </p>
                    </Reveal>
                  ))}
                </div>

                {/* References */}
                <div style={{ marginTop: "4rem", paddingTop: "2rem", borderTop: "1px solid var(--border-light)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                    <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--text-secondary)", margin: 0, fontWeight: 600 }}>
                      Catalog References & Library Holdings
                    </p>
                    <button
                      onClick={() => setIsExportModalOpen(true)}
                      className="btn-ghost"
                      style={{
                        padding: "0.3rem 0.75rem",
                        fontSize: "0.7rem",
                        borderRadius: "6px",
                        border: "1px solid var(--border-strong)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}
                      title="Export entire bibliography (BibTeX, APA, MLA, Chicago)"
                    >
                      <span>📥</span>
                      <span>Export Bibliography</span>
                    </button>
                  </div>
                  <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {synthesis.citations.map((c, i) => (
                      <Reveal key={c.id} delay={0.05 * i}>
                      <li
                        onClick={() => openDoc(c.id)}
                        className="glass-panel-hover"
                        style={{ display: "flex", gap: "1rem", padding: "1rem", background: "transparent", border: "1px solid var(--border-light)", borderRadius: "8px", fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-secondary)", cursor: "pointer" }}
                        onMouseEnter={() => setActiveFootnote(c.id)}
                        onMouseLeave={() => setActiveFootnote(null)}
                      >
                        <span style={{ fontWeight: 600, color: "var(--text-primary)", flexShrink: 0, fontSize: "0.9rem" }}>
                          {SUP[c.id] || `[${c.id}]`}
                        </span>
                        <span style={{ flex: 1 }}>
                          <em style={{ color: "var(--text-primary)" }}>{c.title}</em>
                          {" — "}
                          {c.author} ({c.year}). {c.journal}.{" "}
                          <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>[{c.collectionType} · Call #: {c.callNumber}]</span>
                        </span>
                        <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--text-primary)", border: "1px solid var(--border-strong)", padding: "0.2rem 0.5rem", borderRadius: "12px", background: "var(--bg-secondary)", height: "fit-content", flexShrink: 0 }}>
                          {c.page}
                        </span>
                      </li>
                      </Reveal>
                    ))}
                  </ol>
                </div>
              </>
            )}
            <div style={{ height: "6rem" }} />
          </div>

          {/* ── Floating follow-up bar ── */}
          <div style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)", width: "90%", maxWidth: 640 }}>
            <div className="glass-panel" style={{ padding: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem", borderRadius: "12px", border: "1px solid var(--border-strong)" }}>
              <input
                type="text"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                onKeyDown={onKey}
                placeholder="Ask a citation-backed follow-up question…"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "0.9rem", color: "var(--text-primary)", padding: "0.75rem 1rem", fontFamily: "var(--font-sans)" }}
              />
              <button onClick={submitFollowUp} className="btn-primary" style={{ padding: "0.6rem 1.2rem", fontSize: "0.8rem", borderRadius: "8px" }}>
                Submit
              </button>
            </div>
          </div>
        </main>

        {/* Right — Bibliography / Reading Room */}
        <aside
          className="reading-room-col glass-panel"
          style={{
            width: rightColWidth,
            flexShrink: 0,
            borderLeft: "1px solid var(--border-light)",
            background: "var(--bg-secondary)",
            borderRadius: "0",
            overflowY: "auto",
            overflowX: "hidden",
            zIndex: 10
          }}
        >
          {openCitation ? (
            <ReadingRoom
              citation={openCitation}
              documentRecord={activeDocRecord}
              onClose={() => setOpenCitation(null)}
            />
          ) : (
            <BibliographyPanel
              citations={synthesis?.citations ?? []}
              activeFootnote={activeFootnote}
              onHover={setActiveFootnote}
              onOpen={openDoc}
              onOpenExportModal={() => setIsExportModalOpen(true)}
              inquiryId={synthesis?.inquiryId}
            />
          )}
        </aside>
      </div>

      <ExportBibliographyModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        citations={synthesis?.citations || []}
        inquiryTitle={activeQuery.question}
      />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function MetaTag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-secondary)", fontWeight: 500 }}>
      {children}
    </span>
  );
}

function BibliographyPanel({
  citations,
  activeFootnote,
  onHover,
  onOpen,
  onOpenExportModal,
  inquiryId,
}: {
  citations: Citation[];
  activeFootnote: number | null;
  onHover: (n: number | null) => void;
  onOpen: (n: number) => void;
  onOpenExportModal: () => void;
  inquiryId?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [copiedCardId, setCopiedCardId] = useState<number | null>(null);

  function handleCopyCitations() {
    if (!citations.length) return;
    const formatted = citations.map((c) => formatAPA(c)).join("\n\n");
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopySingleAPA(e: React.MouseEvent, c: Citation) {
    e.stopPropagation();
    const formatted = formatAPA(c);
    navigator.clipboard.writeText(formatted);
    setCopiedCardId(c.id);
    setTimeout(() => setCopiedCardId(null), 1800);
  }

  return (
    <div style={{ padding: "2rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--text-primary)", margin: 0, fontWeight: 600 }}>
          Bibliography
        </p>
        <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>Click card to view in reader</span>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button
          onClick={onOpenExportModal}
          disabled={citations.length === 0}
          className="btn-ghost"
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            padding: "0.5rem",
            fontSize: "0.72rem",
            opacity: citations.length === 0 ? 0.5 : 1,
            border: "1px solid var(--border-strong)",
            borderRadius: "6px",
          }}
          title="Export formatted citations (BibTeX, APA, MLA, Chicago)"
        >
          <span>📥</span>
          <span>Export All</span>
        </button>

        <button
          onClick={handleCopyCitations}
          disabled={citations.length === 0}
          className="btn-ghost"
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            padding: "0.5rem",
            fontSize: "0.72rem",
            border: "1px solid var(--border-light)",
            borderRadius: "6px",
            background: copied ? "var(--text-primary)" : "transparent",
            color: copied ? "var(--bg-primary)" : "inherit",
            opacity: citations.length === 0 ? 0.5 : 1,
          }}
          title="Copy all citations in APA format"
        >
          <span>{copied ? "✓" : "📋"}</span>
          <span>{copied ? "Copied!" : "Copy APA"}</span>
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {citations.map((c) => {
          const highlighted = activeFootnote === c.id;
          const isCardCopied = copiedCardId === c.id;
          return (
            <div
              key={c.id}
              className="glass-panel-hover"
              onMouseEnter={() => onHover(c.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onOpen(c.id)}
              style={{
                padding: "1rem",
                background: highlighted ? "var(--accent-light)" : "transparent",
                border: "1px solid",
                borderColor: highlighted ? "var(--border-strong)" : "var(--border-light)",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.55rem", fontWeight: 600, color: "var(--text-primary)", border: "1px solid var(--border-strong)", padding: "0.1rem 0.4rem", borderRadius: "12px", background: "var(--accent-light)" }}>
                  {c.collectionType}
                </span>
                <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)" }}>{c.callNumber}</span>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)", flexShrink: 0, paddingTop: "0.1rem" }}>
                  {SUP[c.id]}
                </span>
                <p style={{ fontStyle: "italic", fontSize: "0.85rem", lineHeight: 1.4, color: "var(--text-primary)", margin: 0 }}>
                  {c.title}
                </p>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem", borderTop: "1px solid var(--border-light)" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{c.author} · {c.year}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <button
                    onClick={(e) => handleCopySingleAPA(e, c)}
                    className="btn-ghost"
                    style={{
                      padding: "2px 6px",
                      fontSize: "0.6rem",
                      borderRadius: "4px",
                      border: "1px solid var(--border-subtle)",
                      background: isCardCopied ? "var(--text-primary)" : "transparent",
                      color: isCardCopied ? "var(--bg-primary)" : "var(--text-secondary)",
                    }}
                    title="Copy APA reference for this document"
                  >
                    {isCardCopied ? "✓ Copied" : "Cite"}
                  </button>
                  <span style={{ fontSize: "0.6rem", fontWeight: 600, color: "var(--text-primary)", background: "var(--accent-light)", padding: "0.2rem 0.5rem", borderRadius: "12px" }}>
                    {c.page}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
