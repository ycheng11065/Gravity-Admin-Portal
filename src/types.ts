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
