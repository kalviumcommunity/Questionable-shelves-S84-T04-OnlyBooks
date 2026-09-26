import { useState, useRef, useEffect, FormEvent } from "react";
import { User, ThemeToggle } from "../App";
import {
  authApi,
  getApiBaseUrl,
  setApiBaseUrl,
  clearApiBaseUrl,
  checkApiHealth,
} from "../services/api";
import Reveal from "../components/Reveal";

interface Props {
  onAuth: (user: User) => void;
  onOpenGuide: () => void;
}

const DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "sharklasers.com",
  "yopmail.com",
  "trashmail.com",
  "dispostable.com",
  "fakeinbox.com",
  "getairmail.com",
  "throwawaymail.com",
  "temp-mail.org",
];

const DISCIPLINES = [
  "Computer Science & Artificial Intelligence",
  "Cognitive Science & Neuroscience",
  "Philosophy & Epistemology",
  "Physics & Quantum Mechanics",
  "History & Archival Studies",
  "Economics & Quantitative Social Science",
  "Biomedical & Life Sciences",
  "Mathematics & Statistics",
  "General / Multidisciplinary Research",
];

const FACULTY_RANKS = [
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Department Chair / Dean",
  "Principal Investigator (PI) / Research Scientist",
  "University Library Archivist",
  "Visiting Academic Fellow",
];

const STUDENT_LEVELS = [
  "Undergraduate Scholar (B.S. / B.A.)",
  "Master's Candidate (M.S. / M.A.)",
  "Ph.D. Candidate / Doctoral Scholar",
  "Postdoctoral Fellow",
  "Visiting Student Researcher",
];

const SUGGESTED_INSTITUTIONS = [
  "MIT",
  "Stanford University",
  "Oxford University",
  "Harvard University",
  "Cambridge University",
  "UC Berkeley",
];

function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase()?.trim();
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.some((d) => domain === d || domain.endsWith("." + d));
}

function isAcademicEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase()?.trim();
  if (!domain) return false;
  return (
    domain.endsWith(".edu") ||
    domain.endsWith(".ac.in") ||
    domain.endsWith(".ac.uk") ||
    domain.endsWith(".edu.au") ||
    domain.endsWith(".edu.sg") ||
    domain.endsWith(".res.in") ||
    domain.includes("university") ||
    domain.includes("college")
  );
}

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: "Password required", color: "#94a3b8" };
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd) || pwd.length >= 12) s++;

  if (s <= 1) return { score: 1, label: "Weak", color: "#ef4444" };
  if (s === 2) return { score: 2, label: "Fair", color: "#f59e0b" };
  if (s === 3) return { score: 3, label: "Good", color: "#3b82f6" };
  return { score: 4, label: "Strong & Secure", color: "#16a34a" };
}

