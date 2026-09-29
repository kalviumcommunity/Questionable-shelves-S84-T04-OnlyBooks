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
  const [smtpDebug, setSmtpDebug] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(30);

  // Status & Error
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [emailExistsWarning, setEmailExistsWarning] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

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

  // Asynchronous check for existing registered email
  async function checkEmailRegistered(emailToCheck: string) {
    const clean = emailToCheck.trim().toLowerCase();
    if (!clean || !clean.includes("@") || clean.length < 5) {
      setEmailExistsWarning(false);
      return;
    }
    setCheckingEmail(true);
    try {
      const res = await authApi.checkEmail(clean);
      if (res.exists) {
        setEmailExistsWarning(true);
        setError("An account with this email address already exists. Please sign in instead.");
      } else {
        setEmailExistsWarning(false);
      }
    } catch {
      // Ignore network hiccup on passive pre-check
    } finally {
      setCheckingEmail(false);
    }
  }

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

    if (emailExistsWarning) {
      setError("An account with this email address already exists. Please sign in instead.");
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
      const res = await authApi.sendOtp(cleanEmail);
      const code = res.otp || null;
      const simulated = Boolean(res.is_simulated || res.otp);

      setActiveOtpCode(code);
      setIsSimulatedOtp(simulated);
      setSmtpDebug(res.smtp_debug || null);
      setOtpDigits(["", "", "", "", "", ""]);
      setResendCooldown(45);
      setStage("otp");
      setEmailExistsWarning(false);
      setSuccessMsg(
        simulated
          ? `Verification code generated for ${cleanEmail}`
          : `A 6-digit verification code was emailed to ${cleanEmail}. Please check your inbox and spam folder.`
      );
    } catch (err: any) {
      const msg = err.message || "Failed to dispatch verification code.";
      setError(msg);
      if (
        msg.toLowerCase().includes("already registered") ||
        msg.toLowerCase().includes("already exists") ||
        msg.toLowerCase().includes("already a user")
      ) {
        setEmailExistsWarning(true);
      }
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
      // 1. Verify OTP with backend
      const res = await authApi.verifyOtp(email.trim().toLowerCase(), enteredCode);
      if (!res.verified) {
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

  // Resend OTP handler
  async function handleResendCode() {
    if (resendCooldown > 0) return;
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.sendOtp(email.trim().toLowerCase());
      const code = res.otp || null;
      const simulated = Boolean(res.is_simulated || res.otp);
      setActiveOtpCode(code);
      setIsSimulatedOtp(simulated);
      setSmtpDebug(res.smtp_debug || null);
      setOtpDigits(["", "", "", "", "", ""]);
      setResendCooldown(45);
      setSuccessMsg(
        simulated
          ? `A new verification code was generated for ${email}`
          : `A fresh 6-digit code was emailed to ${email}. Please check your inbox and spam folder.`
      );
    } catch (err: any) {
      const msg = err.message || "Failed to resend code.";
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
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="var(--bg-secondary)">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.15rem", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            OnlyBooks
          </span>
          <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--text-secondary)", background: "var(--accent-light)", border: "1px solid var(--border-light)", padding: "0.15rem 0.5rem", borderRadius: "999px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Academic Archive
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button onClick={onOpenGuide} className="btn-ghost" style={{ fontSize: "0.82rem" }}>
            Reader's Guide
          </button>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setShowServerConfig((prev) => !prev)}
            title="Server Connection Settings"
            aria-label="Server Connection Settings"
            style={{
              background: "transparent",
              border: "1px solid var(--border-light, #e2e8f0)",
              color: "var(--text-secondary, #64748b)",
              padding: "0.45rem",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.18s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.borderColor = "var(--border-strong)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-secondary, #64748b)";
              e.currentTarget.style.borderColor = "var(--border-light, #e2e8f0)";
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-.778.099-1.533.284-2.253" />
            </svg>
          </button>
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
                  background: "var(--accent)",
                  color: "var(--bg-secondary)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                  boxShadow: "0 10px 28px rgba(0, 0, 0, 0.18)",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
            <div className="auth-card">
              {/* Tab switcher: Only shown when not in OTP stage */}
              {stage === "form" && (
                <div className="auth-tabs-container">
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
                          setEmailExistsWarning(false);
                          setStage("form");
                        }}
                        className={`auth-tab-btn ${active ? "active" : ""}`}
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
                    background: error.toLowerCase().includes("already") ? "var(--accent-light)" : "rgba(239, 68, 68, 0.1)",
                    border: `1.5px solid ${error.toLowerCase().includes("already") ? "var(--border-strong)" : "rgba(239, 68, 68, 0.3)"}`,
                    color: error.toLowerCase().includes("already") ? "var(--text-primary)" : "#ef4444",
                    padding: "0.85rem 1rem",
                    borderRadius: "14px",
                    fontSize: "0.82rem",
                    marginBottom: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>{error.toLowerCase().includes("already") ? "👤" : "⚠️"}</span>
                    <span style={{ fontWeight: 600 }}>{error}</span>
                  </div>
                  {error.toLowerCase().includes("already") && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.15rem" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(true);
                          setError(null);
                          setEmailExistsWarning(false);
                          setStage("form");
                        }}
                        style={{
                          padding: "0.45rem 0.95rem",
                          background: "var(--accent)",
                          color: "var(--bg-primary)",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                        }}
                      >
                        Switch to Sign In →
                      </button>
                      <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>
                        Your institutional account is already created.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Backend Server Connection Box */}
              {(showServerConfig || (error && error.includes("404"))) && (
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1.5px solid var(--border-strong)",
                    borderRadius: "16px",
                    padding: "1rem 1.15rem",
                    marginBottom: "1.25rem",
                    boxShadow: "var(--glass-shadow)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <span style={{ fontSize: "1rem" }}>📡</span>
                      <strong style={{ fontSize: "0.86rem", color: "var(--text-primary)" }}>Connect Academic Backend</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowServerConfig(false)}
                      style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.9rem" }}
                    >
                      ✕
                    </button>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0 0 0.65rem 0", lineHeight: 1.45 }}>
                    Your frontend communicates with your FastAPI backend. Verify or update your Render backend URL below:
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
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleConnectServer}
                      disabled={testingServer}
                      style={{
                        background: "var(--accent)",
                        color: "var(--bg-primary)",
                        border: "none",
                        borderRadius: "8px",
                        padding: "0.45rem 0.9rem",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                      }}
                    >
                      {testingServer ? "Connecting..." : "Connect API"}
                    </button>
                  </div>
                  {serverTestResult && (
                    <div
                      style={{
                        fontSize: "0.76rem",
                        color: serverTestResult.ok ? "var(--success)" : "var(--danger)",
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
                  <div style={{ fontSize: "0.71rem", color: "var(--text-secondary)", marginTop: "0.45rem", lineHeight: 1.4 }}>
                    💡 <em>Set <code>VITE_API_URL</code> on the frontend build service (Netlify site or Render static site), then redeploy. A backend-only setting is not included in the Vite build.</em>
                  </div>
                </div>
              )}

              {/* Success / Info Message */}
              {successMsg && (
                <div
                  style={{
                    background: "var(--accent-light)",
                    border: "1px solid var(--border-strong)",
                    color: "var(--text-primary)",
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
                        style={{ background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: "0.74rem", cursor: "pointer", fontWeight: 500 }}
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
                    className="auth-btn-primary"
                    style={{ marginTop: "0.5rem" }}
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
                        className="auth-demo-btn"
                      >
                        🎓 Student Dashboard
                      </button>
                      <button
                        type="button"
                        onClick={() => demoLogin("faculty@university.edu", "demo123", "Demo Faculty", "faculty")}
                        disabled={loading}
                        className="auth-demo-btn"
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
                              border: isSelected ? "2px solid var(--accent)" : "1.5px solid var(--border-strong)",
                              background: isSelected ? "var(--accent-light)" : "var(--bg-secondary)",
                              cursor: "pointer",
                              transition: "all 0.18s ease",
                              boxShadow: isSelected ? "0 4px 12px var(--accent-ring)" : "none",
                            }}
                          >
                            <div style={{ fontSize: "1.4rem", marginBottom: "0.3rem" }}>{item.icon}</div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.84rem", color: "var(--text-primary)" }}>
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
                              border: institution === inst ? "1px solid var(--accent)" : "1px solid var(--border-strong)",
                              background: institution === inst ? "var(--accent)" : "transparent",
                              color: institution === inst ? "var(--bg-primary)" : "var(--text-secondary)",
                              fontWeight: institution === inst ? 600 : 400,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
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
                              border: institution === inst ? "1px solid var(--accent)" : "1px solid var(--border-strong)",
                              background: institution === inst ? "var(--accent)" : "transparent",
                              color: institution === inst ? "var(--bg-primary)" : "var(--text-secondary)",
                              fontWeight: institution === inst ? 600 : 400,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
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
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailExistsWarning) {
                          setEmailExistsWarning(false);
                          setError(null);
                        }
                      }}
                      onBlur={() => checkEmailRegistered(email)}
                      className="input-minimal"
                      placeholder="e.vance@university.edu"
                      style={{
                        marginTop: "0.3rem",
                        borderColor: emailExistsWarning ? "#dc2626" : undefined,
                        boxShadow: emailExistsWarning ? "0 0 0 3px rgba(220, 38, 38, 0.12)" : undefined,
                      }}
                    />
                    {checkingEmail && (
                      <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "#64748b" }}>
                        Verifying institutional registry…
                      </p>
                    )}
                    {emailExistsWarning && (
                      <div
                        style={{
                          marginTop: "0.35rem",
                          background: "#fffbeb",
                          border: "1px solid #fde68a",
                          borderRadius: "8px",
                          padding: "0.45rem 0.75rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.5rem",
                        }}
                      >
                        <span style={{ fontSize: "0.75rem", color: "#92400e", fontWeight: 600 }}>
                          ⚠️ Already a user with this email address.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsLogin(true);
                            setError(null);
                            setEmailExistsWarning(false);
                            setStage("form");
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-primary)",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            textDecoration: "underline",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Sign In Instead →
                        </button>
                      </div>
                    )}
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
                          style={{ background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: "0.72rem", cursor: "pointer" }}
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
                    disabled={loading || isDisposableEmail(email) || emailExistsWarning}
                    className="auth-btn-primary"
                    style={{
                      marginTop: "0.5rem",
                      cursor: loading || isDisposableEmail(email) || emailExistsWarning ? "not-allowed" : "pointer",
                      opacity: loading || isDisposableEmail(email) || emailExistsWarning ? 0.6 : 1,
                    }}
                  >
                    {loading
                      ? "Sending Verification Code…"
                      : emailExistsWarning
                      ? "Account Already Exists — Please Sign In"
                      : "Continue to Verification →"}
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
                        background: "rgba(34, 197, 94, 0.08)",
                        border: "1.5px solid rgba(34, 197, 94, 0.3)",
                        borderRadius: "14px",
                        padding: "0.95rem 1.15rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <span style={{ fontSize: "1.6rem" }}>📧</span>
                      <div>
                        <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          Verification Code Emailed to Your Inbox
                        </p>
                        <p style={{ margin: "0.25rem 0 0", fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
                          A 6-digit verification code has been dispatched to <strong>{email}</strong>. Please check your Gmail/inbox (including Spam folder) and enter the code below to verify your identity.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Simulated OTP Notification Banner (Only when SMTP is not configured on the server) */}
                  {isSimulatedOtp && activeOtpCode && (
                    <div
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1.5px solid var(--border-color)",
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
                          <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                            In-App Simulation Code: <strong>{activeOtpCode}</strong>
                          </p>
                          <p style={{ margin: "0.15rem 0 0", fontSize: "0.71rem", color: "var(--text-secondary)" }}>
                            Email delivery not active. Configure <code>RESEND_API_KEY</code> (Resend.com) to send real mailbox emails.
                          </p>
                          {smtpDebug && (
                            <p style={{ margin: "0.3rem 0 0", fontSize: "0.70rem", color: "#b45309", fontWeight: 600 }}>
                              ⚠️ Diagnostic: {smtpDebug}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => autoFillOtp(activeOtpCode)}
                        className="auth-demo-btn"
                        style={{
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
                        color: "var(--text-primary)",
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
                          border: digit ? "2px solid var(--accent)" : "1.5px solid var(--border-strong)",
                          background: digit ? "var(--accent-light)" : "var(--bg-secondary)",
                          color: "var(--text-primary)",
                          outline: "none",
                          boxShadow: digit ? "0 2px 8px rgba(0, 0, 0, 0.1)" : "none",
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
                    className="auth-btn-primary"
                    style={{
                      cursor: otpDigits.join("").length === 6 && !loading ? "pointer" : "not-allowed",
                      opacity: otpDigits.join("").length === 6 ? 1 : 0.5,
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
                          color: "var(--text-primary)",
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
          </div>
        </Reveal>
      </main>
    </div>
  );
}
