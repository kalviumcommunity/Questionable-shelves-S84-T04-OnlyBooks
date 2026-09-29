import { useState, useEffect, useMemo } from "react";
import type { Citation, DocumentRecord } from "../data/libraryKnowledge";
import { readingRoomApi, ReadingRoomResponse, RawPageResponse } from "../services/api";
import ExportBibliographyModal from "../components/ExportBibliographyModal";

interface Props {
  citation: Citation;
  onClose: () => void;
  documentRecord?: DocumentRecord;
}

// ── Full document content per citation ─────────────────────────────────────

interface DocSection {
  chapterNum: string;
  chapterTitle: string;
  blocks: Array<
    | { type: "heading"; text: string }
    | { type: "paragraph"; text: string }
    | { type: "highlight"; text: string; pageRef: string }
    | { type: "blockquote"; text: string }
    | { type: "rule" }
  >;
}

const DOCUMENTS: Record<number, { totalPages: number; sections: DocSection[] }> = {
  1: {
    totalPages: 212,
    sections: [
      {
        chapterNum: "V",
        chapterTitle: "The Priority of Paradigms",
        blocks: [
          {
            type: "paragraph",
            text: "In this essay, 'normal science' means research firmly based upon one or more past scientific achievements, achievements that some particular scientific community acknowledges for a time as supplying the foundation for its further practice. Today such achievements are recounted, though seldom in their original form, by science textbooks, elementary and advanced.",
          },
          {
            type: "paragraph",
            text: "These textbooks expound the body of accepted theory, illustrate many or all of its successful applications, and compare these applications with exemplary observations and experiments. Before such books became popular early in the nineteenth century (and until even more recently in the newly matured sciences), many of the famous classics of science fulfilled a similar function.",
          },
          {
            type: "paragraph",
            text: "Aristotle's Physica, Ptolemy's Almagest, Newton's Principia and Opticks, Franklin's Electricity, Lavoisier's Chemistry, and Lyell's Geology — these and many other works served for a time implicitly to define the legitimate problems and methods of a research field for succeeding generations of practitioners.",
          },
          { type: "rule" },
          {
            type: "heading",
            text: "The Nature of Normal Science",
          },
          {
            type: "paragraph",
            text: "What is it that the student of natural science acquires through exposure to paradigms? He acquires, through training, a disposition to see nature in terms of the concepts and instruments that an accepted paradigm supplies. And this disposition shapes the way he sees, the questions he asks, and the problems he identifies as legitimate topics of inquiry.",
          },
          {
            type: "blockquote",
            text: "A paradigm is what the members of a scientific community share, and, conversely, a scientific community consists of men who share a paradigm.",
          },
          {
            type: "highlight",
            text: "The transition from a paradigm in crisis to a new one from which a new tradition of normal science can emerge is far from a cumulative process, one achieved by an articulation or extension of the old paradigm. Rather it is a reconstruction of the field from new fundamentals, a reconstruction that changes some of the field's most elementary theoretical generalizations as well as many of its paradigm methods and applications.",
            pageRef: "Pg. 77",
          },
          {
            type: "paragraph",
            text: "When the transition is complete the profession will have changed its view of the field, its methods, and its goals. One perceptive historian, viewing a classic case of a science's reorientation by paradigm change, described it as 'picking up the other end of the stick', a process that involves 'handling the same bundle of data as before, but placing them in a new system of relations with one another by giving them a different framework.'",
          },
        ],
      },
      {
        chapterNum: "VI",
        chapterTitle: "Anomaly and the Emergence of Scientific Discoveries",
        blocks: [
          {
            type: "paragraph",
            text: "Normal science, the puzzle-solving activity we have just examined, is a highly cumulative enterprise, eminently successful in its aim, the steady extension of the scope and precision of scientific knowledge. In all these respects it fits with great precision the most usual image of scientific work.",
          },
          {
            type: "paragraph",
            text: "Yet one standard product of the scientific enterprise is missing. Normal science does not aim at novelties of fact or theory and, when successful, finds none. New and unsuspected phenomena are, however, repeatedly uncovered by scientific research, and radical new theories have again and again been invented by scientists.",
          },
        ],
      },
    ],
  },
  2: {
    totalPages: 296,
    sections: [
      {
        chapterNum: "I",
        chapterTitle: "Introduction: Science Without Method",
        blocks: [
          {
            type: "paragraph",
            text: "Science is an essentially anarchic enterprise: theoretical anarchism is more humanitarian and more likely to encourage progress than its law-and-order alternatives. This is shown both by an examination of historical episodes and by an abstract analysis of the relation between idea and action.",
          },
          {
            type: "blockquote",
            text: "The only principle that does not inhibit progress is: anything goes.",
          },
          {
            type: "paragraph",
            text: "The idea that science can and should be run according to fixed and universal rules is both unrealistic and pernicious. It is unrealistic, because it takes too simple a view of the talents of man and of the circumstances which encourage, or cause, their development. And it is pernicious, because the attempt to enforce the rules is bound to increase our professional qualifications at the expense of our humanity.",
          },
          {
            type: "highlight",
            text: "The consistency condition which demands that new hypotheses agree with accepted theories is unreasonable because it preserves the older theory, and not the better theory. Hypotheses contradicting well-confirmed theories give us evidence that cannot be obtained in any other way. Proliferation of theories is beneficial for science, while uniformity impairs its critical power.",
            pageRef: "Pg. 23",
          },
          {
            type: "paragraph",
            text: "There is not a single rule, however plausible, and however firmly grounded in epistemology, that is not violated at some time or other. It becomes evident that such violations are not accidental events, they are not results of insufficient knowledge or of inattention which might have been avoided. On the contrary, we see that they are necessary for progress.",
          },
        ],
      },
    ],
  },
  3: {
    totalPages: 480,
    sections: [
      {
        chapterNum: "I",
        chapterTitle: "A Survey of Some Fundamental Problems",
        blocks: [
          {
            type: "paragraph",
            text: "A scientist, whether theorist or experimenter, puts forward statements, or systems of statements, and tests them step by step. In the field of the empirical sciences, more particularly, he constructs hypotheses, or systems of theories, and tests them against experience by observation and experiment.",
          },
          {
            type: "paragraph",
            text: "I suggest that it is the task of the logic of scientific discovery, or the logic of knowledge, to give a logical analysis of this procedure; that is, to analyse the method of the empirical sciences.",
          },
          {
            type: "highlight",
            text: "A theory which is not refutable by any conceivable event is non-scientific. Irrefutability is not a virtue of a theory (as people often think) but a vice. Every genuine test of a theory is an attempt to falsify it, or to refute it. Testability is falsifiability; but there are degrees of testability: some theories are more testable, more exposed to refutation, than others.",
            pageRef: "Pg. 41",
          },
          {
            type: "blockquote",
            text: "The empirical base of objective science has thus nothing 'absolute' about it. Science does not rest upon solid bedrock. The bold structure of its theories rises, as it were, above a swamp.",
          },
        ],
      },
    ],
  },
  4: {
    totalPages: 431,
    sections: [
      {
        chapterNum: "I",
        chapterTitle: "Science: Conjectures and Refutations",
        blocks: [
          {
            type: "paragraph",
            text: "When I received the list of participants in this course and realized that I had been asked to speak to philosophical colleagues I thought, after some hesitation and consultation, that you would probably prefer me to speak about those problems which interests me most, and about those developments with which I am most intimately acquainted.",
          },
          {
            type: "highlight",
            text: "Bold ideas, unjustified anticipations, and speculative thought are our only means for interpreting nature: our only organon, our only instrument, for grasping her. And we must hazard them to win our prize. Those among us who are unwilling to expose their ideas to the hazard of refutation do not take part in the scientific game.",
            pageRef: "Pg. 36",
          },
          {
            type: "blockquote",
            text: "It is easy to obtain confirmations, or verifications, for nearly every theory — if we look for confirmations. Confirmations should count only if they are the result of risky predictions.",
          },
          {
            type: "paragraph",
            text: "The problem which troubled me at the time was neither 'When is a theory true?' nor 'When is a theory acceptable?' My problem was different. I wished to distinguish between science and pseudo-science; knowing very well that science often errs, and that pseudoscience may happen to stumble on the truth.",
          },
        ],
      },
    ],
  },
  5: {
    totalPages: 449,
    sections: [
      {
        chapterNum: "VII",
        chapterTitle: "The Craft of Intellectual Work",
        blocks: [
          {
            type: "paragraph",
            text: "Science is a social activity, and its objects are produced through a craft practice. The characteristically modern tendency to reduce all craft knowledge to explicit, articulable rules has been especially pronounced in discussions of scientific method.",
          },
          {
            type: "paragraph",
            text: "Yet the history of science reveals that the most significant achievements have always involved an element of tacit knowledge — knowing that cannot be fully articulated but is nevertheless reliably transmitted through training and practice.",
          },
          {
            type: "highlight",
            text: "The quality of scientific work cannot be maintained by the imposition of a single standard criterion or test; quality control in science is a craft, in the same sense as any other skilled trade where the standards of excellence are embodied in the practice itself and cannot be fully articulated as explicit rules. The laboratory, far from being a mere site for algorithmic verification, is a workshop where tacit knowledge is both deployed and reproduced.",
            pageRef: "Pg. 183",
          },
          {
            type: "blockquote",
            text: "It is a curious feature of scientific education that the very procedures by which science is transmitted seem designed to conceal the craft element.",
          },
          {
            type: "paragraph",
            text: "The quality of the inputs to science — observations, instruments, experimental procedures — depends on craft skills which are not fully codifiable. This is why judgements of quality in science cannot be reduced to an algorithm and must be made by persons with relevant experience, operating within a community that shares the relevant standards.",
          },
        ],
      },
    ],
  },
};

