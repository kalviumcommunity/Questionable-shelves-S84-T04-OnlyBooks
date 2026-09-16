import { useState, KeyboardEvent, FormEvent } from "react";
import type { User } from "../App";
import { authApi } from "../services/api";

interface Props {
  onAuth: (user: User) => void;
  onOpenGuide?: () => void;
}

type Mode = "login" | "signup";

const FIELD: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  borderBottom: "1px solid #D1D5DB",
  outline: "none",
  fontSize: "0.875rem",
  fontFamily: "var(--font-sans)",
  color: "#1C1C1C",
  padding: "0.375rem 0 0.5rem",
  transition: "border-color 0.15s",
};

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: "1.75rem" }} className="auth-input-container">
      <label
        style={{
          display: "block",
          fontSize: "0.6rem",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: focused ? "#1C1C1C" : "#9CA3AF",
          marginBottom: "0.375rem",
          transition: "color 0.15s",
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...FIELD,
          borderBottomColor: focused ? "#1C1C1C" : "#D1D5DB",
        }}
      />
    </div>
  );
}

export default function AuthPage({ onAuth, onOpenGuide }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const res = await authApi.register({
          name: name.trim(),
          email: email.trim(),
          password,
          affiliation: affiliation.trim() || undefined,
        });
        onAuth(res.user);
      } else {
        const res = await authApi.login({
          email: email.trim(),
          password,
        });
        onAuth(res.user);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSSO(provider: "google_scholar" | "orcid" | "institutional_sso") {
    setError("");
    setLoading(true);
    try {
      const providerEmail =
        provider === "google_scholar"
          ? "scholar.fellow@university.edu"
          : provider === "orcid"
          ? "orcid.researcher@academic.org"
          : "guest.researcher@university.edu";

      const providerName =
        provider === "google_scholar"
          ? "Google Scholar Fellow"
          : provider === "orcid"
          ? "ORCID Visiting Scholar"
          : "Institutional Researcher";

      const res = await authApi.sso({
        provider,
        email: providerEmail,
        name: providerName,
        affiliation: "University Research Faculty",
      });
      onAuth(res.user);
    } catch (err: any) {
      setError(err.message || "SSO verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100%",
        background: "#FAFAFA",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Masthead */}
      <header
        style={{
          borderBottom: "1px solid #E5E7EB",
          padding: "1rem 2.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={onOpenGuide}
          title="Reader's Guide"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            fontFamily: "var(--font-serif)",
            fontWeight: 600,
            fontSize: "1.05rem",
            color: "#0F172A",
            letterSpacing: "-0.01em",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          OnlyBooks · University Library Archive
        </button>
        <p style={{ fontSize: "0.7rem", color: "#9CA3AF" }}>
          Institutional Access · 148,000+ Library Holdings Indexed
        </p>
      </header>

      {/* Body — two-column split */}
      <div style={{ flex: 1, display: "flex" }}>

        {/* Left — editorial statement */}
        <div
          style={{
            width: "45%",
            borderRight: "1px solid #E5E7EB",
            padding: "5rem 4rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "0.58rem",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "#9CA3AF",
                marginBottom: "2rem",
              }}
            >
              University Library · Citation Intelligence
            </p>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "2.75rem",
                lineHeight: 1.2,
                fontWeight: 400,
                color: "#1C1C1C",
                marginBottom: "1.75rem",
              }}
            >
              Every inquiry deserves concise, citation-backed clarity.
            </h1>
            <p
              style={{
                fontSize: "0.85rem",
                lineHeight: 1.8,
                color: "#6B7280",
                maxWidth: 420,
              }}
            >
              OnlyBooks transforms university research papers, doctoral theses, and course materials
              into concise, citation-backed explanations — eliminating hours lost scrolling through
              dozens of unrelated documents for one answer.
            </p>
          </div>

          {/* Pull-quote / testimonial */}
          <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: "2rem" }}>
            <blockquote
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: "1rem",
                lineHeight: 1.6,
                color: "#1C1C1C",
                margin: "0 0 0.875rem",
              }}
            >
              "The closest thing to having a research librarian who has read everything."
            </blockquote>
            <p style={{ fontSize: "0.65rem", color: "#9CA3AF", letterSpacing: "0.06em" }}>
              — Prof. M. Osei, Dept. of History, Yale University
            </p>
          </div>
        </div>

        {/* Right — auth form */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4rem 3rem",
          }}
        >
          <div style={{ width: "100%", maxWidth: 400 }}>
            {/* Mode toggle */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid #E5E7EB",
                marginBottom: "2.5rem",
              }}
            >
              {(["login", "signup"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(""); }}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom: mode === m ? "2px solid #1C1C1C" : "2px solid transparent",
                    padding: "0.5rem 0",
                    marginRight: "2rem",
                    marginBottom: "-1px",
                    fontSize: "0.75rem",
                    fontWeight: mode === m ? 600 : 400,
                    color: mode === m ? "#1C1C1C" : "#9CA3AF",
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                    transition: "color 0.12s",
                    textTransform: "uppercase",
                  }}
                >
                  {m === "login" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              {mode === "signup" && (
                <Field
                  label="Full Name"
                  value={name}
                  onChange={setName}
                  placeholder="Katherine Sharma"
                  autoComplete="name"
                />
              )}
              {mode === "signup" && (
                <Field
                  label="Academic Affiliation"
                  value={affiliation}
                  onChange={setAffiliation}
                  placeholder="University or institution"
                  autoComplete="organization"
                />
              )}
              <Field
                label="Email Address"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@university.edu"
                autoComplete="email"
              />
              <Field
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder={mode === "signup" ? "Minimum 6 characters" : "••••••••"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />

              {error && (
                <p
                  style={{
                    fontSize: "0.72rem",
                    color: "#B91C1C",
                    marginBottom: "1.25rem",
                    marginTop: "-0.5rem",
                  }}
                >
                  {error}
                </p>
              )}

              {mode === "login" && (
                <div
                  style={{
                    marginBottom: "1.25rem",
                    padding: "0.625rem 0.75rem",
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.58rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: "#64748B",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Quick-Fill Demo Accounts
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail("katherine@university.edu");
                        setPassword("scholar2026");
                        setError("");
                      }}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #CBD5E1",
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.68rem",
                        color: "#1E293B",
                        cursor: "pointer",
                        transition: "all 0.1s",
                      }}
                    >
                      Katherine (Student)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail("vance@library.university.edu");
                        setPassword("archive2026");
                        setError("");
                      }}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #CBD5E1",
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.68rem",
                        color: "#1E293B",
                        cursor: "pointer",
                        transition: "all 0.1s",
                      }}
                    >
                      Dr. Vance (Librarian)
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="academic-btn-primary"
                style={{
                  width: "100%",
                  padding: "0.75rem 1.5rem",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  marginBottom: "1.5rem",
                }}
              >
                {loading
                  ? "Authenticating Credentials…"
                  : mode === "login"
                  ? "Sign In to the Archive"
                  : "Create Your Archive"}
              </button>

              <p style={{ fontSize: "0.7rem", textAlign: "center", color: "#9CA3AF" }}>
                {mode === "login" ? "New to the Archive? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: "0.7rem",
                    color: "#1C1C1C",
                    fontWeight: 500,
                    cursor: "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                  }}
                >
                  {mode === "login" ? "Create an account" : "Sign in instead"}
                </button>
              </p>
            </form>

            {/* Divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                margin: "2rem 0",
              }}
            >
              <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
              <span style={{ fontSize: "0.62rem", color: "#9CA3AF", letterSpacing: "0.1em" }}>OR CONTINUE WITH</span>
              <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
            </div>

            {/* Institutional SSO buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {[
                { label: "Google Scholar / Google", icon: "G", provider: "google_scholar" as const },
                { label: "ORCID iD", icon: "○", provider: "orcid" as const },
                { label: "Institutional SSO", icon: "⊡", provider: "institutional_sso" as const },
              ].map(({ label, icon, provider }) => (
                <button
                  key={label}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSSO(provider)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    background: "transparent",
                    border: "1px solid #E5E7EB",
                    padding: "0.625rem 1rem",
                    fontSize: "0.75rem",
                    color: "#1C1C1C",
                    cursor: loading ? "wait" : "pointer",
                    transition: "border-color 0.12s",
                    textAlign: "left",
                    width: "100%",
                    opacity: loading ? 0.7 : 1,
                  }}
                  onMouseOver={(e) => {
                    if (!loading) e.currentTarget.style.borderColor = "#9CA3AF";
                  }}
                  onMouseOut={(e) => {
                    if (!loading) e.currentTarget.style.borderColor = "#E5E7EB";
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      border: "1px solid #E5E7EB",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.7rem",
                      flexShrink: 0,
                      color: "#6B7280",
                    }}
                  >
                    {icon}
                  </span>
                  {label}
                </button>
              ))}
            </div>

            <p
              style={{
                fontSize: "0.62rem",
                color: "#9CA3AF",
                textAlign: "center",
                marginTop: "2rem",
                lineHeight: 1.6,
              }}
            >
              By continuing you agree to the{" "}
              <span style={{ textDecoration: "underline", textUnderlineOffset: "2px", cursor: "pointer" }}>
                Terms of Access
              </span>{" "}
              and{" "}
              <span style={{ textDecoration: "underline", textUnderlineOffset: "2px", cursor: "pointer" }}>
                Privacy Notice
              </span>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Footer rule */}
      <footer
        style={{
          borderTop: "1px solid #E5E7EB",
          padding: "0.875rem 2.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <p style={{ fontSize: "0.62rem", color: "#9CA3AF" }}>
          © 2026 OnlyBooks University Library Archive · All rights reserved
        </p>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          {["About", "Accessibility", "API Access", "Contact"].map((l) => (
            <span
              key={l}
              style={{
                fontSize: "0.62rem",
                color: "#9CA3AF",
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              {l}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}
