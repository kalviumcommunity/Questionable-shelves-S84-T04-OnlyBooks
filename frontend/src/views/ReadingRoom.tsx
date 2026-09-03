import { useState } from "react";
import type { Citation, DocumentRecord } from "../data/libraryKnowledge";

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
  const doc = documentRecord ?? DOCUMENTS[citation.id] ?? DOCUMENTS[1];
  const [sectionIdx, setSectionIdx] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [pageInput, setPageInput] = useState(citation.page.replace("Pg. ", ""));
  const section = doc.sections[sectionIdx] ?? doc.sections[0];

  const viewer = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#FAFAFA",
      }}
    >
      {/* ── Viewer top bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.5rem 1rem",
          borderBottom: "1px solid #1C1C1C",
          flexShrink: 0,
          background: "#FAFAFA",
          gap: "0.75rem",
        }}
      >
        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "0.8rem",
              color: "#1C1C1C",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {citation.title}
          </p>
          <p style={{ fontSize: "0.6rem", color: "#9CA3AF", margin: 0 }}>
            {citation.author} · {citation.journal}, {citation.year}
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.6rem", color: "#9CA3AF" }}>p.</span>
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              style={{
                width: 30,
                fontSize: "0.65rem",
                textAlign: "center",
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                outline: "none",
                padding: "1px 3px",
                color: "#1C1C1C",
              }}
            />
            <span style={{ fontSize: "0.6rem", color: "#9CA3AF" }}>/ {doc.totalPages}</span>
          </div>

          <IconBtn
            title={focusMode ? "Exit focus mode" : "Expand to focus mode"}
            onClick={() => setFocusMode((f) => !f)}
          >
            {focusMode ? "⤢" : "⤡"}
          </IconBtn>

          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1rem",
              lineHeight: 1,
              color: "#6B7280",
              padding: "0 2px",
              transition: "color 0.12s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#1C1C1C")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#6B7280")}
          >
            ×
          </button>
        </div>
      </div>

      {/* ── Body: chapter nav + page ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Chapter sidebar — only visible in focus mode or when multiple sections */}
        {(focusMode || doc.sections.length > 1) && (
          <div
            style={{
              width: focusMode ? 180 : 140,
              flexShrink: 0,
              borderRight: "1px solid #E5E7EB",
              overflowY: "auto",
              padding: "1rem 0.75rem",
            }}
          >
            <p
              style={{
                fontSize: "0.55rem",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "#9CA3AF",
                marginBottom: "0.75rem",
              }}
            >
              Contents
            </p>
            {doc.sections.map((s, i) => (
              <div
                key={i}
                onClick={() => setSectionIdx(i)}
                style={{
                  padding: "0.5rem 0",
                  borderBottom: "1px solid #E5E7EB",
                  cursor: "pointer",
                }}
              >
                <p
                  style={{
                    fontSize: "0.58rem",
                    color: "#9CA3AF",
                    margin: "0 0 0.15rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Ch. {s.chapterNum}
                </p>
                <p
                  style={{
                    fontSize: "0.7rem",
                    lineHeight: 1.35,
                    color: i === sectionIdx ? "#1C1C1C" : "#6B7280",
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
        <div style={{ flex: 1, overflowY: "auto", padding: focusMode ? "2.5rem 8vw" : "1.25rem 1.5rem" }}>
          {/* The framed document */}
          <div
            style={{
              border: "1px solid #1C1C1C",
              background: "#FFFFFF",
              minHeight: "calc(100% - 2rem)",
              maxWidth: focusMode ? 680 : "none",
              margin: "0 auto",
            }}
          >
            {/* Document header strip */}
            <div
              style={{
                padding: "0.625rem 1.5rem",
                borderBottom: "1px solid #E5E7EB",
                background: "#F8F8F8",
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
                      fontSize: "0.55rem",
                      fontWeight: 600,
                      color: "#0F172A",
                      border: "1px solid #D1D5DB",
                      padding: "0.1rem 0.4rem",
                      letterSpacing: "0.04em",
                      background: "#FFFFFF",
                    }}
                  >
                    {citation.collectionType}
                  </span>
                )}
                <span
                  style={{
                    fontSize: "0.58rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    color: "#6B7280",
                  }}
                >
                  {citation.callNumber ? `Call # ${citation.callNumber}` : citation.journal}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "0.58rem", color: "#9CA3AF" }}>
                  {citation.journal}
                </span>
                {citation.doi && (
                  <span style={{ fontSize: "0.56rem", color: "#C4C9D0" }}>
                    doi: {citation.doi}
                  </span>
                )}
              </div>
            </div>

            {/* Page content */}
            <div style={{ padding: "2.5rem 2.5rem 3rem" }}>
              {/* Chapter label */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  marginBottom: "1.75rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.58rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.16em",
                    color: "#9CA3AF",
                    flexShrink: 0,
                  }}
                >
                  Chapter {section.chapterNum}
                </span>
                <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
              </div>

              {/* Chapter title */}
              <h2
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: focusMode ? "1.6rem" : "1.3rem",
                  fontWeight: 500,
                  lineHeight: 1.25,
                  color: "#1C1C1C",
                  marginBottom: "1.75rem",
                  marginTop: 0,
                }}
              >
                {section.chapterTitle}
              </h2>

              {/* Blocks */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {section.blocks.map((block, i) => {
                  if (block.type === "rule") {
                    return (
                      <div
                        key={i}
                        style={{ height: 1, background: "#E5E7EB", margin: "0.75rem 0" }}
                      />
                    );
                  }
                  if (block.type === "heading") {
                    return (
                      <h3
                        key={i}
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: "1rem",
                          fontWeight: 600,
                          color: "#1C1C1C",
                          marginTop: "0.5rem",
                          marginBottom: 0,
                        }}
                      >
                        {block.text}
                      </h3>
                    );
                  }
                  if (block.type === "paragraph") {
                    return (
                      <p
                        key={i}
                        style={{
                          fontSize: focusMode ? "0.9rem" : "0.82rem",
                          lineHeight: 1.85,
                          color: "#1C1C1C",
                          margin: 0,
                          textAlign: "justify",
                          hyphens: "auto",
                        }}
                      >
                        {block.text}
                      </p>
                    );
                  }
                  if (block.type === "blockquote") {
                    return (
                      <blockquote
                        key={i}
                        style={{
                          margin: "0.5rem 0",
                          padding: "0.75rem 1.25rem",
                          borderLeft: "2px solid #1C1C1C",
                          fontFamily: "var(--font-serif)",
                          fontStyle: "italic",
                          fontSize: focusMode ? "0.95rem" : "0.875rem",
                          lineHeight: 1.7,
                          color: "#1C1C1C",
                        }}
                      >
                        {block.text}
                      </blockquote>
                    );
                  }
                  if (block.type === "highlight") {
                    return (
                      <div key={i}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.55rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.14em",
                              color: "#9CA3AF",
                            }}
                          >
                            Extracted passage
                          </span>
                          <span
                            style={{
                              fontSize: "0.55rem",
                              fontWeight: 600,
                              color: "#0F172A",
                              border: "1px solid #E5E7EB",
                              padding: "0.1rem 0.375rem",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {block.pageRef}
                          </span>
                        </div>
                        <div
                          style={{
                            padding: "1rem 1.25rem",
                            backgroundColor: "rgba(254, 240, 138, 0.30)",
                            borderLeft: "2px solid rgba(202, 138, 4, 0.4)",
                          }}
                        >
                          <p
                            style={{
                              fontSize: focusMode ? "0.9rem" : "0.82rem",
                              lineHeight: 1.85,
                              color: "#1C1C1C",
                              margin: 0,
                              fontStyle: "italic",
                              textAlign: "justify",
                              hyphens: "auto",
                            }}
                          >
                            {block.text}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>

            {/* Page footer */}
            <div
              style={{
                borderTop: "1px solid #E5E7EB",
                padding: "0.625rem 2.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#F8F8F8",
              }}
            >
              <span style={{ fontSize: "0.6rem", color: "#C4C9D0" }}>
                © {citation.year} {citation.journal}
              </span>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                {sectionIdx > 0 && (
                  <button
                    onClick={() => setSectionIdx((s) => s - 1)}
                    style={navBtnStyle}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#1C1C1C")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "#9CA3AF")}
                  >
                    ← Prev
                  </button>
                )}
                <span style={{ fontSize: "0.6rem", color: "#9CA3AF" }}>
                  {citation.page}
                </span>
                {sectionIdx < doc.sections.length - 1 && (
                  <button
                    onClick={() => setSectionIdx((s) => s + 1)}
                    style={navBtnStyle}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#1C1C1C")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "#9CA3AF")}
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

  if (focusMode) {
    return <div className="focus-overlay">{viewer}</div>;
  }

  return viewer;
}

// ── Tiny helpers ───────────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "0.62rem",
  color: "#9CA3AF",
  padding: 0,
  transition: "color 0.12s",
  letterSpacing: "0.04em",
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
      style={{
        background: "none",
        border: "1px solid #E5E7EB",
        cursor: "pointer",
        padding: "2px 6px",
        fontSize: "0.68rem",
        color: "#6B7280",
        lineHeight: 1.5,
        transition: "border-color 0.12s, color 0.12s",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = "#1C1C1C";
        e.currentTarget.style.color = "#1C1C1C";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = "#E5E7EB";
        e.currentTarget.style.color = "#6B7280";
      }}
    >
      {children}
    </button>
  );
}
