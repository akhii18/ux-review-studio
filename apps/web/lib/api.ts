const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `Request failed: ${res.status}`);
  }
  const json = await res.json();
  return json.data ?? json;
}

// ── Reviews ───────────────────────────────────────────────────────────────────

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
  depth?: string;
  confidenceThreshold?: number;
}) {
  return request<any>("/api/reviews", { method: "POST", body: JSON.stringify(data) });
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

export function startReview(id: string) {
  return request<any>(`/api/reviews/${id}/start`, { method: "POST" });
}

export function getReviewProgress(id: string) {
  return request<{ status: string; stage: string | null; uxScore: number | null; findingCount: number }>(
    `/api/reviews/${id}/progress`
  );
}

export function getAnalytics() {
  return request<any>("/api/reviews/analytics");
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
