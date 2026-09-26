export interface AppSettings {
  compactMode: boolean;
  reducedMotion: boolean;
  fontScale: "sm" | "md" | "lg";
  emailDigest: boolean;
  newAcquisitions: boolean;
  researchAlerts: boolean;
  searchHistory: boolean;
  analyticsOptIn: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  compactMode: false,
  reducedMotion: false,
  fontScale: "md",
  emailDigest: true,
  newAcquisitions: true,
  researchAlerts: false,
  searchHistory: true,
  analyticsOptIn: true,
};

const SETTINGS_KEY = "onlybooks_app_settings";

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveAppSettings(settings: Partial<AppSettings>): AppSettings {
  const current = loadAppSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to persist app settings:", err);
  }
  applyAppSettings(updated);
  return updated;
}

export function applyAppSettings(settings: AppSettings): void {
  if (typeof document === "undefined") return;

  // 1. Font Scaling
  const sizeMap: Record<"sm" | "md" | "lg", string> = {
    sm: "14px",
    md: "16px",
    lg: "18px",
  };
  document.documentElement.style.fontSize = sizeMap[settings.fontScale] || "16px";

  // 2. Compact Mode
  if (settings.compactMode) {
    document.body.classList.add("compact-ui");
  } else {
    document.body.classList.remove("compact-ui");
  }

  // 3. Reduced Motion
  if (settings.reducedMotion) {
    document.body.classList.add("reduced-motion");
  } else {
    document.body.classList.remove("reduced-motion");
  }
}

// ── Avatar Persistence ──────────────────────────────────────────

export function getUserAvatar(email?: string): string | null {
  if (!email) return null;
  try {
    return localStorage.getItem(`onlybooks_avatar_${email.toLowerCase().trim()}`);
  } catch {
    return null;
  }
}

export function setUserAvatar(email: string, avatarDataUrl: string | null): void {
  if (!email) return;
  const key = `onlybooks_avatar_${email.toLowerCase().trim()}`;
  try {
    if (avatarDataUrl) {
      localStorage.setItem(key, avatarDataUrl);
    } else {
      localStorage.removeItem(key);
    }
    // Notify all listeners
    window.dispatchEvent(new CustomEvent("onlybooks-avatar-changed", { detail: { email, avatar: avatarDataUrl } }));
  } catch (err) {
    console.warn("Failed to store user avatar:", err);
  }
}
