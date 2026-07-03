const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
      ...init,
    });
  } catch {
    throw new Error(`Unable to reach API at ${BASE}. Ensure backend is running and CORS is configured.`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Request failed: ${res.status}`);
  }
  const json = await res.json();
  return json.data ?? json;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export function signup(data: { name: string; email: string; password: string }) {
  return request<{ message: string; verificationLink?: string }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function signin(data: { email: string; password: string }) {
  return request<{
    token: string;
    expiresInSeconds: number;
    user: { id: string; name: string; email: string };
  }>("/api/auth/signin", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function me() {
  return request<{ id: string; name: string; email: string; createdAt: string }>("/api/auth/me");
}

export function updateMe(data: { name: string }) {
  return request<{
    token: string;
    expiresInSeconds: number;
    user: { id: string; name: string; email: string; createdAt: string };
  }>("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function resetPassword(token: string, password: string) {
  return request<{ message: string }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export type ReviewDepth = "quick" | "standard" | "deep";

export function listReviews() {
  return request<any[]>("/api/reviews");
}

export function getReview(id: string) {
  return request<any>(`/api/reviews/${id}`);
}

export function createReview(data: {
  name: string;
  product: string;
  domain?: string;
  reviewType?: string;
  owner?: string;
  criteria?: string[];
  depth?: ReviewDepth;
  confidenceThreshold?: number;
}) {
  return request<any>("/api/reviews", { method: "POST", body: JSON.stringify(data) });
}

export function saveReviewDraft(data: {
  reviewId?: string;
  name: string;
  product: string;
  domain?: string;
  reviewType?: string;
  owner?: string;
  criteria?: string[];
  depth?: ReviewDepth;
  confidenceThreshold?: number;
  stage?: string;
  assets?: Array<{
    name: string;
    mimeType: string;
    base64Data?: string;
    blobUrl?: string;
    contentText?: string;
    sizeBytes?: number;
  }>;
}) {
  return request<any>("/api/reviews/draft", { method: "POST", body: JSON.stringify(data) });
}

export function deleteReview(id: string) {
  return request<void>(`/api/reviews/${id}`, { method: "DELETE" });
}

export function saveAsset(reviewId: string, asset: {
  name: string;
  mimeType: string;
  base64Data?: string;
  blobUrl?: string;
  contentText?: string;
  sizeBytes?: number;
}) {
  return request<any>(`/api/reviews/${reviewId}/assets`, { method: "POST", body: JSON.stringify(asset) });
}

export function convertLegacyDocAsset(payload: {
  name: string;
  mimeType: string;
  base64Data: string;
}) {
  return request<{ markdown: string; images: Array<{ name: string; mimeType: string; base64Data: string; sizeBytes: number }> }>(
    "/api/reviews/convert-legacy-doc",
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export function startReview(id: string) {
  return request<any>(`/api/reviews/${id}/start`, { method: "POST" });
}

export function exportReviewReport(id: string) {
  return request<{ id: string; name: string; contentMd: string; executiveSummary: string; status: string }>(
    `/api/reviews/${id}/export`,
    { method: "POST" }
  );
}

export function getReviewProgress(id: string) {
  return request<{ status: string; stage: string | null; uxScore: number | null; findingCount: number }>(
    `/api/reviews/${id}/progress`
  );
}

export function getAnalytics(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request<any>(`/api/reviews/analytics${qs}`);
}

// ── Findings ──────────────────────────────────────────────────────────────────

export function getFindings(reviewId: string, params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request<any>(`/api/reviews/${reviewId}/findings${qs}`);
}

export function getFindingsGrouped(reviewId: string) {
  return request<any>(`/api/reviews/${reviewId}/findings/grouped`);
}

export function triageFinding(id: string, payload: { action: string; notes?: string }) {
  return request<any>(`/api/findings/${id}/triage`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function updateFinding(id: string, data: Record<string, unknown>) {
  return request<any>(`/api/findings/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

// ── Principles ────────────────────────────────────────────────────────────────

export function listPrinciples(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request<any[]>(`/api/principles${qs}`);
}

// ── Settings ─────────────────────────────────────────────────────────────────

export function getSettings() {
  return request<Record<string, any>>("/api/settings");
}

export function updateSettings(data: Record<string, unknown>) {
  return request<any>("/api/settings", { method: "PATCH", body: JSON.stringify(data) });
}

// ── Deferred Social/SSO hooks ────────────────────────────────────────────────

export function verifyEmail(token: string) {
  return request<{ message: string; email: string; name: string }>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
}

export async function exchangeAppleIdToken(_idToken: string, _email?: string, _name?: string) {
  throw new Error("Apple login is currently disabled");
}

export async function exchangeEntraIdToken(_idToken: string) {
  throw new Error("SSO login is currently disabled");
}