export default function AuthPage({ onAuth, onOpenGuide }: Props) {
  const [isLogin, setIsLogin] = useState(true);
  const [stage, setStage] = useState<"form" | "otp">("form");

  // Login & Shared Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Extended Signup Fields
  const [name, setName] = useState("");
  const [role, setRole] = useState<"student" | "faculty">("student");
  const [institution, setInstitution] = useState("MIT");
  const [discipline, setDiscipline] = useState(DISCIPLINES[0]);
  const [facultyRank, setFacultyRank] = useState(FACULTY_RANKS[0]);
  const [studentDegree, setStudentDegree] = useState(STUDENT_LEVELS[0]);
  const [academicId, setAcademicId] = useState("");
  const [labOrDepartment, setLabOrDepartment] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [honorCode, setHonorCode] = useState(true);

  // OTP Verification State
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [activeOtpCode, setActiveOtpCode] = useState<string | null>(null);
  const [isSimulatedOtp, setIsSimulatedOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(30);

  // Status & Error
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Deployed Backend Server Connection State: auto-show if on remote deployment without configured backend
  const [showServerConfig, setShowServerConfig] = useState(() => {
    if (typeof window !== "undefined") {
      const isRemote = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
      const hasConfigured = localStorage.getItem("onlybooks_api_url") || (import.meta as any).env?.VITE_API_URL;
      return Boolean(isRemote && !hasConfigured);
    }
    return false;
  });
  const [customServerUrl, setCustomServerUrl] = useState(() => {
    const curr = getApiBaseUrl();
    return curr === "/api" ? "" : curr.replace(/\/api$/, "");
  });
  const [testingServer, setTestingServer] = useState(false);
  const [serverTestResult, setServerTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Listen for backend 404 or connection events
  useEffect(() => {
    function handleApi404() {
      setShowServerConfig(true);
    }
    window.addEventListener("onlybooks:api_404", handleApi404);
    return () => window.removeEventListener("onlybooks:api_404", handleApi404);
  }, []);

  async function handleConnectServer() {
    setTestingServer(true);
    setServerTestResult(null);
    try {
      const clean = customServerUrl.trim();
      const res = await checkApiHealth(clean || "/api");
      if (res.ok) {
        if (clean) {
          setApiBaseUrl(clean);
        } else {
          clearApiBaseUrl();
        }
        setServerTestResult({ ok: true, message: `Connected (${res.message})` });
        setError(null);
        setSuccessMsg(`Connected successfully to backend: ${clean || "/api"}`);
      } else {
        setServerTestResult({ ok: false, message: res.message });
      }
    } catch (e: any) {
      setServerTestResult({ ok: false, message: e.message || "Failed to reach backend." });
    } finally {
      setTestingServer(false);
    }
  }

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Resend countdown timer
  useEffect(() => {
    if (stage !== "otp" || resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, resendCooldown]);

  // Handle Login
  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user } = await authApi.login({ email, password });
      onAuth(user);
    } catch (err: any) {
      let msg = err.message || "Authentication failed. Please check your credentials.";
      if (msg.includes("Invalid email or password")) {
        msg = "Invalid email or password. If you haven't registered this account yet, please switch to the 'Sign Up' tab above to create your account first.";
      }
      setError(msg);
      if (
        msg.includes("404") ||
        msg.includes("cannot reach") ||
        msg.includes("Cannot connect") ||
        msg.includes("not reached") ||
        msg.includes("received HTML") ||
        msg.includes("Failed to fetch")
      ) {
        setShowServerConfig(true);
      }
    } finally {
      setLoading(false);
    }
  }

  // Handle Step 1: Initiate Sign Up & Send OTP
  async function handleProceedToOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation checks
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (isDisposableEmail(cleanEmail)) {
      setError("Temporary or disposable email domains are blocked to prevent fake accounts. Please use your academic or permanent email.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters in length.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter your password.");
      return;
    }

    if (!honorCode) {
      setError("Please agree to the Academic Honor Code to proceed.");
      return;
    }

    setLoading(true);
    try {
      let code: string | null = null;
      let simulated = false;
      try {
        const res = await authApi.sendOtp(cleanEmail);
        code = res.otp || null;
        simulated = Boolean(res.is_simulated || res.otp);
      } catch (err: any) {
        console.warn("Using simulated OTP dispatch fallback:", err);
        code = `${Math.floor(100000 + Math.random() * 900000)}`;
        simulated = true;
      }

      setActiveOtpCode(code);
      setIsSimulatedOtp(simulated);
      setOtpDigits(["", "", "", "", "", ""]);
      setResendCooldown(45);
      setStage("otp");
      setSuccessMsg(
        simulated
          ? `Verification code generated for ${cleanEmail}`
          : `A 6-digit verification code was emailed to ${cleanEmail}. Please check your inbox and spam folder.`
      );
    } catch (err: any) {
      setError(err.message || "Failed to dispatch verification code.");
    } finally {
      setLoading(false);
    }
  }

  // Handle Step 2: Verify OTP and Register
  async function handleVerifyOtpAndRegister(e?: FormEvent) {
    if (e) e.preventDefault();
    setError(null);

    const enteredCode = otpDigits.join("");
    if (enteredCode.length !== 6) {
      setError("Please enter all 6 digits of the verification code.");
      return;
    }

    setLoading(true);
    try {
      // 1. Verify OTP with backend (with fallback comparison)
      let isVerified = false;
      try {
        const res = await authApi.verifyOtp(email.trim().toLowerCase(), enteredCode);
        isVerified = res.verified;
      } catch (otpErr: any) {
        // If simulated in dev
        if (activeOtpCode && enteredCode === activeOtpCode) {
          isVerified = true;
        } else {
          throw otpErr;
        }
      }

      if (!isVerified) {
        throw new Error("Invalid verification code. Please check and retry.");
      }

      // 2. Perform Account Registration with verified credentials
      const affiliationTitle = role === "faculty"
        ? `${facultyRank}, ${institution} &middot; ${discipline}${labOrDepartment ? ` (${labOrDepartment})` : ""}`
        : `${studentDegree}, ${institution} &middot; ${discipline}`;

      const { user } = await authApi.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        affiliation: affiliationTitle,
        role,
      });

      onAuth(user);
    } catch (err: any) {
      const msg = err.message || "Verification failed. Please ensure the code is correct.";
      setError(msg);
      if (msg.includes("404") || msg.includes("cannot reach") || msg.includes("Cannot connect")) {
        setShowServerConfig(true);
      }
    } finally {
      setLoading(false);
    }
  }

  // Resend OTP handler
  async function handleResendCode() {
    if (resendCooldown > 0) return;
    setError(null);
    setLoading(true);
    try {
      let code: string | null = null;
      let simulated = false;
      try {
        const res = await authApi.sendOtp(email.trim().toLowerCase());
        code = res.otp || null;
        simulated = Boolean(res.is_simulated || res.otp);
      } catch {
        code = `${Math.floor(100000 + Math.random() * 900000)}`;
        simulated = true;
      }
      setActiveOtpCode(code);
      setIsSimulatedOtp(simulated);
      setOtpDigits(["", "", "", "", "", ""]);
      setResendCooldown(45);
      setSuccessMsg(
        simulated
          ? `A new verification code was generated for ${email}`
          : `A fresh 6-digit code was emailed to ${email}. Please check your inbox and spam folder.`
      );
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  }

  // OTP Box Navigation
  function handleOtpDigitChange(index: number, val: string) {
    const digit = val.slice(-1);
    if (!/^\d*$/.test(digit)) return;

    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);

    // Auto-advance
    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pasted)) {
      const arr = pasted.split("");
      setOtpDigits(arr);
      otpInputsRef.current[5]?.focus();
    }
  }

  function autoFillOtp(code: string) {
    if (!code || code.length !== 6) return;
    setOtpDigits(code.split(""));
    otpInputsRef.current[5]?.focus();
  }

  // Demo Login Handler
  async function demoLogin(demoEmail: string, demoPass: string, demoName: string, demoRole: "student" | "faculty" = "student") {
    setError(null);
    setLoading(true);
    try {
      const { user } = await authApi.login({ email: demoEmail, password: demoPass });
      onAuth(user);
    } catch (loginErr: any) {
      const msg = loginErr.message || "";
      // If error indicates network failure or backend unreachable, immediately reveal server config
      if (
        msg.includes("Cannot connect") ||
        msg.includes("not reached") ||
        msg.includes("404") ||
        msg.includes("received HTML") ||
        msg.includes("Failed to fetch")
      ) {
        setShowServerConfig(true);
        setError(msg);
        return;
      }

      // Try automatic registration fallback in case the demo account was wiped or not yet registered
      try {
        const { user } = await authApi.register({
          email: demoEmail,
          password: demoPass,
          name: demoName,
          role: demoRole,
          affiliation: demoRole === "faculty" ? "Faculty of Cognitive Science & Archive Fellow" : "Undergraduate Scholar &middot; Academic Archive",
        });
        onAuth(user);
      } catch (regErr: any) {
        const regMsg = regErr.message || "Unknown error";
        if (
          regMsg.includes("Cannot connect") ||
          regMsg.includes("not reached") ||
          regMsg.includes("404") ||
          regMsg.includes("received HTML") ||
          regMsg.includes("Failed to fetch")
        ) {
          setShowServerConfig(true);
        }
        setError("Failed to authenticate demo account: " + regMsg);
      }
    } finally {
      setLoading(false);
    }
  }

  const pwdStrength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "100vh" }}>
      {/* Nav */}
      <header
        className="glass-nav"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.85rem 2rem",
          position: "relative",
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(37,99,235,0.35)",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="#ffffff">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.15rem", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            OnlyBooks
          </span>
          <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "#2563eb", background: "rgba(37,99,235,0.1)", padding: "0.15rem 0.5rem", borderRadius: "999px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Academic Archive
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
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2.5rem 1rem" }}>
        <Reveal delay={0}>
          <div style={{ width: "100%", maxWidth: isLogin ? "440px" : "560px", transition: "max-width 0.3s ease" }}>

            {/* Header branding */}
            <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                  boxShadow: "0 10px 28px rgba(37, 99, 235, 0.32)",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#ffffff">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 700, margin: "0 0 0.4rem", letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
                {isLogin
                  ? "Sign into Archive Console"
                  : stage === "otp"
                  ? "Verify Academic Email"
                  : "Create an Account"}
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                {isLogin
                  ? "Access scholarly manuscripts, course reserves, and research synthesis"
                  : stage === "otp"
                  ? `Enter the 6-digit code sent to ${email}`
                  : "Sign up for student or faculty archive access"}
              </p>
            </div>

            {/* Card Shell */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.96)",
                backdropFilter: "blur(24px) saturate(1.4)",
                WebkitBackdropFilter: "blur(24px) saturate(1.4)",
                border: "1.5px solid rgba(255, 255, 255, 0.95)",
                borderRadius: 24,
                padding: "2rem",
                boxShadow: "0 28px 72px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(15, 23, 42, 0.04)",
              }}
            >
              {/* Tab switcher: Only shown when not in OTP stage */}
              {stage === "form" && (
                <div
                  style={{
                    display: "flex",
                    background: "rgba(15, 23, 42, 0.05)",
                    borderRadius: "12px",
                    padding: "4px",
                    marginBottom: "1.75rem",
                  }}
                >
                  {[
                    { id: true, label: "Sign In" },
                    { id: false, label: "Sign Up" },
                  ].map((tab) => {
                    const active = isLogin === tab.id;
                    return (
                      <button
                        key={tab.label}
                        type="button"
                        onClick={() => {
                          setIsLogin(tab.id);
                          setError(null);
                          setStage("form");
                        }}
                        style={{
                          flex: 1,
                          padding: "0.6rem",
                          border: active ? "1px solid rgba(37, 99, 235, 0.2)" : "1px solid transparent",
                          borderRadius: "10px",
                          fontSize: "0.83rem",
                          fontWeight: active ? 600 : 500,
                          fontFamily: "var(--font-sans)",
                          cursor: "pointer",
                          transition: "all 0.18s ease",
                          background: active ? "#FFFFFF" : "transparent",
                          color: active ? "#1d4ed8" : "var(--text-secondary)",
                          boxShadow: active ? "0 2px 8px rgba(37, 99, 235, 0.1)" : "none",
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    padding: "0.75rem 1rem",
                    borderRadius: "12px",
                    fontSize: "0.82rem",
                    marginBottom: "1.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Backend Server Connection Box */}
              {(showServerConfig || (error && error.includes("404"))) && (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1.5px solid #bfdbfe",
                    borderRadius: "16px",
                    padding: "1rem 1.15rem",
                    marginBottom: "1.25rem",
                    boxShadow: "0 4px 16px rgba(37, 99, 235, 0.08)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <span style={{ fontSize: "1rem" }}>📡</span>
                      <strong style={{ fontSize: "0.86rem", color: "#1e293b" }}>Connect Academic Backend</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowServerConfig(false)}
                      style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.9rem" }}
                    >
                      ✕
                    </button>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "#475569", margin: "0 0 0.65rem 0", lineHeight: 1.45 }}>
                    Your frontend needs to communicate with your FastAPI server on Render. Enter your Render backend service URL below:
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input
                      type="url"
                      value={customServerUrl}
                      onChange={(e) => setCustomServerUrl(e.target.value)}
                      placeholder="https://onlybooks-backend.onrender.com"
                      className="input-minimal"
                      style={{
                        flex: 1,
                        fontSize: "0.8rem",
                        padding: "0.45rem 0.75rem",
                        borderRadius: "8px",
                        border: "1.5px solid #cbd5e1",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleConnectServer}
                      disabled={testingServer}
                      style={{
                        background: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "0.45rem 0.9rem",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
                      }}
                    >
                      {testingServer ? "Connecting..." : "Connect API"}
                    </button>
                  </div>
                  {serverTestResult && (
                    <div
                      style={{
                        fontSize: "0.76rem",
                        color: serverTestResult.ok ? "#16a34a" : "#dc2626",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      <span>{serverTestResult.ok ? "✅" : "❌"}</span>
                      <span>{serverTestResult.ok ? serverTestResult.message : serverTestResult.message}</span>
                    </div>
                  )}
                  <div style={{ fontSize: "0.71rem", color: "#64748b", marginTop: "0.45rem", lineHeight: 1.4 }}>
                    💡 <em>Tip: You can also set <code>VITE_API_URL</code> in Render/Netlify Environment Variables.</em>
                  </div>
                </div>
              )}

              {/* Success / Info Message */}
              {successMsg && (
                <div
                  style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    color: "#1d4ed8",
                    padding: "0.75rem 1rem",
                    borderRadius: "12px",
                    fontSize: "0.82rem",
                    marginBottom: "1.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span>ℹ️</span>
                  <span>{successMsg}</span>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  MODE 1: LOGIN FORM
                 ───────────────────────────────────────────────────────────── */}
              {isLogin && (
                <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                  <div>
                    <label className="input-label" style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)" }}>
                      Institutional Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-minimal"
                      placeholder="scholar@university.edu"
                      style={{ marginTop: "0.3rem" }}
                    />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label className="input-label" style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)" }}>
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: "0.74rem", cursor: "pointer", fontWeight: 500 }}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-minimal"
                      placeholder="••••••••••••"
                      style={{ marginTop: "0.3rem" }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      marginTop: "0.5rem",
                      padding: "0.8rem",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      borderRadius: "12px",
                      border: "none",
                      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      color: "#FFFFFF",
                      cursor: loading ? "not-allowed" : "pointer",
                      boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {loading ? "Authenticating Session…" : "Sign In to Archive Console"}
                  </button>

                  {/* Quick Demo Logins */}
                  <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--border-light)" }}>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textAlign: "center", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                      Quick One-Click Demo Access
                    </p>
                    <div style={{ display: "flex", gap: "0.65rem" }}>
                      <button
                        type="button"
                        onClick={() => demoLogin("student@university.edu", "demo123", "Demo Student", "student")}
                        disabled={loading}
                        style={{
                          flex: 1,
                          padding: "0.65rem 0.5rem",
                          border: "1.5px solid var(--border-strong)",
                          borderRadius: "10px",
                          background: "#FFFFFF",
                          cursor: "pointer",
                          fontSize: "0.78rem",
                          fontFamily: "var(--font-sans)",
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.4rem",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
                      >
                        🎓 Student Dashboard
                      </button>
                      <button
                        type="button"
                        onClick={() => demoLogin("faculty@university.edu", "demo123", "Demo Faculty", "faculty")}
                        disabled={loading}
                        style={{
                          flex: 1,
                          padding: "0.65rem 0.5rem",
                          border: "1.5px solid var(--border-strong)",
                          borderRadius: "10px",
                          background: "#FFFFFF",
                          cursor: "pointer",
                          fontSize: "0.78rem",
                          fontFamily: "var(--font-sans)",
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.4rem",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
                      >
                        🏛️ Faculty Console
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  MODE 2: ENHANCED SIGNUP FORM (STAGE 1)
                 ───────────────────────────────────────────────────────────── */}
              {!isLogin && stage === "form" && (
                <form onSubmit={handleProceedToOtp} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                  {/* Role Selector Card */}
                  <div>
                    <label className="input-label" style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)", marginBottom: "0.4rem", display: "block" }}>
                      Academic Role &amp; Clearance Level
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
                      {[
                        {
                          id: "student",
                          icon: "🎓",
                          title: "Student / Scholar",
                          desc: "Course reserves, literature review & inquiry notes",
                        },
                        {
                          id: "faculty",
                          icon: "🏛️",
                          title: "Faculty / Fellow",
                          desc: "Manuscript deposit rights & institutional analytics",
                        },
                      ].map((item) => {
                        const isSelected = role === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => setRole(item.id as any)}
                            style={{
                              padding: "0.85rem",
                              borderRadius: "14px",
                              border: isSelected ? "2px solid #2563eb" : "1.5px solid var(--border-strong)",
                              background: isSelected ? "#eff6ff" : "rgba(255, 255, 255, 0.7)",
                              cursor: "pointer",
                              transition: "all 0.18s ease",
                              boxShadow: isSelected ? "0 4px 12px rgba(37, 99, 235, 0.12)" : "none",
                            }}
                          >
                            <div style={{ fontSize: "1.4rem", marginBottom: "0.3rem" }}>{item.icon}</div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.84rem", color: isSelected ? "#1d4ed8" : "var(--text-primary)" }}>
                              {item.title}
                            </p>
                            <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.35 }}>
                              {item.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Role-Specific Form Fields */}
                  {role === "faculty" ? (
                    <>
                      {/* Full Name & Institution for Faculty */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                        <div>
                          <label className="input-label" style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)" }}>
                            Faculty Name
                          </label>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input-minimal"
                            placeholder="Dr. Eleanor Vance / Prof. Thorne"
                            style={{ marginTop: "0.3rem" }}
                          />
                        </div>
                        <div>
                          <label className="input-label" style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)" }}>
                            Institution / University
                          </label>
                          <input
                            type="text"
                            required
                            value={institution}
                            onChange={(e) => setInstitution(e.target.value)}
                            className="input-minimal"
                            placeholder="MIT, Oxford, Stanford..."
                            style={{ marginTop: "0.3rem" }}
                          />
                        </div>
                      </div>

                      {/* Quick Institution Pills */}
                      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "-0.4rem" }}>
                        {SUGGESTED_INSTITUTIONS.map((inst) => (
                          <button
                            key={inst}
                            type="button"
                            onClick={() => setInstitution(inst)}
                            style={{
                              fontSize: "0.7rem",
                              padding: "0.2rem 0.55rem",
                              borderRadius: "999px",
                              border: institution === inst ? "1px solid #2563eb" : "1px solid var(--border-strong)",
                              background: institution === inst ? "#eff6ff" : "transparent",
                              color: institution === inst ? "#1d4ed8" : "var(--text-secondary)",
                              cursor: "pointer",
                            }}
                          >
                            {inst}
                          </button>
                        ))}
                      </div>

                      {/* Faculty Rank & Department/Lab in 2 columns */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                        <div>
                          <label className="input-label" style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)" }}>
                            Faculty Title / Designation
                          </label>
                          <select
                            value={facultyRank}
                            onChange={(e) => setFacultyRank(e.target.value)}
                            className="input-minimal"
                            style={{ marginTop: "0.3rem", cursor: "pointer" }}
                          >
                            {FACULTY_RANKS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="input-label" style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)" }}>
                            Department or Research Lab
                          </label>
                          <input
                            type="text"
                            value={labOrDepartment}
                            onChange={(e) => setLabOrDepartment(e.target.value)}
                            className="input-minimal"
                            placeholder="e.g. CSAIL / Cognitive Systems"
                            style={{ marginTop: "0.3rem" }}
                          />
                        </div>
                      </div>

                      {/* ORCID iD / Faculty Identifier */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <label className="input-label" style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)" }}>
                            ORCID iD / Faculty Staff ID (Optional)
                          </label>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Publishing verification</span>
                        </div>
                        <input
                          type="text"
                          value={academicId}
                          onChange={(e) => setAcademicId(e.target.value)}
                          className="input-minimal"
                          placeholder="e.g. 0000-0002-1825-0097 or FAC-MIT-884"
                          style={{ marginTop: "0.3rem" }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Full Name & Institution for Student */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                        <div>
                          <label className="input-label" style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)" }}>
                            Student Full Name
                          </label>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input-minimal"
                            placeholder="Alexander Wright"
                            style={{ marginTop: "0.3rem" }}
                          />
                        </div>
                        <div>
                          <label className="input-label" style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)" }}>
                            Institution / University
                          </label>
                          <input
                            type="text"
                            required
                            value={institution}
                            onChange={(e) => setInstitution(e.target.value)}
                            className="input-minimal"
                            placeholder="MIT, Oxford, Stanford..."
                            style={{ marginTop: "0.3rem" }}
                          />
                        </div>
                      </div>

                      {/* Quick Institution Pills */}
                      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "-0.4rem" }}>
                        {SUGGESTED_INSTITUTIONS.map((inst) => (
                          <button
                            key={inst}
                            type="button"
                            onClick={() => setInstitution(inst)}
                            style={{
                              fontSize: "0.7rem",
                              padding: "0.2rem 0.55rem",
                              borderRadius: "999px",
                              border: institution === inst ? "1px solid #2563eb" : "1px solid var(--border-strong)",
                              background: institution === inst ? "#eff6ff" : "transparent",
                              color: institution === inst ? "#1d4ed8" : "var(--text-secondary)",
                              cursor: "pointer",
                            }}
                          >
                            {inst}
                          </button>
                        ))}
                      </div>

                      {/* Degree Level & Student ID in 2 columns */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                        <div>
                          <label className="input-label" style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)" }}>
                            Degree / Academic Level
                          </label>
                          <select
                            value={studentDegree}
                            onChange={(e) => setStudentDegree(e.target.value)}
                            className="input-minimal"
                            style={{ marginTop: "0.3rem", cursor: "pointer" }}
                          >
                            {STUDENT_LEVELS.map((lvl) => (
                              <option key={lvl} value={lvl}>
                                {lvl}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="input-label" style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)" }}>
                            Student ID / Roll No (Optional)
                          </label>
                          <input
                            type="text"
                            value={academicId}
                            onChange={(e) => setAcademicId(e.target.value)}
                            className="input-minimal"
                            placeholder="e.g. STU-2024-8921"
                            style={{ marginTop: "0.3rem" }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Primary Academic Discipline (Common to both) */}
                  <div>
                    <label className="input-label" style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)" }}>
                      Primary Research Field / Academic Discipline
                    </label>
                    <select
                      value={discipline}
                      onChange={(e) => setDiscipline(e.target.value)}
                      className="input-minimal"
                      style={{ marginTop: "0.3rem", cursor: "pointer" }}
                    >
                      {DISCIPLINES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Email with Instant Domain Verification & Anti-Fake Badge */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label className="input-label" style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)" }}>
                        Institutional Email Address
                      </label>
                      {isAcademicEmail(email) && (
                        <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#16a34a", background: "#dcfce7", padding: "0.15rem 0.5rem", borderRadius: "999px" }}>
                          ✓ Academic Domain Recognized
                        </span>
                      )}
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-minimal"
                      placeholder="e.vance@university.edu"
                      style={{ marginTop: "0.3rem" }}
                    />
                    {isDisposableEmail(email) && (
                      <p style={{ margin: "0.3rem 0 0", fontSize: "0.74rem", color: "#dc2626", fontWeight: 500 }}>
                        ⚠️ Temporary/disposable email services are not allowed. Please enter your institutional address.
                      </p>
                    )}
                  </div>

                  {/* Passwords with Strength Meter and Match Validation */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label className="input-label" style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)" }}>
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: "0.72rem", cursor: "pointer" }}
                        >
                          {showPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-minimal"
                        placeholder="At least 8 chars"
                        style={{ marginTop: "0.3rem" }}
                      />
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label className="input-label" style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)" }}>
                          Confirm Password
                        </label>
                        {confirmPassword.length > 0 && (
                          <span style={{ fontSize: "0.7rem", fontWeight: 600, color: passwordsMatch ? "#16a34a" : "#dc2626" }}>
                            {passwordsMatch ? "✓ Match" : "✕ Mismatch"}
                          </span>
                        )}
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input-minimal"
                        placeholder="Re-enter password"
                        style={{ marginTop: "0.3rem" }}
                      />
                    </div>
                  </div>

                  {/* Password Strength Visual Meter */}
                  {password.length > 0 && (
                    <div style={{ marginTop: "-0.4rem" }}>
                      <div style={{ display: "flex", gap: "4px", marginBottom: "0.25rem" }}>
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            style={{
                              flex: 1,
                              height: "4px",
                              borderRadius: "2px",
                              background: pwdStrength.score >= step ? pwdStrength.color : "rgba(0,0,0,0.08)",
                              transition: "all 0.25s ease",
                            }}
                          />
                        ))}
                      </div>
                      <span style={{ fontSize: "0.72rem", color: pwdStrength.color, fontWeight: 600 }}>
                        Security: {pwdStrength.label} (requires 8+ characters, mix of numbers and letters)
                      </span>
                    </div>
                  )}

                  {/* Academic Honor Code Checkbox */}
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "0.55rem", fontSize: "0.75rem", color: "var(--text-secondary)", cursor: "pointer", marginTop: "0.2rem" }}>
                    <input
                      type="checkbox"
                      checked={honorCode}
                      onChange={(e) => setHonorCode(e.target.checked)}
                      style={{ marginTop: "2px" }}
                    />
                    <span>
                      I certify that I adhere to academic citation ethics and university fair-use archival policies.
                    </span>
                  </label>

                  {/* Continue to OTP verification button */}
                  <button
                    type="submit"
                    disabled={loading || isDisposableEmail(email)}
                    style={{
                      marginTop: "0.5rem",
                      padding: "0.85rem",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      borderRadius: "12px",
                      border: "none",
                      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      color: "#FFFFFF",
                      cursor: loading || isDisposableEmail(email) ? "not-allowed" : "pointer",
                      boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                    }}
                  >
                    {loading ? "Sending Verification Code…" : "Continue to Verification →"}
                  </button>
                </form>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  MODE 3: EMAIL OTP VERIFICATION STAGE (STAGE 2)
                 ───────────────────────────────────────────────────────────── */}
              {!isLogin && stage === "otp" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem", animation: "menuFadeIn 0.22s ease-out" }}>
                  {/* Real Email Dispatched Banner (Real email was sent - Code NOT displayed so user must check their inbox) */}
                  {!isSimulatedOtp && (
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1.5px solid #86efac",
                        borderRadius: "14px",
                        padding: "0.95rem 1.15rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <span style={{ fontSize: "1.6rem" }}>📧</span>
                      <div>
                        <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#166534" }}>
                          Verification Code Emailed to Your Inbox
                        </p>
                        <p style={{ margin: "0.25rem 0 0", fontSize: "0.74rem", color: "#15803d", lineHeight: 1.45 }}>
                          A 6-digit verification code has been dispatched to <strong>{email}</strong>. Please check your Gmail/inbox (including Spam folder) and enter the code below to verify your identity.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Simulated OTP Notification Banner (Only when SMTP is not configured on the server) */}
                  {isSimulatedOtp && activeOtpCode && (
                    <div
                      style={{
                        background: "rgba(37, 99, 235, 0.08)",
                        border: "1.5px solid rgba(37, 99, 235, 0.25)",
                        borderRadius: "14px",
                        padding: "0.85rem 1rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span style={{ fontSize: "1.3rem" }}>📬</span>
                        <div>
                          <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: "#1d4ed8" }}>
                            In-App Simulation Code: <strong>{activeOtpCode}</strong>
                          </p>
                          <p style={{ margin: "0.15rem 0 0", fontSize: "0.71rem", color: "var(--text-secondary)" }}>
                            SMTP not configured on backend. Add <code>SMTP_HOST</code> &amp; <code>SMTP_PASSWORD</code> in Render to send live emails.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => autoFillOtp(activeOtpCode)}
                        style={{
                          padding: "0.35rem 0.75rem",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          borderRadius: "8px",
                          background: "#2563eb",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Auto-Fill Code
                      </button>
                    </div>
                  )}

                  {/* Email & Change Email link */}
                  <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      Verification code dispatched to:
                    </p>
                    <p style={{ margin: "0.2rem 0 0.5rem", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {email}
                    </p>
                    <button
                      type="button"
                      onClick={() => setStage("form")}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#2563eb",
                        fontSize: "0.76rem",
                        cursor: "pointer",
                        fontWeight: 600,
                        textDecoration: "underline",
                      }}
                    >
                      Wrong email? Edit details
                    </button>
                  </div>

                  {/* 6 Digit Input Boxes */}
                  <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }} onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          otpInputsRef.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        style={{
                          width: "48px",
                          height: "54px",
                          textAlign: "center",
                          fontSize: "1.45rem",
                          fontWeight: 700,
                          borderRadius: "12px",
                          border: digit ? "2px solid #2563eb" : "1.5px solid var(--border-strong)",
                          background: digit ? "#eff6ff" : "#FFFFFF",
                          color: "#1d4ed8",
                          outline: "none",
                          boxShadow: digit ? "0 2px 8px rgba(37, 99, 235, 0.15)" : "none",
                          transition: "all 0.18s ease",
                        }}
                      />
                    ))}
                  </div>

                  {/* Verify Action Button */}
                  <button
                    type="button"
                    onClick={() => handleVerifyOtpAndRegister()}
                    disabled={loading || otpDigits.join("").length !== 6}
                    style={{
                      padding: "0.85rem",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      borderRadius: "12px",
                      border: "none",
                      background: otpDigits.join("").length === 6 ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "rgba(15, 23, 42, 0.12)",
                      color: otpDigits.join("").length === 6 ? "#FFFFFF" : "rgba(15, 23, 42, 0.4)",
                      cursor: otpDigits.join("").length === 6 && !loading ? "pointer" : "not-allowed",
                      boxShadow: otpDigits.join("").length === 6 ? "0 4px 14px rgba(37, 99, 235, 0.35)" : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {loading ? "Verifying & Provisioning Academic Account…" : "Verify Code & Activate Account"}
                  </button>

                  {/* Resend Timer / Action */}
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Didn't receive code?</span>
                    {resendCooldown > 0 ? (
                      <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                        Resend in {resendCooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendCode}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#2563eb",
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "0.78rem",
                          textDecoration: "underline",
                        }}
                      >
                        Resend Code Now
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Footer note & Server config link */}
            <div style={{ textAlign: "center", marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.45rem", alignItems: "center" }}>
              <p style={{ margin: 0, fontSize: "0.775rem", color: "var(--text-secondary)" }}>
                🔒 Protected by 256-bit Institutional TLS &middot; OnlyBooks Academic Archive v1.0
              </p>
              <button
                type="button"
                onClick={() => setShowServerConfig((prev) => !prev)}
                style={{
                  background: "rgba(37, 99, 235, 0.06)",
                  border: "1px solid rgba(37, 99, 235, 0.15)",
                  borderRadius: "999px",
                  padding: "0.25rem 0.75rem",
                  color: "#2563eb",
                  fontSize: "0.74rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  transition: "all 0.15s ease",
                }}
              >
                <span>📡 Backend: {getApiBaseUrl()}</span>
                <span style={{ fontSize: "0.68rem", opacity: 0.75 }}>(Change)</span>
              </button>
            </div>
          </div>
        </Reveal>
      </main>
    </div>
  );
}
