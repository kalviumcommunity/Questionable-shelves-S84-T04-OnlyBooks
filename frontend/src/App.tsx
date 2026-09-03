import { useState } from "react";
import AuthPage from "./views/AuthPage";
import ResearchPortal from "./views/ResearchPortal";
import SynthesisView from "./views/SynthesisView";

export type AppView = "auth" | "portal" | "synthesis";

export interface Query {
  id: string;
  question: string;
  timestamp: string;
}

export interface User {
  name: string;
  initials: string;
  email: string;
}

const SEED_HISTORY: Query[] = [
  { id: "seed-1", question: "The epistemology of scientific consensus formation", timestamp: "29 Aug" },
  { id: "seed-2", question: "Feminist critiques of Rawlsian distributive justice", timestamp: "27 Aug" },
  { id: "seed-3", question: "Neuroplasticity and second-language acquisition in adults", timestamp: "24 Aug" },
  { id: "seed-4", question: "Archive fever: Derrida and the politics of memory", timestamp: "21 Aug" },
];

export default function App() {
  const [view, setView] = useState<AppView>("auth");
  const [user, setUser] = useState<User | null>(null);
  const [activeQuery, setActiveQuery] = useState<Query | null>(null);
  const [queryHistory, setQueryHistory] = useState<Query[]>(SEED_HISTORY);

  function handleAuth(u: User) {
    setUser(u);
    setView("portal");
  }

  function handleQuery(question: string) {
    const q: Query = {
      id: `q-${Date.now()}`,
      question,
      timestamp: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    };
    setQueryHistory((prev) => [q, ...prev]);
    setActiveQuery(q);
    setView("synthesis");
  }

  function handleSelectQuery(q: Query) {
    setActiveQuery(q);
    setView("synthesis");
  }

  if (view === "auth") {
    return <AuthPage onAuth={handleAuth} />;
  }

  if (view === "portal") {
    return (
      <ResearchPortal
        user={user!}
        onQuery={handleQuery}
        recentQueries={queryHistory.slice(0, 4)}
        onSignOut={() => { setUser(null); setView("auth"); }}
      />
    );
  }

  return (
    <SynthesisView
      user={user!}
      activeQuery={activeQuery!}
      queryHistory={queryHistory}
      onSelectQuery={handleSelectQuery}
      onNewSearch={() => setView("portal")}
      onQuery={handleQuery}
    />
  );
}
