export type IssueType =
  | "wrong_text"
  | "wrong_translation"
  | "wrong_definition"
  | "wrong_audio"
  | "other";

export type ReportStatus = "open" | "triaged" | "resolved" | "dismissed";

export interface ProblemReport {
  id: string;
  user_id: string;
  issue_type: IssueType;
  location: string;
  status: ReportStatus;
  language: string | null;
  message: string | null;
  target: Record<string, unknown>;
  client_context: Record<string, unknown>;
  duplicate_count: number;
  resolution_note: string | null;
  resolved_at: string | null;
  last_reported_at: string;
  created_at: string;
  updated_at: string;
}

export interface ReportList {
  items: ProblemReport[];
  total: number;
  limit: number;
  offset: number;
}

export type YoutubeTranscriptionCacheStatus =
  | "all"
  | "missing"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "needs_review";

export type MediaProvider =
  | "deepgram"
  | "assemblyai"
  | "openai"
  | "whisper"
  | "qwen"
  | "qwen+alignment";

export interface YoutubeTranscriptionCacheVideo {
  video_id: string;
  source_url: string;
  gcs_object_key: string;
  title: string;
  channel: string;
  language: string;
  duration_seconds: number | null;
  audio_updated_at: string | null;
  status: Exclude<YoutubeTranscriptionCacheStatus, "all">;
  provider: string;
  provider_model: string;
  payload_object_key: string;
  transcript_text: string;
  reviewed_at: string | null;
  error_detail: string | null;
  transcription_updated_at: string | null;
}

export interface YoutubeTranscriptionCacheVideoList {
  videos: YoutubeTranscriptionCacheVideo[];
}

export interface YoutubeTranscriptionCacheRunResponse {
  accepted: boolean;
  requested: number;
  queued: number;
  skipped: number;
  missing: number;
  video_ids: string[];
  skipped_video_ids: string[];
  missing_video_ids: string[];
}

export const ISSUE_TYPES: IssueType[] = [
  "wrong_text",
  "wrong_translation",
  "wrong_definition",
  "wrong_audio",
  "other",
];

export const STATUSES: ReportStatus[] = [
  "open",
  "triaged",
  "resolved",
  "dismissed",
];

export const YOUTUBE_CACHE_STATUSES: YoutubeTranscriptionCacheStatus[] = [
  "all",
  "missing",
  "queued",
  "running",
  "succeeded",
  "failed",
  "needs_review",
];

export const MEDIA_PROVIDERS: MediaProvider[] = [
  "whisper",
  "openai",
  "qwen",
  "qwen+alignment",
  "assemblyai",
  "deepgram",
];
