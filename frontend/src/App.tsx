import { useState, useEffect } from "react";
import AuthPage from "./views/AuthPage";
import ResearchPortal from "./views/ResearchPortal";
import SynthesisView from "./views/SynthesisView";
import GetStarted from "./views/GetStarted";
import { authApi, inquiryApi, getStoredToken } from "./services/api";

export type AppView = "auth" | "portal" | "synthesis" | "guide";

export interface Query {
  id: string;
  question: string;
  timestamp: string;
  collectionFilter?: string;
}

export interface User {
  id?: string;
  name: string;
  initials: string;
  email: string;
  affiliation?: string;
  role?: string;
  provider?: string;
}

const SEED_HISTORY: Query[] = [
  { id: "seed-1", question: "The epistemology of scientific consensus formation", timestamp: "29 Aug", collectionFilter: "all" },
  { id: "seed-2", question: "Feminist critiques of Rawlsian distributive justice", timestamp: "27 Aug", collectionFilter: "theses" },
  { id: "seed-3", question: "Neuroplasticity and second-language acquisition in adults", timestamp: "24 Aug", collectionFilter: "papers" },
  { id: "seed-4", question: "Archive fever: Derrida and the politics of memory", timestamp: "21 Aug", collectionFilter: "reserves" },
];

export default function App() {
  const [view, setView] = useState<AppView>("guide");
  const [user, setUser] = useState<User | null>(null);
  const [activeQuery, setActiveQuery] = useState<Query | null>(null);
  const [queryHistory, setQueryHistory] = useState<Query[]>(SEED_HISTORY);
  const [loadingSession, setLoadingSession] = useState(true);

  const loadHistory = () => {
    inquiryApi.getHistory(15)
      .then((res) => {
        if (res.items && res.items.length > 0) {
          const dbHistory: Query[] = res.items.map((it) => ({
            id: it.id,
            question: it.question,
            timestamp: it.timestamp,
            collectionFilter: it.collection_filter || "all",
          }));
          setQueryHistory((prev) => {
            const existingIds = new Set(dbHistory.map((h) => h.id));
            const filteredPrev = prev.filter((p) => !existingIds.has(p.id) && !p.id.startsWith("seed-"));
            return [...dbHistory, ...filteredPrev];
          });
        }
      })
      .catch((e) => console.warn("Failed to load inquiry history:", e));
  };

  // Restore authenticated session on initial mount
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoadingSession(false);
      return;
    }

    authApi.getMe()
      .then((profile) => {
        setUser(profile);
        loadHistory();
      })
      .catch(() => {
        authApi.logout();
        setUser(null);
      })
      .finally(() => {
        setLoadingSession(false);
      });
  }, []);

  function handleAuth(u: User) {
    setUser(u);
    setView("portal");
    loadHistory();
  }

  function handleSignOut() {
    authApi.logout();
    setUser(null);
    setView("auth");
  }

  function handleQuery(question: string, collectionFilter: string = "all") {
    const q: Query = {
      id: `q-${Date.now()}`,
      question,
      timestamp: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      collectionFilter,
    };
    setQueryHistory((prev) => [q, ...prev]);
    setActiveQuery(q);
    setView("synthesis");
  }

  function handleSelectQuery(q: Query) {
    setActiveQuery(q);
    setView("synthesis");
  }

  if (loadingSession) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAFA",
          fontFamily: "var(--font-sans)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.2rem",
            fontStyle: "italic",
            color: "#1C1C1C",
            marginBottom: "0.5rem",
          }}
        >
          OnlyBooks · University Library Archive
        </p>
        <p style={{ fontSize: "0.72rem", color: "#9CA3AF", letterSpacing: "0.08em" }}>
          VERIFYING INSTITUTIONAL CREDENTIALS…
        </p>
      </div>
    );
  }

  if (view === "auth") {
    return <AuthPage onAuth={handleAuth} onOpenGuide={() => setView("guide")} />;
  }

  if (view === "portal") {
    return (
      <ResearchPortal
        user={user!}
        onQuery={handleQuery}
        recentQueries={queryHistory.slice(0, 4)}
        onSignOut={handleSignOut}
        onOpenGuide={() => setView("guide")}
      />
    );
  }

  if (view === "guide") {
    return <GetStarted user={user} onBack={() => setView(user ? "portal" : "auth")} />;
  }

  return (
    <SynthesisView
      user={user!}
      activeQuery={activeQuery!}
      queryHistory={queryHistory}
      onSelectQuery={handleSelectQuery}
      onNewSearch={() => setView("portal")}
      onQuery={handleQuery}
      onOpenGuide={() => setView("guide")}
    />
  );
}

// fix applied to main container
