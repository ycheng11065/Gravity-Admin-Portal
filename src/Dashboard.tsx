import { useCallback, useEffect, useState } from "react";
import { listReports, updateReport } from "./api";
import {
  ISSUE_TYPES,
  STATUSES,
  type ProblemReport,
  type ReportStatus,
} from "./types";
import { ReportDetail } from "./ReportDetail";
import { MediaTranscriptionCache } from "./MediaTranscriptionCache";

const PAGE_SIZE = 50;
type AdminView = "reports" | "media-transcription";

export function Dashboard({
  email,
  onSignOut,
}: {
  email: string;
  onSignOut: () => void;
}) {
  const [view, setView] = useState<AdminView>("reports");
  const [status, setStatus] = useState<ReportStatus | "">("open");
  const [issueType, setIssueType] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<ProblemReport[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<ProblemReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listReports({
        status: status || undefined,
        issue_type: issueType || undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setData(res.items);
      setTotal(res.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status, issueType, offset]);

  useEffect(() => {
    load();
  }, [load]);

  async function applyUpdate(
    id: string,
    patch: { status?: ReportStatus; resolution_note?: string },
  ) {
    const updated = await updateReport(id, patch);
    setData((rows) => rows.map((r) => (r.id === id ? updated : r)));
    setSelected(updated);
  }

  return (
    <div className="layout">
      <header className="topbar">
        <strong>Language Admin</strong>
        <nav className="tabs" aria-label="Admin sections">
          <button
            className={view === "reports" ? "active" : ""}
            onClick={() => setView("reports")}
          >
            Problem reports
          </button>
          <button
            className={view === "media-transcription" ? "active" : ""}
            onClick={() => setView("media-transcription")}
          >
            Media transcription
          </button>
        </nav>
        <span className="spacer" />
        <span className="muted">{email}</span>
        <button className="link" onClick={onSignOut}>
          Sign out
        </button>
      </header>

      {view === "media-transcription" ? (
        <MediaTranscriptionCache />
      ) : (
        <>
          <div className="toolbar">
        <select
          value={status}
          onChange={(e) => {
            setOffset(0);
            setStatus(e.target.value as ReportStatus | "");
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={issueType}
          onChange={(e) => {
            setOffset(0);
            setIssueType(e.target.value);
          }}
        >
          <option value="">All issue types</option>
          {ISSUE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button onClick={load} disabled={loading}>
          {loading ? "…" : "Refresh"}
        </button>
        <span className="spacer" />
        <span className="muted">{total} total</span>
          </div>

          {error && <div className="error bar">{error}</div>}

          <div className="split">
        <table className="reports">
          <thead>
            <tr>
              <th>Status</th>
              <th>Issue</th>
              <th>Location</th>
              <th>Lang</th>
              <th>Dup</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr
                key={r.id}
                className={selected?.id === r.id ? "active" : ""}
                onClick={() => setSelected(r)}
              >
                <td>
                  <span className={`pill ${r.status}`}>{r.status}</span>
                </td>
                <td>{r.issue_type}</td>
                <td>{r.location}</td>
                <td>{r.language ?? "—"}</td>
                <td>{r.duplicate_count}</td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {!data.length && !loading && (
              <tr>
                <td colSpan={6} className="muted center-cell">
                  No reports.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {selected && (
          <ReportDetail
            report={selected}
            onClose={() => setSelected(null)}
            onUpdate={applyUpdate}
          />
        )}
          </div>

          <footer className="pager">
        <button
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
        >
          ‹ Prev
        </button>
        <span className="muted">
          {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
        </span>
        <button
          disabled={offset + PAGE_SIZE >= total}
          onClick={() => setOffset(offset + PAGE_SIZE)}
        >
          Next ›
        </button>
          </footer>
        </>
      )}
    </div>
  );
}
