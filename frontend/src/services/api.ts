// OnlyBooks Frontend API Service

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export interface UserProfile {
  id: string;
  name: string;
  initials: string;
  email: string;
  affiliation?: string;
  role: string;
  provider: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  affiliation?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SSOPayload {
  provider: "google_scholar" | "orcid" | "institutional_sso";
  email: string;
  name?: string;
  affiliation?: string;
}

const TOKEN_KEY = "onlybooks_access_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = "An error occurred with the academic server.";
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorDetail = errorJson.detail;
      }
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const data = await request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setStoredToken(data.access_token);
    return data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const data = await request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setStoredToken(data.access_token);
    return data;
  },

  async sso(payload: SSOPayload): Promise<AuthResponse> {
    const data = await request<AuthResponse>("/auth/sso", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setStoredToken(data.access_token);
    return data;
  },

  async getMe(): Promise<UserProfile> {
    return request<UserProfile>("/auth/me", {
      method: "GET",
    });
  },

  logout(): void {
    clearStoredToken();
  },
};
