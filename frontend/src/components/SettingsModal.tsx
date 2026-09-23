import { useState } from "react";
import { User } from "../App";

interface Props {
  user: User;
  onClose: () => void;
  onSignOut: () => void;
}

type Tab = "appearance" | "notifications" | "account" | "privacy";

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 44, height: 26,
        borderRadius: 9999,
        border: "none",
        background: on ? "var(--accent)" : "rgba(0,0,0,0.18)",
        cursor: "pointer",
        position: "relative",
        padding: 0,
        flexShrink: 0,
        transition: "background 0.25s ease",
        outline: "none",
      }}
    >
      <span style={{
        position: "absolute",
        top: 4,
        left: on ? 22 : 4,
        width: 18, height: 18,
        borderRadius: "50%",
        background: "#fff",
        boxShadow: "0 1px 5px rgba(0,0,0,0.25)",
        transition: "left 0.25s ease",
      }} />
    </button>
  );
}

function Row({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "0.85rem 0", borderBottom: "1px solid var(--border-light)" }}>
      <div>
        <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 500, color: "var(--text-primary)" }}>{label}</p>
        {note && <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>{note}</p>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "appearance",    label: "Appearance",    icon: "🎨" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "account",       label: "Account",       icon: "👤" },
  { id: "privacy",       label: "Privacy",       icon: "🔒" },
];

