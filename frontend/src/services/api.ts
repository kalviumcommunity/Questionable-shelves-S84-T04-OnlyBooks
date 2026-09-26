const API_URL_KEY = "onlybooks_api_url";

export function getApiBaseUrl(): string {
  // Priority: 1. Runtime override in localStorage, 2. Build-time Vite env, 3. Default relative "/api"
  const stored = typeof window !== "undefined" ? localStorage.getItem(API_URL_KEY) : null;
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  let raw = (stored || envUrl || "/api").trim();

  if (!raw || raw === "/api") return "/api";

  // Remove trailing slashes
  raw = raw.replace(/\/+$/, "");

  // If user provided origin without /api prefix (e.g. "https://backend.onrender.com"), append /api
  if (!raw.endsWith("/api")) {
    raw = `${raw}/api`;
  }
  return raw;
}

export function setApiBaseUrl(url: string): void {
  let clean = url.trim().replace(/\/+$/, "");
  if (clean) {
    localStorage.setItem(API_URL_KEY, clean);
  } else {
    localStorage.removeItem(API_URL_KEY);
  }
}

export function clearApiBaseUrl(): void {
  localStorage.removeItem(API_URL_KEY);
}

export async function checkApiHealth(customUrl?: string): Promise<{ ok: boolean; status: number; message: string }> {
  try {
    let target = customUrl ? customUrl.trim().replace(/\/+$/, "") : getApiBaseUrl();
    if (target !== "/api" && !target.endsWith("/api")) {
      target = `${target}/api`;
    }
    
    // First try target with /health
    let res: Response;
    try {
      res = await fetch(`${target}/health`, { method: "GET" });
    } catch {
      // Fallback try without /api suffix
      const rootUrl = target.replace(/\/api$/, "");
      res = await fetch(`${rootUrl}/health`, { method: "GET" });
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      return {
        ok: false,
        status: res.status,
        message: "Server returned HTML instead of API JSON. Ensure this is your Render FastAPI URL (e.g. https://...onrender.com), not your static frontend URL.",
      };
    }

    if (res.ok) {
      try {
        const data = await res.json();
        return { ok: true, status: res.status, message: data.service || "Connected" };
      } catch {
        return { ok: false, status: res.status, message: "Response was not valid JSON." };
      }
    }
    return { ok: false, status: res.status, message: `Server returned HTTP ${res.status}` };
  } catch (err: any) {
    let msg = err.message || "Failed to reach server.";
    if (msg === "Failed to fetch" || msg.includes("Failed to fetch")) {
      msg = "Cannot reach this URL (Failed to fetch). Please check your Render Dashboard and copy the exact URL under your service name (Render often appends random letters, e.g. -xxxx.onrender.com).";
    }
    return { ok: false, status: 0, message: msg };
  }
}

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
  role?: string;
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

  const baseUrl = getApiBaseUrl();
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkErr: any) {
    // Notify application of network failure
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("onlybooks:api_network_error", {
        detail: { endpoint, baseUrl, originalError: networkErr.message }
      }));
    }
    throw new Error(
      `Cannot connect to academic server at ${baseUrl}. Ensure backend is running and CORS is configured.`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const isHtml = contentType.includes("text/html");

  if (!response.ok || isHtml) {
    if (
      response.status === 401 &&
      endpoint !== "/auth/login" &&
      endpoint !== "/auth/register" &&
      endpoint !== "/auth/sso"
    ) {
      clearStoredToken();
    }

    let errorDetail = "An error occurred with the academic server.";
    const isDefault = baseUrl === "/api";
    const isRemote = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";

    if (isHtml || response.status === 404) {
      if (isDefault && isRemote) {
        errorDetail = `Backend API not reached (HTTP ${response.status} at ${endpoint}). The deployed frontend is attempting to call relative "/api", but no backend URL is configured. Please enter your Render Backend URL in the Server Settings banner below.`;
      } else if (isHtml) {
        errorDetail = `Expected API response but received HTML from "${baseUrl}${endpoint}". Please verify that your Backend URL points to your Render FastAPI web service (e.g. https://...onrender.com), not your static frontend site.`;
      } else {
        errorDetail = `Endpoint not found (HTTP 404 at ${baseUrl}${endpoint}). Verify the backend service is deployed and active.`;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("onlybooks:api_404", {
          detail: { endpoint, baseUrl }
        }));
      }
    } else {
      try {
        const errorJson = await response.json();
        if (errorJson.detail) {
          errorDetail = errorJson.detail;
        }
      } catch {
        errorDetail = response.statusText || errorDetail;
      }
    }
    throw new Error(errorDetail);
  }

  try {
    return await response.json();
  } catch (parseErr: any) {
    throw new Error(`Failed to parse JSON response from ${baseUrl}${endpoint}: ${parseErr.message}`);
  }
}

