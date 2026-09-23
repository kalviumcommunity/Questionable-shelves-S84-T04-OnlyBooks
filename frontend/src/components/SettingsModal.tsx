import { useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { User } from "../App";

interface Props {
  user: User;
  onClose: () => void;
  onSignOut: () => void;
}

type SettingsTab = "appearance" | "notifications" | "account" | "privacy";

// ─── Sub-components ──────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: "44px",
        height: "26px",
        borderRadius: "9999px",
        border: "none",
        background: checked ? "var(--accent)" : "rgba(0,0,0,0.15)",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.3s cubic-bezier(0.4,0,0.2,1)",
        flexShrink: 0,
        padding: 0,
        outline: "none",
        boxShadow: checked ? "0 0 0 3px var(--accent-light)" : "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "4px",
          left: checked ? "22px" : "4px",
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "0 1px 6px rgba(0,0,0,0.25)",
        }}
      />
    </button>
  );
}

function SettingRow({
  label,
  description,
  icon,
  children,
}: {
  label: string;
  description?: string;
  icon?: ReactElement;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.9rem",
        padding: "0.85rem 0",
        borderBottom: "1px solid var(--border-light)",
      }}
    >
      {icon && (
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "var(--accent-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "var(--text-secondary)",
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "0.855rem", fontWeight: 500, color: "var(--text-primary)" }}>{label}</p>
        {description && (
          <p style={{ margin: "0.18rem 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
            {description}
          </p>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        margin: "0 0 0.1rem 0",
        fontSize: "0.68rem",
        textTransform: "uppercase",
        letterSpacing: "0.11em",
        fontWeight: 700,
        color: "var(--text-secondary)",
        opacity: 0.65,
      }}
    >
      {children}
    </p>
  );
}

// ─── Icons ────────────────────────────────────────────────────────

const Icons = {
  appearance: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" />
    </svg>
  ),
  notifications: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  ),
  account: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  ),
  privacy: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  ),
  compact: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  ),
  motion: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  font: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  ),
  digest: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  ),
  acq: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  alert: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
    </svg>
  ),
  history: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  analytics: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  ),
};

// ─── Main Component ───────────────────────────────────────────────

