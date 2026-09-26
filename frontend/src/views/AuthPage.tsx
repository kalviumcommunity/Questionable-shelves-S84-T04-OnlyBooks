import { useState, FormEvent } from "react";
import { User, ThemeToggle } from "../App";
import { authApi } from "../services/api";
import Reveal from "../components/Reveal";

interface Props {
  onAuth: (user: User) => void;
  onOpenGuide: () => void;
}

export default function AuthPage({ onAuth, onOpenGuide }: Props) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isLogin) {
        const { user } = await authApi.login({ email, password });
        onAuth(user);
      } else {
        const { user } = await authApi.register({ email, password, name });
        onAuth(user);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function demoLogin(demoEmail: string, demoPass: string, demoName: string) {
    setError(null);
    setLoading(true);
    try {
      const { user } = await authApi.login({ email: demoEmail, password: demoPass });
      onAuth(user);
    } catch {
      try {
        const { user } = await authApi.register({ email: demoEmail, password: demoPass, name: demoName });
        onAuth(user);
      } catch (regErr: any) {
        setError("Failed to create demo account: " + (regErr.message || "Unknown error"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "100vh" }}>
      {/* Nav */}
      <header
        className="glass-nav"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 2rem", position: "relative", zIndex: 50 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="var(--bg-primary)">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.025em", color: "var(--text-primary)" }}>
            OnlyBooks
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button onClick={onOpenGuide} className="btn-ghost" style={{ fontSize: "0.82rem" }}>
            Reader's Guide
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <Reveal delay={0}>
          <div style={{ width: "100%", maxWidth: "420px" }}>

            {/* Branding mark above card */}
            <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
              <div
                style={{
                  width: "52px", height: "52px",
                  borderRadius: "14px",
                  background: "var(--accent)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "1rem",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="var(--bg-primary)">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.65rem", fontWeight: 700, margin: "0 0 0.35rem", letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
                {isLogin ? "Welcome back" : "Join the archive"}
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                {isLogin ? "Sign in to access your research archive" : "Create an account to start your research"}
              </p>
            </div>

            {/* Card */}
            <div className="glass-panel" style={{ padding: "2rem 2rem 1.75rem" }}>

              {/* Tab switcher */}
              <div
                style={{
                  display: "flex",
                  background: "var(--accent-light)",
                  borderRadius: "10px",
                  padding: "3px",
                  marginBottom: "1.75rem",
                  border: "1px solid var(--border-light)",
                }}
              >
                {["Sign In", "Register"].map((label, i) => {
                  const active = isLogin === (i === 0);
                  return (
                    <button
                      key={label}
                      onClick={() => { setIsLogin(i === 0); setError(null); }}
                      style={{
                        flex: 1,
                        padding: "0.5rem",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.83rem",
                        fontWeight: active ? 600 : 500,
                        fontFamily: "var(--font-sans)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        background: active ? "var(--bg-secondary)" : "transparent",
                        color: active ? "var(--text-primary)" : "var(--text-secondary)",
                        boxShadow: active ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                {!isLogin && (
                  <div>
                    <label className="input-label">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-minimal"
                      placeholder="Jane Doe"
                    />
                  </div>
                )}
                <div>
                  <label className="input-label">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-minimal"
                    placeholder="jane@university.edu"
                  />
                </div>
                <div>
                  <label className="input-label">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-minimal"
                    placeholder="••••••••"
                  />
                </div>

                {error && <div className="alert-error">{error}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{ marginTop: "0.25rem", padding: "0.8rem", fontSize: "0.9rem", width: "100%" }}
                >
                  {loading
                    ? "Authenticating…"
                    : isLogin ? "Sign In" : "Create Account"}
                </button>
              </form>

              {/* Demo access */}
              {isLogin && (
                <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-light)" }}>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textAlign: "center", marginBottom: "0.85rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                    Quick Demo Access
                  </p>
                  <div style={{ display: "flex", gap: "0.65rem" }}>
                    <button
                      type="button"
                      onClick={() => demoLogin("student@university.edu", "demo123", "Demo Student")}
                      disabled={loading}
                      style={{
                        flex: 1, padding: "0.6rem 0.5rem",
                        border: "1.5px solid var(--border-strong)",
                        borderRadius: "10px", background: "transparent",
                        cursor: "pointer", fontSize: "0.78rem", fontFamily: "var(--font-sans)",
                        fontWeight: 500, color: "var(--text-secondary)", transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-light)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                    >
                      👤 Student
                    </button>
                    <button
                      type="button"
                      onClick={() => demoLogin("faculty@university.edu", "demo123", "Demo Faculty")}
                      disabled={loading}
                      style={{
                        flex: 1, padding: "0.6rem 0.5rem",
                        border: "1.5px solid var(--border-strong)",
                        borderRadius: "10px", background: "transparent",
                        cursor: "pointer", fontSize: "0.78rem", fontFamily: "var(--font-sans)",
                        fontWeight: 500, color: "var(--text-secondary)", transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-light)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                    >
                      🎓 Faculty
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer note */}
            <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.775rem", color: "var(--text-secondary)" }}>
              Academic access only &middot; Institutional credentials apply
            </p>
          </div>
        </Reveal>
      </main>
    </div>
  );
}