export default function SettingsModal({ user, onClose, onSignOut }: Props) {
  const [tab, setTab] = useState<Tab>("appearance");
  const [compact, setCompact] = useState(false);
  const [motion, setMotion] = useState(false);
  const [fontSize, setFontSize] = useState<"sm"|"md"|"lg">("md");
  const [digest, setDigest] = useState(true);
  const [acqAlert, setAcqAlert] = useState(true);
  const [resAlert, setResAlert] = useState(false);
  const [history, setHistory] = useState(true);
  const [analytics, setAnalytics] = useState(true);

  return (
    <>
      <style>{`
        @keyframes sModalIn {
          from { opacity: 0; transform: scale(0.96) translateY(14px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .stab {
          display: flex; align-items: center; gap: 0.5rem;
          width: 100%; text-align: left;
          padding: 0.6rem 0.85rem;
          border: none; border-radius: 10px;
          background: transparent;
          font-size: 0.82rem; font-weight: 500; font-family: var(--font-sans);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .stab:hover { background: var(--accent-light); color: var(--text-primary); }
        .stab.on { background: var(--accent); color: var(--bg-primary); box-shadow: 0 3px 10px rgba(0,0,0,0.12); }
        .fsbtn {
          padding: 0.28rem 0.7rem;
          border: 1.5px solid var(--border-strong);
          border-radius: 8px;
          background: transparent;
          font-size: 0.78rem; font-weight: 600; font-family: var(--font-sans);
          color: var(--text-secondary); cursor: pointer;
          transition: all 0.18s ease;
        }
        .fsbtn.on { background: var(--accent); color: var(--bg-primary); border-color: var(--accent); }
        .scontent::-webkit-scrollbar { width: 4px; }
        .scontent::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
      `}</style>

      {/* BACKDROP */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(16px)",
          zIndex: 9998,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "1rem",
        }}
      >
        {/* MODAL */}
        <div
          onClick={(e) => e.stopPropagation()}
          
          style={{
            width: "100%", maxWidth: 680,
            maxHeight: "88vh",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
            zIndex: 9999,
            animation: "sModalIn 0.28s cubic-bezier(0.16,1,0.3,1) forwards", background: "var(--bg-secondary)",
            boxShadow: "0 40px 100px rgba(0,0,0,0.5)", border: "1px solid var(--border-strong)", borderRadius: 24,
          }}
        >
          {/* HEADER */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.4rem 1.75rem 1.2rem", borderBottom: "1px solid var(--border-light)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="var(--bg-primary)">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Settings</h2>
                <p style={{ margin: "0.1rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Preferences & account management</p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: "50%", border: "1.5px solid var(--border-strong)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", fontSize: "0.88rem", transition: "all 0.2s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-light)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >x</button>
          </div>

          {/* BODY */}
          <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

            {/* Sidebar */}
            <div style={{ width: 168, flexShrink: 0, padding: "1rem 0.75rem", borderRight: "1px solid var(--border-light)", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
              {TABS.map(({ id, label, icon }) => (
                <button key={id} className={`stab${tab === id ? " on" : ""}`} onClick={() => setTab(id)}>
                  <span>{icon}</span> {label}
                </button>
              ))}
              <div style={{ marginTop: "auto", paddingTop: "0.75rem", borderTop: "1px solid var(--border-light)" }}>
                <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--text-secondary)", opacity: 0.5 }}>OnlyBooks v1.0.0</p>
              </div>
            </div>

            {/* Content */}
            <div className="scontent" style={{ flex: 1, padding: "1.4rem 1.75rem 1rem", overflowY: "auto" }}>

              {tab === "appearance" && (
                <div>
                  <p style={{ margin: "0 0 0.15rem", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-secondary)", opacity: 0.65 }}>Display</p>
                  <Row label="Compact Mode" note="Reduce spacing for a denser interface layout.">
                    <Toggle on={compact} onChange={() => setCompact(!compact)} />
                  </Row>
                  <Row label="Reduce Motion" note="Minimize animations and transitions throughout the app.">
                    <Toggle on={motion} onChange={() => setMotion(!motion)} />
                  </Row>
                  <Row label="Font Size" note="Adjust the base reading size across all views.">
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      {(["sm","md","lg"] as const).map((s) => (
                        <button key={s} className={`fsbtn${fontSize === s ? " on" : ""}`} onClick={() => setFontSize(s)}>
                          {s.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </Row>
                </div>
              )}

              {tab === "notifications" && (
                <div>
                  <p style={{ margin: "0 0 0.15rem", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-secondary)", opacity: 0.65 }}>Email & Alerts</p>
                  <Row label="Weekly Digest" note="A curated summary of new acquisitions and highlights.">
                    <Toggle on={digest} onChange={() => setDigest(!digest)} />
                  </Row>
                  <Row label="New Acquisitions" note="Notify when documents are added to tracked collections.">
                    <Toggle on={acqAlert} onChange={() => setAcqAlert(!acqAlert)} />
                  </Row>
                  <Row label="Research Alerts" note="Alerts for papers matching your saved inquiry queries.">
                    <Toggle on={resAlert} onChange={() => setResAlert(!resAlert)} />
                  </Row>
                </div>
              )}

              {tab === "account" && (
                <div>
                  <p style={{ margin: "0 0 0.15rem", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-secondary)", opacity: 0.65 }}>Academic Profile</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.1rem 1.25rem", background: "var(--accent-light)", borderRadius: 16, border: "1px solid var(--border-light)", marginBottom: "1.25rem", marginTop: "0.4rem" }}>
                    <div style={{ width: 54, height: 54, borderRadius: "50%", background: "var(--accent)", color: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", fontWeight: 700, flexShrink: 0, boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }}>
                      {user.initials}
                    </div>
                    <div style={{ overflow: "hidden", flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "0.92rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</p>
                      <p style={{ margin: "0.12rem 0 0.3rem", fontSize: "0.775rem", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</p>
                      <span style={{ fontSize: "0.67rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>{user.role || "Scholar"}</span>
                    </div>
                  </div>
                  <Row label="Authentication" note={user.provider || "Institutional SSO"}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#16a34a", background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.25)", padding: "0.22rem 0.6rem", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
                      Active
                    </span>
                  </Row>
                  <div style={{ paddingTop: "1.5rem" }}>
                    <button
                      onClick={() => { onClose(); onSignOut(); }}
                      style={{ width: "100%", padding: "0.7rem", border: "1.5px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: 12, fontSize: "0.83rem", background: "transparent", cursor: "pointer", fontWeight: 500, fontFamily: "var(--font-sans)", transition: "all 0.2s ease" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.07)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >Sign out of Academic Session</button>
                  </div>
                </div>
              )}

              {tab === "privacy" && (
                <div>
                  <p style={{ margin: "0 0 0.15rem", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, color: "var(--text-secondary)", opacity: 0.65 }}>Data & Storage</p>
                  <Row label="Save Search History" note="Store inquiry history for quick access and suggestions.">
                    <Toggle on={history} onChange={() => setHistory(!history)} />
                  </Row>
                  <Row label="Usage Analytics" note="Share anonymised data to improve the research platform.">
                    <Toggle on={analytics} onChange={() => setAnalytics(!analytics)} />
                  </Row>
                  <div style={{ paddingTop: "1.25rem", marginTop: "0.5rem" }}>
                    <button style={{ width: "100%", padding: "0.65rem", border: "1.5px solid var(--border-strong)", borderRadius: 12, fontSize: "0.82rem", background: "transparent", cursor: "pointer", fontWeight: 500, fontFamily: "var(--font-sans)", color: "var(--text-secondary)", transition: "all 0.2s ease" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-light)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                    >Clear Search History</button>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* FOOTER */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.65rem", padding: "1rem 1.75rem", borderTop: "1px solid var(--border-light)", flexShrink: 0 }}>
            <button
              onClick={onClose}
              style={{ padding: "0.55rem 1.1rem", border: "1.5px solid var(--border-strong)", borderRadius: 9999, background: "transparent", cursor: "pointer", fontSize: "0.83rem", fontFamily: "var(--font-sans)", color: "var(--text-secondary)", fontWeight: 500, transition: "all 0.2s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-light)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >Cancel</button>
            <button
              onClick={onClose}
              style={{ padding: "0.55rem 1.25rem", border: "none", borderRadius: 9999, background: "var(--accent)", color: "var(--bg-primary)", cursor: "pointer", fontSize: "0.83rem", fontFamily: "var(--font-sans)", fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.12)", transition: "all 0.2s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
            >Save Changes</button>
          </div>
        </div>
      </div>
    </>
  );
}

