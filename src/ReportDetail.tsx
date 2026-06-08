import { useEffect, useState } from "react";
import { STATUSES, type ProblemReport, type ReportStatus } from "./types";

export function ReportDetail({
  report,
  onClose,
  onUpdate,
}: {
  report: ProblemReport;
  onClose: () => void;
  onUpdate: (
    id: string,
    patch: { status?: ReportStatus; resolution_note?: string },
  ) => Promise<void>;
}) {
  const [note, setNote] = useState(report.resolution_note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNote(report.resolution_note ?? "");
    setError(null);
  }, [report.id, report.resolution_note]);

  async function run(patch: {
    status?: ReportStatus;
    resolution_note?: string;
  }) {
    setBusy(true);
    setError(null);
    try {
      await onUpdate(report.id, patch);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="detail">
      <div className="detail-head">
        <span className={`pill ${report.status}`}>{report.status}</span>
        <span className="spacer" />
        <button className="link" onClick={onClose}>
          Close
        </button>
      </div>

      <h2>{report.issue_type}</h2>
      <div className="muted">{report.location}</div>

      {report.message && <p className="message">{report.message}</p>}

      <Field label="Set status">
        <div className="row wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              disabled={busy || s === report.status}
              onClick={() => run({ status: s })}
            >
              {s}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Resolution note">
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What was done / decided…"
        />
        <button
          disabled={busy || note === (report.resolution_note ?? "")}
          onClick={() => run({ resolution_note: note })}
        >
          Save note
        </button>
      </Field>

      {error && <div className="error">{error}</div>}

      <Field label="Target">
        <pre>{JSON.stringify(report.target, null, 2)}</pre>
      </Field>
      <Field label="Client context">
        <pre>{JSON.stringify(report.client_context, null, 2)}</pre>
      </Field>

      <dl className="meta">
        <dt>Report id</dt>
        <dd>{report.id}</dd>
        <dt>User id</dt>
        <dd>{report.user_id}</dd>
        <dt>Duplicates</dt>
        <dd>{report.duplicate_count}</dd>
        <dt>Created</dt>
        <dd>{new Date(report.created_at).toLocaleString()}</dd>
        <dt>Resolved</dt>
        <dd>
          {report.resolved_at
            ? new Date(report.resolved_at).toLocaleString()
            : "—"}
        </dd>
      </dl>
    </aside>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}
