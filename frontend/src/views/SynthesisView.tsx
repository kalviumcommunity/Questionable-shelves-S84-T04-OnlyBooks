import { useState, useEffect, KeyboardEvent, useMemo } from "react";
import ReadingRoom from "./ReadingRoom";
import type { Query, User } from "../App";
import { getSynthesisForQuery, Citation, DocumentRecord } from "../data/libraryKnowledge";
import { inquiryApi } from "../services/api";

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
}

// Unicode superscript map for footnote markers 1–9
const SUP: Record<number, string> = { 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
const SUP_REVERSE: Record<string, number> = Object.fromEntries(
  Object.entries(SUP).map(([k, v]) => [v, Number(k)])
);
// Regex that matches any superscript digit we use
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
}: Props) {
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeFootnote, setActiveFootnote] = useState<number | null>(null);
  const [openCitation, setOpenCitation] = useState<Citation | null>(null);
  const [followUp, setFollowUp] = useState("");
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

    // If active query is an existing saved inquiry from DB history
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
        height: "100%",
        fontFamily: "var(--font-sans)",
        background: "#FAFAFA",
      }}
    >
      {/* ── Top nav ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1.5rem",
          borderBottom: "1px solid #E5E7EB",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onNewSearch}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: 0,
          }}
        >
          <span style={{ color: "#9CA3AF", fontSize: "0.875rem" }}>←</span>
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: "0.95rem",
              color: "#0F172A",
            }}
          >
            OnlyBooks · University Library Archive
          </span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <span style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>{activeQuery.timestamp}</span>
          <div
            title={user.name}
            style={{
              width: 28,
              height: 28,
              border: "1px solid #1C1C1C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.6rem",
              fontWeight: 600,
              color: "#1C1C1C",
              letterSpacing: "0.05em",
              userSelect: "none",
            }}
          >
            {user.initials}
          </div>
        </div>
      </header>

      {/* ── Three-column body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left — Research Trail (20%) */}
        <aside
          style={{
            width: "20%",
            flexShrink: 0,
            borderRight: "1px solid #E5E7EB",
            overflowY: "auto",
            padding: "1.5rem 1rem",
          }}
        >
          <p
            style={{
              fontSize: "0.58rem",
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: "#6B7280",
              marginBottom: "1rem",
            }}
          >
            Research Inquiry Trail
          </p>
          {queryHistory.map((q) => {
            const isActive = q.id === activeQuery.id;
            return (
              <div
                key={q.id}
                onClick={() => {
                  onSelectQuery(q);
                  setOpenCitation(null);
                }}
                style={{
                  padding: "0.75rem 0",
                  borderBottom: "1px solid #E5E7EB",
                  cursor: "pointer",
                }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    lineHeight: 1.45,
                    color: isActive ? "#1C1C1C" : "#6B7280",
                    fontWeight: isActive ? 600 : 400,
                    fontStyle: isActive ? "normal" : "italic",
                    marginBottom: "0.2rem",
                  }}
                >
                  {q.question}
                </p>
                <p style={{ fontSize: "0.62rem", color: "#9CA3AF" }}>{q.timestamp}</p>
              </div>
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
          }}
        >
          {/* Scrollable article */}
          <div style={{ flex: 1, padding: "2.5rem 3rem", maxWidth: 740 }}>
            {/* H1 — the query */}
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "2rem",
                lineHeight: 1.25,
                fontWeight: 500,
                color: "#1C1C1C",
                marginBottom: "1.25rem",
              }}
            >
              {activeQuery.question}
            </h1>

            {loading || !synthesis ? (
              <div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.35rem 0.75rem",
                    background: "#EFF6FF",
                    border: "1px solid #BFDBFE",
                    borderRadius: "2px",
                    marginBottom: "1.75rem",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "#2563EB",
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.62rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: "#1E40AF",
                      fontWeight: 600,
                    }}
                  >
                    Executing Hybrid Retrieval (Dense Vector + BM25 Lexical + Reciprocal Rank Fusion)…
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                  <div style={{ height: 16, background: "#F3F4F6", width: "100%", borderRadius: 2 }} />
                  <div style={{ height: 16, background: "#F3F4F6", width: "94%", borderRadius: 2 }} />
                  <div style={{ height: 16, background: "#F3F4F6", width: "98%", borderRadius: 2 }} />
                  <div style={{ height: 16, background: "#F3F4F6", width: "82%", borderRadius: 2, marginBottom: "1rem" }} />

                  <div style={{ height: 16, background: "#F3F4F6", width: "100%", borderRadius: 2 }} />
                  <div style={{ height: 16, background: "#F3F4F6", width: "91%", borderRadius: 2 }} />
                  <div style={{ height: 16, background: "#F3F4F6", width: "87%", borderRadius: 2 }} />
                </div>
              </div>
            ) : (
              <>
                {/* Metadata byline */}
                <div
                  style={{
                    borderBottom: "1px solid #E5E7EB",
                    paddingBottom: "1rem",
                    marginBottom: "2rem",
                    display: "flex",
                    gap: "1.25rem",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <MetaTag>Library Synthesis</MetaTag>
                  <MetaTag>
                    {new Date().toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </MetaTag>
                  <MetaTag>{synthesis.citations.length} verified citations</MetaTag>
                  <MetaTag>{synthesis.summaryByline}</MetaTag>
                  <span
                    style={{
                      fontSize: "0.6rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "#065F46",
                      background: "#ECFDF5",
                      border: "1px solid #A7F3D0",
                      padding: "0.1rem 0.45rem",
                      fontWeight: 600,
                    }}
                  >
                    Attribution: {Math.round(synthesis.attributionScore * 100)}% Grounded
                  </span>
                  {isStreaming && (
                    <span
                      style={{
                        fontSize: "0.6rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "#1D4ED8",
                        background: "#EFF6FF",
                        border: "1px solid #BFDBFE",
                        padding: "0.1rem 0.45rem",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          backgroundColor: "#2563EB",
                          display: "inline-block",
                        }}
                      />
                      Streaming SSE Tokens Live…
                    </span>
                  )}
                </div>

                {/* Article body */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {synthesis.paragraphs.map((para, i) => (
                    <p
                      key={i}
                      style={{
                        fontSize: "0.925rem",
                        lineHeight: 1.8,
                        color: "#1C1C1C",
                        margin: 0,
                      }}
                    >
                      <RichParagraph
                        text={para.text}
                        activeFootnote={activeFootnote}
                        onHover={setActiveFootnote}
                        onOpen={openDoc}
                      />
                      {isStreaming && i === synthesis.paragraphs.length - 1 && (
                        <span
                          style={{
                            display: "inline-block",
                            marginLeft: "3px",
                            color: "#2563EB",
                            fontWeight: 700,
                            opacity: 0.85,
                          }}
                        >
                          ▍
                        </span>
                      )}
                    </p>
                  ))}
                </div>

                {/* References */}
                <div
                  style={{
                    marginTop: "3rem",
                    paddingTop: "1.5rem",
                    borderTop: "1px solid #E5E7EB",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.58rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.16em",
                      color: "#6B7280",
                      marginBottom: "0.875rem",
                    }}
                  >
                    Catalog References & Library Holdings
                  </p>
                  <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {synthesis.citations.map((c) => (
                      <li
                        key={c.id}
                        onClick={() => openDoc(c.id)}
                        style={{
                          display: "flex",
                          gap: "0.75rem",
                          padding: "0.6rem 0",
                          borderBottom: "1px solid #E5E7EB",
                          fontSize: "0.74rem",
                          lineHeight: 1.6,
                          color: "#6B7280",
                          cursor: "pointer",
                          transition: "color 0.12s",
                        }}
                        onMouseEnter={() => setActiveFootnote(c.id)}
                        onMouseLeave={() => setActiveFootnote(null)}
                      >
                        <span style={{ fontWeight: 600, color: "#1C1C1C", flexShrink: 0 }}>
                          {SUP[c.id] || `[${c.id}]`}
                        </span>
                        <span style={{ flex: 1 }}>
                          <em style={{ fontFamily: "var(--font-serif)", color: "#1C1C1C" }}>{c.title}</em>
                          {" — "}
                          {c.author} ({c.year}). {c.journal}.{" "}
                          <span style={{ color: "#0F172A", fontWeight: 500 }}>[{c.collectionType} · Call #: {c.callNumber}]</span>
                          {c.doi && <span style={{ color: "#9CA3AF" }}> DOI: {c.doi}</span>}
                        </span>
                        <span
                          style={{
                            fontSize: "0.58rem",
                            fontWeight: 600,
                            color: "#0F172A",
                            border: "1px solid #E5E7EB",
                            padding: "0.1rem 0.4rem",
                            letterSpacing: "0.04em",
                            height: "fit-content",
                            flexShrink: 0,
                          }}
                        >
                          {c.page}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}
            <div style={{ height: "5rem" }} />
          </div>

          {/* ── Sticky follow-up bar ── */}
          <div
            style={{
              position: "sticky",
              bottom: 0,
              background: "#FAFAFA",
              borderTop: "1px solid #E5E7EB",
              padding: "0.875rem 3rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <input
              type="text"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask a citation-backed follow-up question…"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                borderBottom: "1px solid #6B7280",
                outline: "none",
                fontSize: "0.875rem",
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "#1C1C1C",
                padding: "0.2rem 0 0.4rem",
                transition: "border-color 0.12s",
              }}
              onFocus={(e) => (e.target.style.borderBottomColor = "#1C1C1C")}
              onBlur={(e) => (e.target.style.borderBottomColor = "#6B7280")}
            />
            <button
              onClick={submitFollowUp}
              style={{
                background: "#1C1C1C",
                color: "#FAFAFA",
                border: "none",
                padding: "0.375rem 1rem",
                fontSize: "0.7rem",
                fontFamily: "var(--font-sans)",
                fontWeight: 500,
                letterSpacing: "0.04em",
                cursor: "pointer",
                flexShrink: 0,
                transition: "background 0.12s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#0F172A")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#1C1C1C")}
            >
              Submit
            </button>
          </div>
        </main>

        {/* Right — Bibliography / Reading Room */}
        <aside
          className="reading-room-col"
          style={{
            width: rightColWidth,
            flexShrink: 0,
            borderLeft: "1px solid #E5E7EB",
            overflowY: "auto",
            overflowX: "hidden",
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
            />
          )}
        </aside>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function MetaTag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: "0.62rem",
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "#9CA3AF",
      }}
    >
      {children}
    </span>
  );
}

function BibliographyPanel({
  citations,
  activeFootnote,
  onHover,
  onOpen,
}: {
  citations: Citation[];
  activeFootnote: number | null;
  onHover: (n: number | null) => void;
  onOpen: (n: number) => void;
}) {
  return (
    <div style={{ padding: "1.5rem 1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.875rem" }}>
        <p
          style={{
            fontSize: "0.58rem",
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "#6B7280",
            margin: 0,
          }}
        >
          Library Bibliography
        </p>
        <span style={{ fontSize: "0.58rem", color: "#9CA3AF" }}>Click to read page</span>
      </div>

      {citations.map((c) => {
        const highlighted = activeFootnote === c.id;
        return (
          <div
            key={c.id}
            onMouseEnter={() => onHover(c.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onOpen(c.id)}
            style={{
              padding: "0.875rem 0.625rem",
              borderBottom: "1px solid #E5E7EB",
              background: highlighted ? "#F3F4F6" : "transparent",
              cursor: "pointer",
              transition: "background 0.12s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <span
                style={{
                  fontSize: "0.52rem",
                  fontWeight: 600,
                  color: "#0F172A",
                  border: "1px solid #E5E7EB",
                  padding: "0.05rem 0.3rem",
                  letterSpacing: "0.04em",
                  background: "#FFFFFF",
                }}
              >
                {c.collectionType}
              </span>
              <span style={{ fontSize: "0.54rem", color: "#9CA3AF" }}>
                {c.callNumber}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "flex-start",
                marginBottom: "0.375rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  color: "#0F172A",
                  flexShrink: 0,
                  paddingTop: "0.125rem",
                }}
              >
                {SUP[c.id]}
              </span>
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: "0.825rem",
                  lineHeight: 1.35,
                  color: "#1C1C1C",
                  margin: 0,
                }}
              >
                {c.title}
              </p>
            </div>
            <div
              style={{
                paddingLeft: "1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "0.65rem", color: "#6B7280" }}>
                {c.author} · {c.year}
              </span>
              <span
                style={{
                  fontSize: "0.58rem",
                  fontWeight: 600,
                  color: "#0F172A",
                  border: "1px solid #E5E7EB",
                  padding: "0.1rem 0.4rem",
                  letterSpacing: "0.04em",
                }}
              >
                {c.page}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