export const authApi = {
  async sendOtp(email: string): Promise<{ success: boolean; message: string; otp?: string; is_simulated?: boolean; smtp_debug?: string }> {
    return request<{ success: boolean; message: string; otp?: string; is_simulated?: boolean; smtp_debug?: string }>("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async verifyOtp(email: string, otp: string): Promise<{ verified: boolean; message: string }> {
    return request<{ verified: boolean; message: string }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  },

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

export interface CatalogMetrics {
  total_documents: number;
  total_papers: number;
  total_theses: number;
  total_reserves: number;
  total_press: number;
  last_sync: string;
}

export interface CatalogDocument {
  id: string;
  title: string;
  author: string;
  year: string;
  field: string;
  collection_id: string;
  collection_name?: string;
  call_number: string;
  doi?: string;
  journal_or_press?: string;
  total_pages: number;
  pages_label: string;
}

export interface CatalogSection {
  id: string;
  chapter_num: string;
  chapter_title: string;
  start_page: number;
  end_page: number;
  content_text?: string;
}

export interface CatalogDocumentDetail extends CatalogDocument {
  sections: CatalogSection[];
}

export interface AcquisitionsResponse {
  items: CatalogDocument[];
  total: number;
  collection_filter: string;
}

export const catalogApi = {
  async getMetrics(): Promise<CatalogMetrics> {
    return request<CatalogMetrics>("/catalog/metrics", { method: "GET" });
  },

  async getAcquisitions(
    collection?: string,
    search?: string,
    sortBy?: string,
    yearFrom?: string,
    yearTo?: string,
    limit?: number,
    offset?: number
  ): Promise<AcquisitionsResponse> {
    const params = new URLSearchParams();
    if (collection && collection !== "all") params.append("collection", collection);
    if (search && search.trim()) params.append("search", search.trim());
    if (sortBy) params.append("sort_by", sortBy);
    if (yearFrom && yearFrom.trim()) params.append("year_from", yearFrom.trim());
    if (yearTo && yearTo.trim()) params.append("year_to", yearTo.trim());
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<AcquisitionsResponse>(`/catalog/acquisitions${query}`, { method: "GET" });
  },

  async getDocument(docId: string): Promise<CatalogDocumentDetail> {
    return request<CatalogDocumentDetail>(`/catalog/documents/${docId}`, { method: "GET" });
  },

  async deposit(payload: DocumentDepositRequest): Promise<DocumentDepositResponse> {
    return request<DocumentDepositResponse>("/catalog/deposit", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async uploadFile(formData: FormData): Promise<DocumentDepositResponse> {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/catalog/upload`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!response.ok) {
      let errDetail = "Failed to upload document file.";
      try {
        const errJson = await response.json();
        if (errJson.detail) errDetail = errJson.detail;
      } catch {
        errDetail = response.statusText || errDetail;
      }
      throw new Error(errDetail);
    }
    return response.json();
  },
};

export interface DocumentDepositRequest {
  title: string;
  author: string;
  year: string;
  field: string;
  collection_id: string;
  call_number?: string;
  doi?: string;
  journal_or_press?: string;
  total_pages?: number;
  content_text?: string;
}

export interface DocumentDepositResponse {
  document_id: string;
  title: string;
  author: string;
  year: string;
  collection_id: string;
  collection_name: string;
  call_number: string;
  total_pages: number;
  sections_count: number;
  indexed: boolean;
  message: string;
}

export interface InquiryRequest {
  question: string;
  collection_filter?: string;
  user_id?: string;
  top_k?: number;
}

export interface CitationItem {
  id: number;
  marker: string; // Unicode superscript e.g. "¹", "²"
  document_id: string;
  title: string;
  author: string;
  year: string;
  journal?: string;
  call_number: string;
  collection_type: string;
  page: string;
  extracted_quote: string;
  confidence_score: number;
}

export interface SynthesisParagraph {
  text: string;
}

export interface SynthesisResponse {
  inquiry_id: string;
  question: string;
  summary_byline: string;
  paragraphs: SynthesisParagraph[];
  citations: CitationItem[];
  attribution_score: number;
}

export interface InquirySummaryItem {
  id: string;
  question: string;
  collection_filter?: string;
  summary_byline?: string;
  citations_count: number;
  attribution_score: number;
  timestamp: string;
}

export interface InquiryHistoryResponse {
  items: InquirySummaryItem[];
  total: number;
}

export interface StreamEventMetadata {
  event: "metadata";
  inquiry_id: string;
  question: string;
  summary_byline: string;
  attribution_score: number;
  total_citations: number;
}

export interface StreamEventDone {
  event: "done";
  inquiry_id: string;
  summary_byline: string;
  attribution_score: number;
  total_paragraphs: number;
  total_citations: number;
}

export const inquiryApi = {
  async synthesize(payload: InquiryRequest): Promise<SynthesisResponse> {
    return request<SynthesisResponse>("/inquiries/synthesize", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getSavedInquiry(inquiryId: string): Promise<SynthesisResponse> {
    return request<SynthesisResponse>(`/inquiries/${inquiryId}`, {
      method: "GET",
    });
  },

  async getHistory(limit: number = 25): Promise<InquiryHistoryResponse> {
    return request<InquiryHistoryResponse>(`/inquiries?limit=${limit}`, {
      method: "GET",
    });
  },

  async getBibtex(inquiryId: string): Promise<string> {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/inquiries/${inquiryId}/bibtex`, {
      method: "GET",
      headers,
    });
    if (!response.ok) {
      throw new Error("Failed to export BibTeX citations.");
    }
    return response.text();
  },

  synthesizeStream(
    payload: InquiryRequest,
    callbacks: {
      onMetadata?: (meta: StreamEventMetadata) => void;
      onCitations?: (citations: CitationItem[]) => void;
      onToken?: (token: string, paragraphIdx: number) => void;
      onParagraphBreak?: (paragraphIdx: number) => void;
      onDone?: (done: StreamEventDone) => void;
      onError?: (err: Error) => void;
    }
  ): () => void {
    const controller = new AbortController();
    const token = getStoredToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/inquiries/synthesize/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }
        if (!response.body) {
          throw new Error("No response body received for streaming.");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const chunk of lines) {
            const trimmed = chunk.trim();
            if (!trimmed.startsWith("data: ")) continue;
            try {
              const eventData = JSON.parse(trimmed.slice(6));
              switch (eventData.event) {
                case "metadata":
                  callbacks.onMetadata?.(eventData);
                  break;
                case "citations":
                  callbacks.onCitations?.(eventData.citations);
                  break;
                case "token":
                  callbacks.onToken?.(eventData.token, eventData.paragraph_idx);
                  break;
                case "paragraph_break":
                  callbacks.onParagraphBreak?.(eventData.paragraph_idx);
                  break;
                case "done":
                  callbacks.onDone?.(eventData);
                  break;
              }
            } catch (e) {
              console.warn("Failed to parse SSE event chunk:", e, trimmed);
            }
          }
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          callbacks.onError?.(err);
        }
      });

    return () => controller.abort();
  },
};

