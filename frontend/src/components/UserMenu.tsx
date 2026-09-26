import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { User } from "../App";
import SettingsModal from "./SettingsModal";
import AvatarModal from "./AvatarModal";
import { getUserAvatar } from "../utils/userPreferences";

interface Props {
  user: User;
  onSignOut: () => void;
}

// Renders any child into document.body, bypassing all stacking contexts
function Portal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}

export default function UserMenu({ user, onSignOut }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(() => getUserAvatar(user.email));
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAvatar(getUserAvatar(user.email));
    const handleAvatarChange = (e: any) => {
      if (e.detail?.email === user.email) {
        setAvatar(e.detail.avatar);
      }
    };
    window.addEventListener("onlybooks-avatar-changed", handleAvatarChange);
    return () => window.removeEventListener("onlybooks-avatar-changed", handleAvatarChange);
  }, [user.email]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Prevent body scroll when a modal is open
  useEffect(() => {
    if (isProfileOpen || isSettingsOpen || isAvatarModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isProfileOpen, isSettingsOpen, isAvatarModalOpen]);

  return (
    <>
      {/* Avatar + Dropdown — normal in flow */}
      <div style={{ position: "relative", zIndex: 100 }} ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          title={user.name}
          style={{
            width: 36,
            height: 36,
            background: "var(--accent)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "var(--bg-primary)",
            border: isOpen ? "2.5px solid var(--text-primary)" : "2.5px solid transparent",
            cursor: "pointer",
            padding: 0,
            transition: "all 0.2s ease",
            boxShadow: isOpen ? "0 4px 12px rgba(0,0,0,0.2)" : "0 2px 6px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          {avatar ? (
            <img src={avatar} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            user.initials
          )}
        </button>

        {isOpen && (
          <div
            className="glass-panel"
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: "calc(100% + 10px)",
              right: 0,
              width: 236,
              padding: "0.5rem",
              display: "flex",
              flexDirection: "column",
              zIndex: 300,
              animation: "menuFadeIn 0.18s cubic-bezier(0.16,1,0.3,1) forwards",
              transformOrigin: "top right",
              boxShadow: "0 24px 48px rgba(0,0,0,0.22), inset 0 1px 1px rgba(255,255,255,0.5)",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-strong)",
              borderRadius: 16,
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
            }}
          >
            <style>{`
              @keyframes menuFadeIn {
                from { opacity: 0; transform: scale(0.93) translateY(-6px); }
                to   { opacity: 1; transform: scale(1)    translateY(0); }
              }
              .mi {
                display: flex; align-items: center; gap: 0.65rem;
                width: 100%; text-align: left;
                padding: 0.58rem 0.75rem;
                font-size: 0.84rem; font-weight: 500;
                color: var(--text-secondary);
                background: transparent; border: none; border-radius: 8px;
                cursor: pointer; transition: all 0.16s ease;
                font-family: var(--font-sans);
              }
              .mi:hover { background: rgba(0,0,0,0.05); color: var(--text-primary); }
              body.dark .mi:hover { background: rgba(255,255,255,0.08); }
              .mi svg { width: 15px; height: 15px; opacity: 0.65; flex-shrink: 0; }
              .mi:hover svg { opacity: 1; }
              .mi.danger { color: #ef4444; }
              .mi.danger:hover { background: rgba(239,68,68,0.1); color: #dc2626; }
              body.dark .mi.danger:hover { background: rgba(239,68,68,0.15); color: #f87171; }
            `}</style>

            <div style={{ padding: "0.7rem 0.8rem 0.85rem", borderBottom: "1px solid var(--border-light)", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--accent)", color: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 600, flexShrink: 0, overflow: "hidden" }}>
                {avatar ? (
                  <img src={avatar} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  user.initials
                )}
              </div>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</p>
                <p style={{ margin: "0.1rem 0 0", fontSize: "0.73rem", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email || "academic@university.edu"}</p>
              </div>
            </div>

            <button className="mi" onClick={() => { setIsOpen(false); setIsProfileOpen(true); }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
              View Profile
            </button>

            <button className="mi" onClick={() => { setIsOpen(false); setIsAvatarModalOpen(true); }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
              Change Photo
            </button>

            <button className="mi" onClick={() => { setIsOpen(false); setIsSettingsOpen(true); }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
              Settings
            </button>

            <div style={{ height: 1, background: "var(--border-light)", margin: "0.2rem 0" }} />

            <button className="mi danger" onClick={() => { setIsOpen(false); onSignOut(); }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" /></svg>
              Log out
            </button>
          </div>
        )}
      </div>

      {/* === PORTALS — rendered directly into document.body === */}

      {isProfileOpen && (
        <Portal>
          <div
            onClick={() => setIsProfileOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.16)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-strong)",
                borderRadius: 24,
                width: "100%",
                maxWidth: 440,
                padding: "2rem",
                position: "relative",
                boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
                animation: "menuFadeIn 0.22s cubic-bezier(0.16,1,0.3,1) forwards",
              }}
            >
              <button
                onClick={() => setIsProfileOpen(false)}
                style={{
                  position: "absolute",
                  top: "1.2rem",
                  right: "1.2rem",
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: "1px solid var(--border-strong)",
                  background: "var(--accent-light)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                ✕
              </button>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "1.5rem" }}>
                <div style={{ position: "relative", marginBottom: "1rem" }}>
                  <div
                    style={{
                      width: 78,
                      height: 78,
                      borderRadius: "50%",
                      background: "var(--accent)",
                      color: "var(--bg-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.8rem",
                      fontWeight: 700,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                      overflow: "hidden",
                      border: "2.5px solid var(--accent)",
                    }}
                  >
                    {avatar ? (
                      <img src={avatar} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      user.initials
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      setIsAvatarModalOpen(true);
                    }}
                    title="Change Avatar"
                    style={{
                      position: "absolute",
                      bottom: -2,
                      right: -2,
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--bg-secondary)",
                      border: "1.5px solid var(--border-strong)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.82rem",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    }}
                  >
                    📷
                  </button>
                </div>

                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>{user.name}</h2>
                <p style={{ margin: "0.3rem 0 0.75rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{user.email}</p>
                <span style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, padding: "0.25rem 0.8rem", borderRadius: 9999, background: "var(--accent-light)", color: "var(--text-primary)", border: "1px solid var(--border-light)" }}>
                  {user.role || "Scholar"} &middot; {user.provider || "Institutional SSO"}
                </span>
              </div>

              <div style={{ background: "var(--accent-light)", padding: "1.1rem 1.25rem", borderRadius: 16, border: "1px solid var(--border-light)", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {[["Department / Affiliation", user.affiliation || "Dept. of Cognitive Science"], ["Catalog Clearance", "Full Access"], ["Session Security", "Active (JWT Bearer)"]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{k}</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)", textAlign: "right" }}>{v}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => { setIsProfileOpen(false); setIsSettingsOpen(true); }}
                style={{ width: "100%", padding: "0.65rem", border: "1.5px solid var(--border-strong)", borderRadius: 12, fontSize: "0.84rem", background: "transparent", cursor: "pointer", fontWeight: 500, fontFamily: "var(--font-sans)", color: "var(--text-secondary)", marginBottom: "0.65rem", transition: "all 0.18s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-light)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                Open Settings
              </button>

              <button
                onClick={() => { setIsProfileOpen(false); onSignOut(); }}
                style={{ width: "100%", padding: "0.7rem", border: "1.5px solid rgba(239,68,68,0.35)", borderRadius: 12, fontSize: "0.84rem", background: "transparent", cursor: "pointer", fontWeight: 500, fontFamily: "var(--font-sans)", color: "#ef4444", transition: "all 0.18s ease" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >Log out of Academic Session</button>
            </div>
          </div>
        </Portal>
      )}

      {isSettingsOpen && (
        <Portal>
          <SettingsModal
            user={user}
            onClose={() => setIsSettingsOpen(false)}
            onSignOut={onSignOut}
          />
        </Portal>
      )}

      <AvatarModal
        user={user}
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        onAvatarUpdated={(newAvatar) => setAvatar(newAvatar)}
      />
    </>
  );
}