// ── Component ──────────────────────────────────────────────────────────────

export default function ReadingRoom({ citation, onClose, documentRecord }: Props) {
  const [liveDoc, setLiveDoc] = useState<ReadingRoomResponse | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [isCiteOpen, setIsCiteOpen] = useState(false);

  // In-document deep search & passage quotes
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedHighlight, setCopiedHighlight] = useState(false);

  function handleCopyQuote(quoteText: string | undefined, pageRef?: string) {
    if (!quoteText) return;
    const pageStr = pageRef || citation.page;
    const formatted = `"${quoteText.trim()}" — ${citation.author} (${citation.year}), ${pageStr} [${citation.callNumber}]`;
    navigator.clipboard.writeText(formatted);
    setCopiedHighlight(true);
    setTimeout(() => setCopiedHighlight(false), 2000);
  }

  function renderHighlightedText(text: string | undefined, query: string) {
    if (!text) return "";
    if (!query || !query.trim()) return text;
    const q = query.trim();
    const parts = text.split(new RegExp(`(${q.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <mark
              key={i}
              style={{
                backgroundColor: "rgba(250, 204, 21, 0.45)",
                color: "inherit",
                padding: "1px 3px",
                borderRadius: "2px",
              }}
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  }

  // Raw leaf OCR transcript mode
  const [rawMode, setRawMode] = useState(false);
  const [rawPage, setRawPage] = useState<RawPageResponse | null>(null);
  const [loadingRaw, setLoadingRaw] = useState(false);

  const initialPage = useMemo(() => {
    const parsed = parseInt(citation.page.replace(/\D+/g, ""), 10);
    return isNaN(parsed) ? 1 : parsed;
  }, [citation.page]);

  const [activePage, setActivePage] = useState<number>(initialPage);
  const [pageInput, setPageInput] = useState<string>(initialPage.toString());

  // Fetch live document sections & highlight block from API
  useEffect(() => {
    const pageNum = parseInt(citation.page.replace(/\D+/g, ""), 10) || 1;
    setActivePage(pageNum);
    setPageInput(pageNum.toString());
    setRawMode(false);
    setRawPage(null);

    if (!citation.documentId) {
      setLiveDoc(null);
      return;
    }

    let isMounted = true;
    setLoadingDoc(true);

    readingRoomApi
      .getReadingRoom(citation.documentId, pageNum, citation.id, citation.extractedQuote)
      .then((res) => {
        if (!isMounted) return;
        setLiveDoc(res);
        const secIndex = res.sections.findIndex(
          (s) => s.start_page <= pageNum && pageNum <= s.end_page
        );
        setSectionIdx(secIndex >= 0 ? secIndex : 0);
        setLoadingDoc(false);
      })
      .catch((err) => {
        console.warn("Could not retrieve live reading room, using archival fallback:", err);
        if (isMounted) setLoadingDoc(false);
      });

    return () => {
      isMounted = false;
    };
  }, [citation.id, citation.documentId, citation.page, citation.extractedQuote]);

  // Handle jump to page
  function handleJumpPage(pageNum: number) {
    if (isNaN(pageNum) || pageNum < 1) return;
    setActivePage(pageNum);
    setPageInput(pageNum.toString());

    if (citation.documentId) {
      setLoadingDoc(true);
      readingRoomApi
        .getReadingRoom(citation.documentId, pageNum, citation.id, citation.extractedQuote)
        .then((res) => {
          setLiveDoc(res);
          const secIndex = res.sections.findIndex(
            (s) => s.start_page <= pageNum && pageNum <= s.end_page
          );
          setSectionIdx(secIndex >= 0 ? secIndex : 0);
          setLoadingDoc(false);
        })
        .catch(() => setLoadingDoc(false));

      if (rawMode) {
        setLoadingRaw(true);
        readingRoomApi
          .getRawPage(citation.documentId, pageNum)
          .then((res) => {
            setRawPage(res);
            setLoadingRaw(false);
          })
          .catch(() => setLoadingRaw(false));
      }
    }
  }

  function toggleRawMode() {
    const nextMode = !rawMode;
    setRawMode(nextMode);
    if (nextMode && citation.documentId && !rawPage) {
      setLoadingRaw(true);
      readingRoomApi
        .getRawPage(citation.documentId, activePage)
        .then((res) => {
          setRawPage(res);
          setLoadingRaw(false);
        })
        .catch(() => setLoadingRaw(false));
    }
  }

  // Normalized document structure
  const doc = useMemo(() => {
    if (liveDoc) {
      return {
        totalPages: liveDoc.total_pages,
        sections: liveDoc.sections.map((sec) => ({
          chapterNum: sec.chapter_num,
          chapterTitle: sec.chapter_title,
          blocks: sec.blocks.map((b) => ({
            type: b.type as "heading" | "paragraph" | "highlight" | "blockquote" | "rule",
            text: b.text || "",
            pageRef: b.page_ref,
          })),
        })),
      };
    }
    return documentRecord ?? DOCUMENTS[citation.id] ?? DOCUMENTS[1];
  }, [liveDoc, documentRecord, citation.id]);

  const section = doc.sections[sectionIdx] ?? doc.sections[0];

  const matchCount = useMemo(() => {
    if (!searchQuery.trim() || !section) return 0;
    const q = searchQuery.toLowerCase().trim();
    let count = 0;
    for (const b of section.blocks) {
      if ("text" in b && b.text) {
        const matches = b.text.toLowerCase().split(q).length - 1;
        count += matches;
      }
    }
    return count;
  }, [searchQuery, section]);

  const viewer = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-secondary)",
        color: "var(--text-primary)"
      }}
    >
      {/* ── Reading Progress Bar ── */}
      <div style={{ width: "100%", height: "2px", background: "var(--border-light)" }}>
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, Math.max(3, (activePage / (doc?.totalPages || 1)) * 100))}%`,
            background: "var(--accent-primary, #b45309)",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* ── Viewer top bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1.25rem",
          borderBottom: "1px solid var(--border-light)",
          flexShrink: 0,
          background: "var(--bg-primary)",
          gap: "0.75rem",
        }}
      >
        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "0.9rem",
              color: "var(--text-primary)",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {citation.title}
          </p>
          <p style={{ fontSize: "0.65rem", color: "var(--text-secondary)", margin: 0 }}>
            {citation.author} · {citation.journal}, {citation.year}
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "var(--accent-light)", padding: "2px 8px", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
            <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)" }}>p.</span>
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const num = parseInt(pageInput, 10);
                  if (!isNaN(num)) handleJumpPage(num);
                }
              }}
              style={{
                width: 32,
                fontSize: "0.7rem",
                textAlign: "center",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
              }}
            />
            <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)" }}>/ {doc.totalPages}</span>
          </div>

          <IconBtn
            title={rawMode ? "Return to formatted reading room" : "Inspect raw archival leaf"}
            onClick={toggleRawMode}
          >
            {rawMode ? "Formatted" : "Raw Leaf"}
          </IconBtn>

          {searchOpen ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                background: "var(--bg-primary)",
                border: "1px solid var(--border-strong)",
                borderRadius: "14px",
                padding: "2px 8px",
              }}
            >
              <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>🔍</span>
              <input
                type="text"
                autoFocus
                placeholder="Search chapter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: 105,
                  fontSize: "0.7rem",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                }}
              />
              {searchQuery && (
                <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  {matchCount} match{matchCount !== 1 ? "es" : ""}
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchOpen(false);
                }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--text-secondary)", padding: 0 }}
              >
                ✕
              </button>
            </div>
          ) : (
            <IconBtn title="Search keywords within this chapter" onClick={() => setSearchOpen(true)}>
              🔍 Search
            </IconBtn>
          )}

          <IconBtn
            title="Cite or export reference (BibTeX, APA, MLA, Chicago)"
            onClick={() => setIsCiteOpen(true)}
          >
            Cite
          </IconBtn>

          <IconBtn
            title={focusMode ? "Exit focus mode" : "Expand to focus mode"}
            onClick={() => setFocusMode((f) => !f)}
          >
            {focusMode ? "⤢" : "⤡"}
          </IconBtn>

          <button
            onClick={onClose}
            className="btn-ghost"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              padding: 0,
              fontSize: "1.2rem",
              borderRadius: "50%"
            }}
          >
            ×
          </button>
        </div>
      </div>

      {loadingDoc && (
        <div
          style={{
            padding: "0.4rem 1.25rem",
            background: "var(--accent-light)",
            borderBottom: "1px solid var(--border-light)",
            fontSize: "0.65rem",
            color: "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <div className="loader-minimal" style={{ width: 10, height: 10, borderWidth: 2 }} />
          <span>Retrieving in-situ passage from library catalog archive…</span>
        </div>
      )}

      {/* ── Body: chapter nav + page ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Chapter sidebar — only visible in focus mode or when multiple sections */}
        {(focusMode || doc.sections.length > 1) && (
          <div
            style={{
              width: focusMode ? 200 : 160,
              flexShrink: 0,
              borderRight: "1px solid var(--border-light)",
              overflowY: "auto",
              padding: "1.25rem 1rem",
              background: "var(--bg-primary)"
            }}
          >
            <p
              style={{
                fontSize: "0.6rem",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "var(--text-secondary)",
                marginBottom: "1rem",
              }}
            >
              Contents
            </p>
            {doc.sections.map((s, i) => (
              <div
                key={i}
                onClick={() => setSectionIdx(i)}
                style={{
                  padding: "0.75rem 0.5rem",
                  borderBottom: "1px solid var(--border-light)",
                  cursor: "pointer",
                  background: i === sectionIdx ? "var(--accent-light)" : "transparent",
                  borderRadius: "6px"
                }}
              >
                <p
                  style={{
                    fontSize: "0.6rem",
                    color: "var(--text-secondary)",
                    margin: "0 0 0.2rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Ch. {s.chapterNum}
                </p>
                <p
                  style={{
                    fontSize: "0.75rem",
                    lineHeight: 1.4,
                    color: i === sectionIdx ? "var(--text-primary)" : "var(--text-secondary)",
                    fontWeight: i === sectionIdx ? 600 : 400,
                    margin: 0,
                    fontFamily: i === sectionIdx ? "var(--font-serif)" : "var(--font-sans)",
                    fontStyle: i === sectionIdx ? "italic" : "normal",
                  }}
                >
                  {s.chapterTitle}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Document page */}
        <div style={{ flex: 1, overflowY: "auto", padding: focusMode ? "3rem 10vw" : "1.5rem 2rem" }}>
          {/* The framed document */}
          <div
            className="glass-panel"
            style={{
              background: "var(--bg-secondary)",
              minHeight: "calc(100% - 2rem)",
              maxWidth: focusMode ? 760 : "none",
              margin: "0 auto",
              border: "1px solid var(--border-strong)",
              borderRadius: "12px",
              overflow: "hidden"
            }}
          >
            {/* Document header strip */}
            <div
              style={{
                padding: "0.75rem 2rem",
                borderBottom: "1px solid var(--border-light)",
                background: "var(--bg-primary)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {citation.collectionType && (
                  <span
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      border: "1px solid var(--border-strong)",
                      padding: "0.15rem 0.5rem",
                      letterSpacing: "0.04em",
                      background: "var(--accent-light)",
                      borderRadius: "12px"
                    }}
                  >
                    {citation.collectionType}
                  </span>
                )}
                <span
                  style={{
                    fontSize: "0.65rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    color: "var(--text-secondary)",
                  }}
                >
                  {citation.callNumber ? `Call # ${citation.callNumber}` : citation.journal}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                  {citation.journal}
                </span>
                {citation.doi && (
                  <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                    doi: {citation.doi}
                  </span>
                )}
              </div>
            </div>

            {/* Page content */}
            <div style={{ padding: "3rem 3rem 4rem" }}>
              {rawMode ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "2rem",
                      paddingBottom: "0.75rem",
                      borderBottom: "1px solid var(--border-light)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.65rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.14em",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Archival Leaf Transcript · Page {activePage}
                    </span>
                    <span
                      style={{
                        fontSize: "0.6rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        background: "var(--accent-light)",
                        border: "1px solid var(--border-strong)",
                        borderRadius: "12px",
                        padding: "0.15rem 0.5rem",
                      }}
                    >
                      Rare Archive Holding
                    </span>
                  </div>

                  {loadingRaw ? (
                    <p style={{ fontSize: "0.9rem", fontStyle: "italic", color: "var(--text-secondary)" }}>
                      Retrieving raw page text from rare book vault…
                    </p>
                  ) : (
                    <pre
                      style={{
                        fontFamily: "'Courier New', Courier, monospace",
                        fontSize: "0.9rem",
                        lineHeight: 1.8,
                        color: "var(--text-primary)",
                        whiteSpace: "pre-wrap",
                        background: "var(--accent-light)",
                        padding: "1.5rem",
                        border: "1px solid var(--border-light)",
                        borderRadius: "8px",
                      }}
                    >
                      {rawPage?.text_content || section.blocks.map((b) => "text" in b ? b.text : "").filter(Boolean).join("\n\n")}
                    </pre>
                  )}
                </div>
              ) : (
                <>
                  {/* Chapter label */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      marginBottom: "2rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.65rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.16em",
                        color: "var(--text-secondary)",
                        flexShrink: 0,
                        fontWeight: 600
                      }}
                    >
                      Chapter {section.chapterNum}
                    </span>
                    <div style={{ flex: 1, height: 1, background: "var(--border-light)" }} />
                  </div>

                  {/* Chapter title */}
                  <h2
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: focusMode ? "2rem" : "1.6rem",
                      fontWeight: 600,
                      lineHeight: 1.25,
                      marginBottom: "2rem",
                      marginTop: 0,
                    }}
                  >
                    {section.chapterTitle}
                  </h2>

                  {/* Blocks */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    {section.blocks.map((block, i) => {
                      if (block.type === "rule") {
                        return (
                          <div
                            key={i}
                            style={{ height: 1, background: "var(--border-light)", margin: "1rem 0" }}
                          />
                        );
                      }
                      if (block.type === "heading") {
                        return (
                          <h3
                            key={i}
                            style={{
                              fontFamily: "var(--font-sans)",
                              fontSize: "1.1rem",
                              fontWeight: 600,
                              color: "var(--text-primary)",
                              marginTop: "0.75rem",
                              marginBottom: 0,
                            }}
                          >
                            {renderHighlightedText(block.text, searchQuery)}
                          </h3>
                        );
                      }
                      if (block.type === "paragraph") {
                        return (
                          <p
                            key={i}
                            style={{
                              fontSize: focusMode ? "1rem" : "0.95rem",
                              lineHeight: 1.85,
                              color: "var(--text-primary)",
                              margin: 0,
                              textAlign: "justify",
                              hyphens: "auto",
                            }}
                          >
                            {renderHighlightedText(block.text, searchQuery)}
                          </p>
                        );
                      }
                      if (block.type === "blockquote") {
                        return (
                          <blockquote
                            key={i}
                            style={{
                              margin: "1rem 0",
                              padding: "1rem 1.5rem",
                              borderLeft: "3px solid var(--accent)",
                              background: "var(--accent-light)",
                              borderRadius: "0 8px 8px 0",
                              fontFamily: "var(--font-serif)",
                              fontStyle: "italic",
                              fontSize: focusMode ? "1.05rem" : "0.95rem",
                              lineHeight: 1.8,
                              color: "var(--text-primary)",
                            }}
                          >
                            {renderHighlightedText(block.text, searchQuery)}
                          </blockquote>
                        );
                      }
                      if (block.type === "highlight") {
                        return (
                          <div key={i} style={{ margin: "1rem 0" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                marginBottom: "0.75rem",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.6rem",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.14em",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                Extracted passage
                              </span>
                              <span
                                style={{
                                  fontSize: "0.6rem",
                                  fontWeight: 600,
                                  color: "var(--text-primary)",
                                  background: "var(--accent-light)",
                                  border: "1px solid var(--border-strong)",
                                  borderRadius: "12px",
                                  padding: "0.15rem 0.5rem",
                                  letterSpacing: "0.04em",
                                }}
                              >
                                {block.pageRef}
                              </span>

                              <button
                                onClick={() => handleCopyQuote(block.text, block.pageRef)}
                                className="btn-ghost"
                                style={{
                                  marginLeft: "auto",
                                  padding: "2px 8px",
                                  fontSize: "0.62rem",
                                  borderRadius: "4px",
                                  border: "1px solid var(--border-subtle)",
                                  background: copiedHighlight ? "var(--text-primary)" : "transparent",
                                  color: copiedHighlight ? "var(--bg-primary)" : "var(--text-secondary)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.3rem",
                                  cursor: "pointer",
                                }}
                                title="Copy exact passage quote with scholarly citation"
                              >
                                {copiedHighlight ? "✓ Copied Quote" : "📋 Copy Excerpt"}
                              </button>
                            </div>
                            <div
                              style={{
                                padding: "1.25rem 1.5rem",
                                backgroundColor: "var(--accent-light)",
                                borderLeft: "3px solid var(--accent)",
                                borderRadius: "0 8px 8px 0",
                              }}
                            >
                              <p
                                style={{
                                  fontSize: focusMode ? "1rem" : "0.95rem",
                                  lineHeight: 1.85,
                                  color: "var(--text-primary)",
                                  margin: 0,
                                  fontStyle: "italic",
                                  textAlign: "justify",
                                  hyphens: "auto",
                                }}
                              >
                                {renderHighlightedText(block.text, searchQuery)}
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Page footer */}
            <div
              style={{
                borderTop: "1px solid var(--border-light)",
                padding: "0.85rem 3rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--bg-primary)",
              }}
            >
              <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>
                © {citation.year} {citation.journal}
              </span>
              <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
                {sectionIdx > 0 && (
                  <button
                    onClick={() => setSectionIdx((s) => s - 1)}
                    style={navBtnStyle}
                    onMouseOver={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                  >
                    ← Prev
                  </button>
                )}
                <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  {citation.page}
                </span>
                {sectionIdx < doc.sections.length - 1 && (
                  <button
                    onClick={() => setSectionIdx((s) => s + 1)}
                    style={navBtnStyle}
                    onMouseOver={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                  >
                    Next →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {focusMode ? <div className="focus-overlay">{viewer}</div> : viewer}
      <ExportBibliographyModal
        isOpen={isCiteOpen}
        onClose={() => setIsCiteOpen(false)}
        citations={[citation]}
        inquiryTitle={citation.title}
      />
    </>
  );
}

// ── Tiny helpers ───────────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "0.7rem",
  color: "var(--text-secondary)",
  padding: 0,
  transition: "color 0.2s",
  letterSpacing: "0.04em",
  textTransform: "uppercase"
};

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="btn-ghost"
      style={{
        padding: "4px 10px",
        fontSize: "0.7rem",
        border: "1px solid var(--border-light)"
      }}
    >
      {children}
    </button>
  );
}