export interface ReadingRoomBlock {
  type: "heading" | "paragraph" | "highlight" | "blockquote" | "rule";
  text?: string;
  page_ref?: string;
}

export interface ReadingRoomSection {
  chapter_num: string;
  chapter_title: string;
  start_page: number;
  end_page: number;
  blocks: ReadingRoomBlock[];
}

export interface ReadingRoomResponse {
  document_id: string;
  title: string;
  author: string;
  call_number: string;
  collection_type: string;
  total_pages: number;
  active_page: number;
  active_chapter: string;
  sections: ReadingRoomSection[];
}

export interface RawPageResponse {
  document_id: string;
  title: string;
  page_number: number;
  chapter_title: string;
  text_content: string;
}

export const readingRoomApi = {
  async getReadingRoom(
    docId: string,
    page?: number,
    citationId?: number,
    highlightQuote?: string
  ): Promise<ReadingRoomResponse> {
    const params = new URLSearchParams();
    if (page !== undefined && page !== null) params.append("page", page.toString());
    if (citationId !== undefined && citationId !== null) params.append("citation_id", citationId.toString());
    if (highlightQuote && highlightQuote.trim()) params.append("highlight_quote", highlightQuote.trim());
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<ReadingRoomResponse>(`/documents/${docId}/reading-room${query}`, {
      method: "GET",
    });
  },

  async getRawPage(docId: string, pageNum: number): Promise<RawPageResponse> {
    return request<RawPageResponse>(`/documents/${docId}/raw-page/${pageNum}`, {
      method: "GET",
    });
  },
};

