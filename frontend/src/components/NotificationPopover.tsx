import { useState, useRef, useEffect } from "react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "success" | "info" | "system";
  unread: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Catalog Ingestion Ready",
    message: "Recent deposit parsed into semantic chunks and indexed in vector storage.",
    time: "10m ago",
    type: "success",
    unread: true,
  },
  {
    id: "notif-2",
    title: "Archive Synchronized",
    message: "178,700+ academic holdings verified across Faculty Research and Theses.",
    time: "1h ago",
    type: "system",
    unread: true,
  },
  {
    id: "notif-3",
    title: "New Holding Indexed",
    message: "The Bilingual Brain: Neuroplasticity (THES-2024-COG-092) active in Reading Room.",
    time: "Yesterday",
    type: "info",
    unread: false,
  },
];

export default function NotificationPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const popoverRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
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

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <div style={{ position: "relative", zIndex: 90 }} ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-ghost"
        title="Notifications"
        style={{
          position: "relative",
          width: "36px",
          height: "36px",
          padding: 0,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          stroke="currentColor"
          style={{ width: "19px", height: "19px" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>

        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "6px",
              right: "6px",
              width: "8px",
              height: "8px",
              backgroundColor: "var(--accent)",
              borderRadius: "50%",
              boxShadow: "0 0 0 2px var(--bg-primary)",
            }}
          />
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          className="glass-panel"
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "calc(100% + 12px)",
            right: 0,
            width: "320px",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            zIndex: 110,
            animation: "menuFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            boxShadow: "0 24px 48px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.4)",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-strong)",
            borderRadius: "16px",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--border-light)",
              paddingBottom: "0.5rem",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "0.85rem",
                color: "var(--text-primary)",
              }}
            >
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "0.7rem",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
              maxHeight: "260px",
              overflowY: "auto",
            }}
          >
            {notifications.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textAlign: "center", padding: "1rem 0" }}>
                No notifications
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: "0.6rem",
                    borderRadius: "10px",
                    background: n.unread ? "var(--accent-light)" : "transparent",
                    border: "1px solid var(--border-light)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      {n.title}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{n.time}</span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.35 }}>
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
