import { useState } from "react";
import { ThemeToggle, type Query, type User } from "../App";
import DepositModal from "../components/DepositModal";
import UserMenu from "../components/UserMenu";
import NotificationPopover from "../components/NotificationPopover";
import { FacultyDashboard } from "../components/dashboards/FacultyDashboard";
import { StudentDashboard } from "../components/dashboards/StudentDashboard";

interface Props {
  user: User;
  onQuery: (question: string, collectionFilter?: string) => void;
  recentQueries: Query[];
  onSignOut: () => void;
  onOpenGuide?: () => void;
}

export default function ResearchPortal({
  user,
  onQuery,
  recentQueries,
  onSignOut,
  onOpenGuide,
}: Props) {
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen w-full text-text relative">
      {/* ── Cleaned Navigation Header (Keep this intact) ── */}
      <header className="glass-nav flex items-center justify-between px-6 py-3 flex-shrink-0 relative z-50">
        <button
          onClick={onOpenGuide}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "var(--text-primary)",
          }}
        >
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "7px",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.2}
              stroke="var(--bg-primary)"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
          </div>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "1.05rem",
              letterSpacing: "-0.025em",
            }}
          >
            OnlyBooks
          </span>
        </button>

        <nav className="flex items-center gap-4">
          {user?.role === "faculty" && (
            <button
              onClick={() => setIsDepositOpen(true)}
              className="btn-primary"
              style={{
                padding: "0.38rem 0.9rem",
                fontSize: "0.78rem",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Deposit
            </button>
          )}

          <ThemeToggle />
          <NotificationPopover />
          <UserMenu user={user} onSignOut={onSignOut} />
        </nav>
      </header>

      {/* ── Role-Based Routing ── */}
      <main className="flex-1 overflow-y-auto relative z-10 pb-12">
        {user?.role === "faculty" ? (
          <FacultyDashboard
            user={user}
            onOpenDeposit={() => setIsDepositOpen(true)}
          />
        ) : (
          <StudentDashboard
            user={user}
            onQuery={onQuery}
            recentQueries={recentQueries}
          />
        )}
      </main>

      {/* Modals remain here at the root level */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}

export { ResearchPortal };
