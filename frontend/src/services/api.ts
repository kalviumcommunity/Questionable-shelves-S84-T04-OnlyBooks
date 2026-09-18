// OnlyBooks Frontend API Service

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

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
    if (
      response.status === 401 &&
      endpoint !== "/auth/login" &&
      endpoint !== "/auth/register" &&
      endpoint !== "/auth/sso"
    ) {
      clearStoredToken();
    }
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

  async getAcquisitions(collection?: string, search?: string): Promise<AcquisitionsResponse> {
    const params = new URLSearchParams();
    if (collection && collection !== "all") params.append("collection", collection);
    if (search && search.trim()) params.append("search", search.trim());
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
    const response = await fetch(`${API_BASE_URL}/catalog/upload`, {
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
    const response = await fetch(`${API_BASE_URL}/inquiries/${inquiryId}/bibtex`, {
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

    fetch(`${API_BASE_URL}/inquiries/synthesize/stream`, {
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

