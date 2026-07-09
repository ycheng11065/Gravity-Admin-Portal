import { supabase } from "./supabase";
import type {
  MediaProvider,
  MediaTranscriptionCacheItem,
  MediaTranscriptionCacheItemList,
  MediaTranscriptionCacheRunResponse,
  MediaTranscriptionCacheSource,
  MediaTranscriptionCacheStatus,
  ProblemReport,
  ReportList,
  ReportStatus,
} from "./types";
import { DEMO, demoMediaTranscriptionItems, demoReports } from "./demo";

const BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

let demoState: ProblemReport[] = demoReports.map((r) => ({ ...r }));
let demoMediaTranscriptionState: MediaTranscriptionCacheItem[] =
  demoMediaTranscriptionItems.map((v) => ({ ...v }));

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");
  return { Authorization: `Bearer ${token}` };
}

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  let detail = res.statusText;
  try {
    const body = await res.json();
    detail = body?.detail?.detail ?? body?.detail ?? detail;
  } catch {
    /* keep statusText */
  }
  if (res.status === 403) throw new Error("This account is not an admin.");
  throw new Error(`${res.status}: ${detail}`);
}

export interface ListParams {
  status?: ReportStatus;
  issue_type?: string;
  limit?: number;
  offset?: number;
}

export async function listReports(params: ListParams): Promise<ReportList> {
  if (DEMO) {
    const filtered = demoState.filter(
      (r) =>
        (!params.status || r.status === params.status) &&
        (!params.issue_type || r.issue_type === params.issue_type),
    );
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 50;
    return {
      items: filtered.slice(offset, offset + limit),
      total: filtered.length,
      limit,
      offset,
    };
  }
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.issue_type) qs.set("issue_type", params.issue_type);
  qs.set("limit", String(params.limit ?? 50));
  qs.set("offset", String(params.offset ?? 0));
  const res = await fetch(`${BASE}/api/admin/problem-reports?${qs}`, {
    headers: await authHeaders(),
  });
  return handle<ReportList>(res);
}

export async function updateReport(
  id: string,
  patch: { status?: ReportStatus; resolution_note?: string },
): Promise<ProblemReport> {
  if (DEMO) {
    demoState = demoState.map((r) =>
      r.id === id
        ? {
            ...r,
            ...patch,
            resolved_at:
              patch.status === "resolved"
                ? new Date().toISOString()
                : patch.status
                  ? null
                  : r.resolved_at,
            updated_at: new Date().toISOString(),
          }
        : r,
    );
    return demoState.find((r) => r.id === id)!;
  }
  const res = await fetch(`${BASE}/api/admin/problem-reports/${id}`, {
    method: "PATCH",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return handle<ProblemReport>(res);
}

export interface MediaTranscriptionCacheListParams {
  status?: MediaTranscriptionCacheStatus;
  limit?: number;
}

export async function listMediaTranscriptionCacheItems(
  params: MediaTranscriptionCacheListParams,
): Promise<MediaTranscriptionCacheItemList> {
  if (DEMO) {
    const status = params.status ?? "all";
    const limit = params.limit ?? 50;
    const items = demoMediaTranscriptionState
      .filter((v) => status === "all" || v.status === status)
      .slice(0, limit);
    return { items, videos: items };
  }

  const qs = new URLSearchParams();
  qs.set("limit", String(params.limit ?? 50));
  if (params.status) qs.set("status", params.status);
  const res = await fetch(
    `${BASE}/api/admin/media-transcription-cache/items?${qs}`,
    { headers: await authHeaders() },
  );
  return handle<MediaTranscriptionCacheItemList>(res);
}

export async function getMediaTranscriptionCacheItem(
  mediaId: string,
): Promise<MediaTranscriptionCacheItem> {
  if (DEMO) {
    const item = demoMediaTranscriptionState.find((v) => v.media_id === mediaId);
    if (!item) throw new Error("Demo media item not found.");
    return { ...item };
  }
  const res = await fetch(
    `${BASE}/api/admin/media-transcription-cache/items/${encodeURIComponent(
      mediaId,
    )}`,
    { headers: await authHeaders() },
  );
  return handle<MediaTranscriptionCacheItem>(res);
}

export async function runMediaTranscriptionCache(
  input: {
    sources: MediaTranscriptionCacheSource[];
    provider: MediaProvider;
    replace: boolean;
  },
): Promise<MediaTranscriptionCacheRunResponse> {
  if (DEMO) {
    const selected = input.sources.map((source) => `${source.source_type}:${source.external_id}`);
    const found = new Set(demoMediaTranscriptionState.map((v) => v.media_id));
    const missing = input.sources.filter((source) => !found.has(`${source.source_type}:${source.external_id}`));
    const skipped = demoMediaTranscriptionState
      .filter(
        (v) =>
          selected.includes(v.media_id) &&
          v.status === "succeeded" &&
          !input.replace,
      )
      .map((v) => ({ source_type: v.source_type, external_id: v.external_id }));
    const skippedIds = new Set(skipped.map((source) => `${source.source_type}:${source.external_id}`));
    const queued = input.sources.filter(
      (source) => found.has(`${source.source_type}:${source.external_id}`) && !skippedIds.has(`${source.source_type}:${source.external_id}`),
    );
    const queuedIds = new Set(queued.map((source) => `${source.source_type}:${source.external_id}`));
    demoMediaTranscriptionState = demoMediaTranscriptionState.map((v) =>
      queuedIds.has(v.media_id)
        ? {
            ...v,
            status: "queued",
            provider: input.provider,
            provider_model: "",
            error_detail: null,
            transcription_updated_at: new Date().toISOString(),
          }
        : v,
    );
    return {
      accepted: queued.length > 0,
      requested: input.sources.length,
      queued: queued.length,
      skipped: skipped.length,
      missing: missing.length,
      sources: queued,
      skipped_sources: skipped,
      missing_sources: missing,
      video_ids: queued.filter((source) => source.source_type === "youtube").map((source) => source.external_id),
      skipped_video_ids: skipped.filter((source) => source.source_type === "youtube").map((source) => source.external_id),
      missing_video_ids: missing.filter((source) => source.source_type === "youtube").map((source) => source.external_id),
    };
  }

  const res = await fetch(`${BASE}/api/admin/media-transcription-cache/runs`, {
    method: "POST",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<MediaTranscriptionCacheRunResponse>(res);
}
