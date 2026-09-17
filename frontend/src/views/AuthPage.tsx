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
    } catch (err: any) {
      // If login fails, try to register the demo account
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
      }}
    >
      <header className="glass-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 2rem", zIndex: 10 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1.25rem",
            letterSpacing: "-0.02em",
          }}
        >
          OnlyBooks
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button onClick={onOpenGuide} className="btn-ghost" style={{ fontSize: "0.85rem" }}>
            Reader's Guide
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <Reveal delay={0}>
        <div className="glass-panel" style={{ width: "100%", maxWidth: "420px", padding: "2.5rem 2rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.75rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
                letterSpacing: "-0.02em"
              }}
            >
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
              {isLogin ? "Sign in to access the archive" : "Register to start your research"}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {!isLogin && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-secondary)" }}>Full Name</label>
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
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-secondary)" }}>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-minimal"
                placeholder="jane@university.edu"
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-secondary)" }}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-minimal"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#EF4444", padding: "0.75rem", borderRadius: "8px", fontSize: "0.85rem", textAlign: "center" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ marginTop: "0.5rem", padding: "0.75rem" }}
            >
              {loading ? "Authenticating..." : (isLogin ? "Sign In" : "Register")}
            </button>

            {isLogin && (
              <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border-light)", paddingTop: "1.5rem" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textAlign: "center", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Quick Access
                </p>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => demoLogin("student@university.edu", "demo123", "Demo Student")}
                    disabled={loading}
                    className="btn-ghost"
                    style={{ flex: 1, border: "1px solid var(--border-light)", fontSize: "0.8rem" }}
                  >
                    Demo Student
                  </button>
                  <button
                    type="button"
                    onClick={() => demoLogin("faculty@university.edu", "demo123", "Demo Faculty")}
                    disabled={loading}
                    className="btn-ghost"
                    style={{ flex: 1, border: "1px solid var(--border-light)", fontSize: "0.8rem" }}
                  >
                    Demo Faculty
                  </button>
                </div>
              </div>
            )}
          </form>

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                fontSize: "0.85rem",
                cursor: "pointer",
                textDecoration: "underline"
              }}
            >
              {isLogin ? "Need an account? Register here." : "Already have an account? Sign in."}
            </button>
          </div>
        </div>
        </Reveal>
      </main>
    </div>
  );
}
