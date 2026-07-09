import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getMediaTranscriptionCacheItem,
  listMediaTranscriptionCacheItems,
  runMediaTranscriptionCache,
} from "./api";
import {
  MEDIA_PROVIDERS,
  MEDIA_TRANSCRIPTION_CACHE_STATUSES,
  type MediaProvider,
  type MediaTranscriptionCacheItem,
  type MediaTranscriptionCacheRunResponse,
  type MediaTranscriptionCacheStatus,
} from "./types";

const DEFAULT_LIMIT = 50;

export function MediaTranscriptionCache() {
  const [status, setStatus] =
    useState<MediaTranscriptionCacheStatus>("missing");
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [provider, setProvider] = useState<MediaProvider>("whisper");
  const [replace, setReplace] = useState(false);
  const [items, setItems] = useState<MediaTranscriptionCacheItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<MediaTranscriptionCacheItem | null>(
    null,
  );
  const [runResult, setRunResult] =
    useState<MediaTranscriptionCacheRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.media_id)),
    [items, selectedIds],
  );
  const allVisibleSelected =
    items.length > 0 && items.every((item) => selectedIds.has(item.media_id));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listMediaTranscriptionCacheItems({ status, limit });
      setItems(res.items);
      setSelectedIds((current) => {
        const visible = new Set(res.items.map((item) => item.media_id));
        return new Set([...current].filter((id) => visible.has(id)));
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [limit, status]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleAll() {
    setSelectedIds(
      allVisibleSelected ? new Set() : new Set(items.map((item) => item.media_id)),
    );
  }

  function toggleOne(mediaId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(mediaId)) {
        next.delete(mediaId);
      } else {
        next.add(mediaId);
      }
      return next;
    });
  }

  async function refreshActive(mediaId: string) {
    try {
      const item = await getMediaTranscriptionCacheItem(mediaId);
      setActive(item);
      setItems((rows) =>
        rows.map((row) => (row.media_id === item.media_id ? item : row)),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function runSelected() {
    setRunning(true);
    setError(null);
    setRunResult(null);
    try {
      const res = await runMediaTranscriptionCache({
        sources: selectedItems.map((item) => ({
          source_type: item.source_type,
          external_id: item.external_id,
        })),
        provider,
        replace,
      });
      setRunResult(res);
      await load();
      if (active) await refreshActive(active.media_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="sub-layout">
      <div className="toolbar">
        <select
          value={status}
          onChange={(e) => {
            setSelectedIds(new Set());
            setActive(null);
            setStatus(e.target.value as MediaTranscriptionCacheStatus);
          }}
        >
          {MEDIA_TRANSCRIPTION_CACHE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
        >
          {[25, 50, 100, 200].map((n) => (
            <option key={n} value={n}>
              {n} rows
            </option>
          ))}
        </select>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as MediaProvider)}
        >
          {MEDIA_PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <label className="check-row">
          <input
            type="checkbox"
            checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
          />
          Replace succeeded
        </label>
        <button onClick={load} disabled={loading || running}>
          {loading ? "…" : "Refresh"}
        </button>
        <button
          onClick={runSelected}
          disabled={running || selectedIds.size === 0}
        >
          {running ? "Queuing…" : `Run selected (${selectedIds.size})`}
        </button>
        <span className="spacer" />
        <span className="muted">{items.length} loaded</span>
      </div>

      {error && <div className="error bar">{error}</div>}
      {runResult && (
        <div className="notice bar">
          Queued {runResult.queued} of {runResult.requested}. Skipped{" "}
          {runResult.skipped}; missing {runResult.missing}.
        </div>
      )}

      <div className="split">
        <table className="reports media-transcription-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                  aria-label="Select all visible media items"
                />
              </th>
              <th>Source</th>
              <th>Status</th>
              <th>Title</th>
              <th>Channel / Show</th>
              <th>Duration</th>
              <th>Provider</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.media_id}
                className={active?.media_id === item.media_id ? "active" : ""}
                onClick={() => setActive(item)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.media_id)}
                    onChange={() => toggleOne(item.media_id)}
                    aria-label={`Select ${item.media_id}`}
                  />
                </td>
                <td>{formatSource(item.source_type)}</td>
                <td>
                  <span className={`pill ${item.status}`}>{item.status}</span>
                </td>
                <td className="clip-cell" title={item.title || item.media_id}>
                  {item.title || item.media_id}
                </td>
                <td className="clip-cell" title={item.channel}>
                  {item.channel || "-"}
                </td>
                <td>{formatDuration(item.duration_seconds)}</td>
                <td>{item.provider || "-"}</td>
                <td>{formatDate(item.transcription_updated_at)}</td>
              </tr>
            ))}
            {!items.length && !loading && (
              <tr>
                <td colSpan={8} className="muted center-cell">
                  No media items.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {active && (
          <MediaTranscriptionDetail
            item={active}
            selected={selectedIds.has(active.media_id)}
            onToggle={() => toggleOne(active.media_id)}
            onRefresh={() => refreshActive(active.media_id)}
            onClose={() => setActive(null)}
          />
        )}
      </div>

      {selectedItems.length > 0 && (
        <footer className="pager">
          <span className="muted">
            Selected: {selectedItems.map((item) => item.media_id).join(", ")}
          </span>
        </footer>
      )}
    </div>
  );
}

function MediaTranscriptionDetail({
  item,
  selected,
  onToggle,
  onRefresh,
  onClose,
}: {
  item: MediaTranscriptionCacheItem;
  selected: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  onClose: () => void;
}) {
  return (
    <aside className="detail">
      <div className="detail-head">
        <span className={`pill ${item.status}`}>{item.status}</span>
        <span className="spacer" />
        <button className="link" onClick={onRefresh}>
          Refresh
        </button>
        <button className="link" onClick={onClose}>
          Close
        </button>
      </div>

      <h2>{item.title || item.media_id}</h2>
      <div className="muted">{item.channel || "No channel or show"}</div>

      <div className="row wrap detail-actions">
        <button onClick={onToggle}>{selected ? "Deselect" : "Select"}</button>
        {item.source_url && (
          <a
            className="button-link"
            href={item.source_url}
            target="_blank"
            rel="noreferrer"
          >
            Open source
          </a>
        )}
      </div>

      {item.error_detail && <div className="error message">{item.error_detail}</div>}

      <dl className="meta">
        <dt>Media id</dt>
        <dd>{item.media_id}</dd>
        <dt>Source type</dt>
        <dd>{formatSource(item.source_type)}</dd>
        <dt>External id</dt>
        <dd>{item.external_id}</dd>
        <dt>Language</dt>
        <dd>{item.language}</dd>
        <dt>Duration</dt>
        <dd>{formatDuration(item.duration_seconds)}</dd>
        <dt>Provider</dt>
        <dd>{item.provider || "-"}</dd>
        <dt>Model</dt>
        <dd>{item.provider_model || "-"}</dd>
        <dt>Audio object</dt>
        <dd>{item.gcs_object_key || "-"}</dd>
        <dt>Payload object</dt>
        <dd>{item.payload_object_key || "-"}</dd>
        <dt>Audio updated</dt>
        <dd>{formatDate(item.audio_updated_at)}</dd>
        <dt>Transcript updated</dt>
        <dd>{formatDate(item.transcription_updated_at)}</dd>
        <dt>Reviewed</dt>
        <dd>{formatDate(item.reviewed_at ?? null)}</dd>
      </dl>

      <div className="field">
        <label>Transcript preview</label>
        <pre>{item.transcript_text || "No transcript cached."}</pre>
      </div>
    </aside>
  );
}

function formatSource(value: string): string {
  return value.replace(/_/g, " ");
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatDuration(value: number | null): string {
  if (value == null) return "-";
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}
