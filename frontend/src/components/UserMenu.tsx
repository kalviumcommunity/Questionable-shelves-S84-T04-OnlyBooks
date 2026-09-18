import { useState, useRef, useEffect } from "react";
import { User } from "../App";

interface Props {
  user: User;
  onSignOut: () => void;
}

export default function UserMenu({ user, onSignOut }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      {/* Avatar Button */}
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
          border: isOpen ? "2px solid var(--text-primary)" : "2px solid transparent",
          cursor: "pointer",
          padding: 0,
          transition: "all 0.2s ease",
          boxShadow: isOpen ? "0 4px 12px rgba(0,0,0,0.15)" : "0 2px 4px rgba(0,0,0,0.05)"
        }}
      >
        {user.initials}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="glass-panel"
          style={{
            position: "absolute",
            top: "calc(100% + 12px)",
            right: 0,
            width: 220,
            padding: "0.5rem",
            display: "flex",
            flexDirection: "column",
            zIndex: 100,
            animation: "menuFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            transformOrigin: "top right",
            boxShadow: "0 20px 40px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.4)"
          }}
        >
          <style>
            {`
              @keyframes menuFadeIn {
                from { opacity: 0; transform: scale(0.95) translateY(-8px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
              }
              .menu-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                width: 100%;
                text-align: left;
                padding: 0.6rem 0.75rem;
                font-size: 0.85rem;
                font-weight: 500;
                color: var(--text-secondary);
                background: transparent;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
              }
              .menu-item:hover {
                background: rgba(0, 0, 0, 0.04);
                color: var(--text-primary);
              }
              body.dark .menu-item:hover {
                background: rgba(255, 255, 255, 0.06);
              }
              .menu-item svg {
                width: 16px;
                height: 16px;
                opacity: 0.7;
              }
              .menu-item:hover svg {
                opacity: 1;
              }
              .menu-item.logout {
                color: #ef4444;
              }
              .menu-item.logout:hover {
                background: rgba(239, 68, 68, 0.1);
                color: #dc2626;
              }
              body.dark .menu-item.logout:hover {
                background: rgba(239, 68, 68, 0.15);
                color: #f87171;
              }
            `}
          </style>

          {/* User Info Header */}
          <div
            style={{
              padding: "0.75rem 0.75rem 1rem 0.75rem",
              borderBottom: "1px solid var(--border-light)",
              marginBottom: "0.5rem",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.name}
            </p>
            <p style={{ margin: "0.1rem 0 0 0", fontSize: "0.75rem", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.email || "academic@university.edu"}
            </p>
          </div>

          <button
            className="menu-item"
            onClick={() => {
              setIsOpen(false);
              setIsProfileOpen(true);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            Profile
          </button>
          
          <div style={{ height: "1px", background: "var(--border-light)", margin: "0.25rem 0" }} />
          
          <button
            className="menu-item logout"
            onClick={() => {
              setIsOpen(false);
              onSignOut();
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
            </svg>
            Log out
          </button>
        </div>
      )}

      {/* Academic Profile Modal */}
      {isProfileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => setIsProfileOpen(false)}
        >
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "440px",
              padding: "2rem",
              position: "relative",
              animation: "menuFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              boxShadow: "0 24px 64px rgba(0,0,0,0.25), inset 0 2px 4px rgba(255,255,255,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsProfileOpen(false)}
              className="btn-ghost"
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                width: "32px",
                height: "32px",
                padding: 0,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.1rem",
              }}
            >
              ✕
            </button>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: "1.75rem" }}>
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  color: "var(--bg-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  marginBottom: "1rem",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                }}
              >
                {user.initials}
              </div>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--text-primary)",
                }}
              >
                {user.name}
              </h2>
              <p style={{ margin: "0.25rem 0 0.75rem 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {user.email}
              </p>
              <span
                style={{
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                  padding: "0.25rem 0.75rem",
                  borderRadius: "9999px",
                  background: "var(--accent-light)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-light)",
                }}
              >
                {user.role || "Scholar"} · {user.provider || "Institutional SSO"}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                background: "var(--accent-light)",
                padding: "1.25rem",
                borderRadius: "16px",
                border: "1px solid var(--border-light)",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Department / Affiliation</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  {user.affiliation || "Dept. of Cognitive Science"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Catalog Clearance</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>Full Access</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Session Security</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>Active (JWT Bearer)</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsProfileOpen(false);
                onSignOut();
              }}
              className="btn-ghost logout"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#ef4444",
                borderRadius: "12px",
                fontSize: "0.85rem",
              }}
            >
              Log out of Academic Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
