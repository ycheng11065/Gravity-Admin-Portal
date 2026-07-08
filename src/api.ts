import { supabase } from "./supabase";
import type {
  MediaProvider,
  ProblemReport,
  ReportList,
  ReportStatus,
  YoutubeTranscriptionCacheRunResponse,
  YoutubeTranscriptionCacheStatus,
  YoutubeTranscriptionCacheVideo,
  YoutubeTranscriptionCacheVideoList,
} from "./types";
import { DEMO, demoReports, demoYoutubeCacheVideos } from "./demo";

const BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

let demoState: ProblemReport[] = demoReports.map((r) => ({ ...r }));
let demoYoutubeState: YoutubeTranscriptionCacheVideo[] =
  demoYoutubeCacheVideos.map((v) => ({ ...v }));

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

export interface YoutubeCacheListParams {
  status?: YoutubeTranscriptionCacheStatus;
  limit?: number;
}

export async function listYoutubeTranscriptionCacheVideos(
  params: YoutubeCacheListParams,
): Promise<YoutubeTranscriptionCacheVideoList> {
  if (DEMO) {
    const status = params.status ?? "all";
    const limit = params.limit ?? 50;
    const videos = demoYoutubeState
      .filter((v) => status === "all" || v.status === status)
      .slice(0, limit);
    return { videos };
  }

  const qs = new URLSearchParams();
  qs.set("limit", String(params.limit ?? 50));
  if (params.status) qs.set("status", params.status);
  const res = await fetch(
    `${BASE}/api/admin/youtube-transcription-cache/videos?${qs}`,
    { headers: await authHeaders() },
  );
  return handle<YoutubeTranscriptionCacheVideoList>(res);
}

export async function getYoutubeTranscriptionCacheVideo(
  videoId: string,
): Promise<YoutubeTranscriptionCacheVideo> {
  if (DEMO) {
    const video = demoYoutubeState.find((v) => v.video_id === videoId);
    if (!video) throw new Error("Demo video not found.");
    return { ...video };
  }
  const res = await fetch(
    `${BASE}/api/admin/youtube-transcription-cache/videos/${encodeURIComponent(
      videoId,
    )}`,
    { headers: await authHeaders() },
  );
  return handle<YoutubeTranscriptionCacheVideo>(res);
}

export async function runYoutubeTranscriptionCache(
  input: {
    video_ids: string[];
    provider: MediaProvider;
    replace: boolean;
  },
): Promise<YoutubeTranscriptionCacheRunResponse> {
  if (DEMO) {
    const found = new Set(demoYoutubeState.map((v) => v.video_id));
    const missing = input.video_ids.filter((id) => !found.has(id));
    const skipped = demoYoutubeState
      .filter(
        (v) =>
          input.video_ids.includes(v.video_id) &&
          v.status === "succeeded" &&
          !input.replace,
      )
      .map((v) => v.video_id);
    const queued = input.video_ids.filter(
      (id) => found.has(id) && !skipped.includes(id),
    );
    demoYoutubeState = demoYoutubeState.map((v) =>
      queued.includes(v.video_id)
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
      requested: input.video_ids.length,
      queued: queued.length,
      skipped: skipped.length,
      missing: missing.length,
      video_ids: queued,
      skipped_video_ids: skipped,
      missing_video_ids: missing,
    };
  }

  const res = await fetch(`${BASE}/api/admin/youtube-transcription-cache/runs`, {
    method: "POST",
    headers: { ...(await authHeaders()), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handle<YoutubeTranscriptionCacheRunResponse>(res);
}