export default function SettingsModal({ user, onClose, onSignOut }: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  const [compactMode, setCompactMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fontScale, setFontScale] = useState<"sm" | "md" | "lg">("md");
  const [emailDigest, setEmailDigest] = useState(true);
  const [newAcquisitions, setNewAcquisitions] = useState(true);
  const [researchAlerts, setResearchAlerts] = useState(false);
  const [searchHistory, setSearchHistory] = useState(true);
  const [analyticsOptIn, setAnalyticsOptIn] = useState(true);

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "appearance", label: "Appearance" },
    { id: "notifications", label: "Notifications" },
    { id: "account", label: "Account" },
    { id: "privacy", label: "Privacy" },
  ];

  return (
    <>
      <style>{`
        @keyframes settingsFadeIn {
          from { opacity: 0; transform: scale(0.96) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        .s-tab {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          width: 100%;
          text-align: left;
          padding: 0.6rem 0.8rem;
          font-size: 0.825rem;
          font-weight: 500;
          color: var(--text-secondary);
          background: transparent;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.18s ease;
          letter-spacing: 0.01em;
        }
        .s-tab:hover { background: var(--accent-light); color: var(--text-primary); }
        .s-tab.active {
          background: var(--accent);
          color: var(--bg-primary);
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        }
        .s-tab svg { width: 15px; height: 15px; flex-shrink: 0; opacity: 0.8; }
        .s-tab.active svg { opacity: 1; }
        .fs-btn {
          width: 40px; height: 30px;
          border-radius: 8px;
          border: 1.5px solid var(--border-strong);
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.78rem;
          font-family: var(--font-sans);
          font-weight: 600;
          transition: all 0.18s ease;
          letter-spacing: 0.03em;
        }
        .fs-btn:hover { border-color: var(--text-secondary); color: var(--text-primary); }
        .fs-btn.active {
          background: var(--accent);
          color: var(--bg-primary);
          border-color: var(--accent);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .s-content::-webkit-scrollbar { width: 4px; }
        .s-content::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
        .danger-btn {
          width: 100%;
          padding: 0.7rem;
          border: 1.5px solid rgba(239,68,68,0.3);
          color: #ef4444;
          border-radius: 12px;
          font-size: 0.83rem;
          font-family: var(--font-sans);
          background: transparent;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          letter-spacing: 0.01em;
        }
        .danger-btn:hover { background: rgba(239,68,68,0.07); border-color: rgba(239,68,68,0.55); }
        .ghost-action-btn {
          width: 100%;
          padding: 0.65rem;
          border: 1.5px solid var(--border-strong);
          border-radius: 12px;
          font-size: 0.82rem;
          font-family: var(--font-sans);
          background: transparent;
          cursor: pointer;
          font-weight: 500;
          color: var(--text-secondary);
          transition: all 0.2s ease;
        }
        .ghost-action-btn:hover { background: var(--accent-light); color: var(--text-primary); border-color: var(--text-secondary); }
        .badge-active {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.72rem;
          font-weight: 600;
          color: #16a34a;
          background: rgba(22,163,74,0.1);
          border: 1px solid rgba(22,163,74,0.25);
          padding: 0.22rem 0.6rem;
          border-radius: 6px;
          letter-spacing: 0.04em;
        }
        .badge-active::before {
          content: '';
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #16a34a;
          flex-shrink: 0;
        }
      `}</style>

      {/* Backdrop */}
      <div
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.38)",
          backdropFilter: "blur(16px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "1rem",
        }}
        onClick={onClose}
      >
        {/* Modal Shell */}
        <div
          className="glass-panel"
          style={{
            width: "100%", maxWidth: "700px", maxHeight: "88vh",
            display: "flex", flexDirection: "column", overflow: "hidden",
            animation: "settingsFadeIn 0.28s cubic-bezier(0.16,1,0.3,1) forwards",
            boxShadow: "0 40px 100px rgba(0,0,0,0.22), inset 0 2px 4px rgba(255,255,255,0.6)",
          }}
          onClick={(e) => e.stopPropagation()}
        >

          {/* ── Header ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.5rem 1.75rem 1.25rem", borderBottom: "1px solid var(--border-light)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="var(--bg-primary)">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-primary)", letterSpacing: "-0.01em" }}>Settings</h2>
                <p style={{ margin: "0.1rem 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Preferences & account management</p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: "30px", height: "30px", borderRadius: "50%", border: "1px solid var(--border-strong)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", fontSize: "0.9rem", transition: "all 0.2s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-light)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >✕</button>
          </div>

          {/* ── Body ── */}
          <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

            {/* Sidebar */}
            <div style={{ width: "170px", flexShrink: 0, padding: "1rem 0.75rem 1rem", borderRight: "1px solid var(--border-light)", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
              {tabs.map(({ id, label }) => (
                <button key={id} className={`s-tab${activeTab === id ? " active" : ""}`} onClick={() => setActiveTab(id)}>
                  {Icons[id]}
                  {label}
                </button>
              ))}
              <div style={{ marginTop: "auto", paddingTop: "0.75rem", borderTop: "1px solid var(--border-light)" }}>
                <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--text-secondary)", opacity: 0.5, fontWeight: 500 }}>OnlyBooks v1.0.0</p>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="s-content" style={{ flex: 1, padding: "1.4rem 1.75rem 1rem", overflowY: "auto" }}>

              {/* ── APPEARANCE ── */}
              {activeTab === "appearance" && (
                <div>
                  <SectionLabel>Display</SectionLabel>
                  <SettingRow label="Compact Mode" description="Reduce spacing across the interface for a denser view." icon={Icons.compact}>
                    <Toggle checked={compactMode} onChange={setCompactMode} />
                  </SettingRow>
                  <SettingRow label="Reduce Motion" description="Minimize transitions and animations throughout the app." icon={Icons.motion}>
                    <Toggle checked={reducedMotion} onChange={setReducedMotion} />
                  </SettingRow>
                  <SettingRow label="Font Size" description="Adjust the base reading size across all views." icon={Icons.font}>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      {(["sm", "md", "lg"] as const).map((s) => (
                        <button key={s} className={`fs-btn${fontScale === s ? " active" : ""}`} onClick={() => setFontScale(s)}>
                          {s.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </SettingRow>
                </div>
              )}

              {/* ── NOTIFICATIONS ── */}
              {activeTab === "notifications" && (
                <div>
                  <SectionLabel>Email &amp; Alerts</SectionLabel>
                  <SettingRow label="Weekly Digest" description="A curated summary of new acquisitions and research highlights." icon={Icons.digest}>
                    <Toggle checked={emailDigest} onChange={setEmailDigest} />
                  </SettingRow>
                  <SettingRow label="New Acquisitions" description="Notify when documents are added to your tracked collections." icon={Icons.acq}>
                    <Toggle checked={newAcquisitions} onChange={setNewAcquisitions} />
                  </SettingRow>
                  <SettingRow label="Research Alerts" description="Alerts for papers matching your saved inquiry queries." icon={Icons.alert}>
                    <Toggle checked={researchAlerts} onChange={setResearchAlerts} />
                  </SettingRow>
                </div>
              )}

              {/* ── ACCOUNT ── */}
              {activeTab === "account" && (
                <div>
                  <SectionLabel>Academic Profile</SectionLabel>

                  {/* Profile Card */}
                  <div style={{ display: "flex", alignItems: "center", gap: "1.1rem", padding: "1.1rem 1.25rem", background: "var(--accent-light)", borderRadius: "16px", border: "1px solid var(--border-light)", marginBottom: "1.5rem", marginTop: "0.4rem" }}>
                    <div style={{ width: "54px", height: "54px", borderRadius: "50%", background: "var(--accent)", color: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", fontWeight: 700, flexShrink: 0, boxShadow: "0 4px 14px rgba(0,0,0,0.15)" }}>
                      {user.initials}
                    </div>
                    <div style={{ overflow: "hidden", flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "0.92rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</p>
                      <p style={{ margin: "0.12rem 0 0.3rem 0", fontSize: "0.775rem", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</p>
                      <span style={{ fontSize: "0.67rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>
                        {user.role || "Scholar"} &middot; {user.affiliation || "Cognitive Science"}
                      </span>
                    </div>
                  </div>

                  <SectionLabel>Session Details</SectionLabel>
                  <SettingRow label="Authentication" description={user.provider || "Institutional SSO"}>
                    <span className="badge-active">Active</span>
                  </SettingRow>
                  <SettingRow label="Catalog Access" description="Full collection access granted.">
                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", background: "var(--accent-light)", padding: "0.22rem 0.6rem", borderRadius: "6px", border: "1px solid var(--border-light)" }}>Full Access</span>
                  </SettingRow>

                  <div style={{ paddingTop: "1.5rem", marginTop: "0.5rem" }}>
                    <button className="danger-btn" onClick={() => { onClose(); onSignOut(); }}>
                      Sign out of Academic Session
                    </button>
                  </div>
                </div>
              )}

              {/* ── PRIVACY ── */}
              {activeTab === "privacy" && (
                <div>
                  <SectionLabel>Data &amp; Storage</SectionLabel>
                  <SettingRow label="Save Search History" description="Store your inquiry history for quick access and personalized suggestions." icon={Icons.history}>
                    <Toggle checked={searchHistory} onChange={setSearchHistory} />
                  </SettingRow>
                  <SettingRow label="Usage Analytics" description="Share anonymized usage data to help improve the research platform." icon={Icons.analytics}>
                    <Toggle checked={analyticsOptIn} onChange={setAnalyticsOptIn} />
                  </SettingRow>
                  <div style={{ paddingTop: "1.25rem", marginTop: "0.75rem" }}>
                    <button className="ghost-action-btn">Clear Search History</button>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "1rem 1.75rem", borderTop: "1px solid var(--border-light)", flexShrink: 0, gap: "0.65rem" }}>
            <button onClick={onClose} style={{ padding: "0.55rem 1.1rem", border: "1.5px solid var(--border-strong)", borderRadius: "9999px", background: "transparent", cursor: "pointer", fontSize: "0.83rem", fontFamily: "var(--font-sans)", color: "var(--text-secondary)", fontWeight: 500, transition: "all 0.2s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-light)"; e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >Cancel</button>
            <button onClick={onClose} style={{ padding: "0.55rem 1.25rem", border: "none", borderRadius: "9999px", background: "var(--accent)", color: "var(--bg-primary)", cursor: "pointer", fontSize: "0.83rem", fontFamily: "var(--font-sans)", fontWeight: 600, transition: "all 0.2s ease", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
            >Save Changes</button>
          </div>

        </div>
      </div>
    </>
  );
}


