import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getYoutubeTranscriptionCacheVideo,
  listYoutubeTranscriptionCacheVideos,
  runYoutubeTranscriptionCache,
} from "./api";
import {
  MEDIA_PROVIDERS,
  YOUTUBE_CACHE_STATUSES,
  type MediaProvider,
  type YoutubeTranscriptionCacheRunResponse,
  type YoutubeTranscriptionCacheStatus,
  type YoutubeTranscriptionCacheVideo,
} from "./types";

const DEFAULT_LIMIT = 50;

export function YoutubeTranscriptionCache() {
  const [status, setStatus] =
    useState<YoutubeTranscriptionCacheStatus>("missing");
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [provider, setProvider] = useState<MediaProvider>("whisper");
  const [replace, setReplace] = useState(false);
  const [videos, setVideos] = useState<YoutubeTranscriptionCacheVideo[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<YoutubeTranscriptionCacheVideo | null>(
    null,
  );
  const [runResult, setRunResult] =
    useState<YoutubeTranscriptionCacheRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedVideos = useMemo(
    () => videos.filter((v) => selectedIds.has(v.video_id)),
    [videos, selectedIds],
  );
  const allVisibleSelected =
    videos.length > 0 && videos.every((v) => selectedIds.has(v.video_id));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listYoutubeTranscriptionCacheVideos({ status, limit });
      setVideos(res.videos);
      setSelectedIds((current) => {
        const visible = new Set(res.videos.map((v) => v.video_id));
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
      allVisibleSelected ? new Set() : new Set(videos.map((v) => v.video_id)),
    );
  }

  function toggleOne(videoId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  }

  async function refreshActive(videoId: string) {
    try {
      const video = await getYoutubeTranscriptionCacheVideo(videoId);
      setActive(video);
      setVideos((rows) =>
        rows.map((row) => (row.video_id === video.video_id ? video : row)),
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
      const res = await runYoutubeTranscriptionCache({
        video_ids: [...selectedIds],
        provider,
        replace,
      });
      setRunResult(res);
      await load();
      if (active) await refreshActive(active.video_id);
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
            setStatus(e.target.value as YoutubeTranscriptionCacheStatus);
          }}
        >
          {YOUTUBE_CACHE_STATUSES.map((s) => (
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
        <span className="muted">{videos.length} loaded</span>
      </div>

      {error && <div className="error bar">{error}</div>}
      {runResult && (
        <div className="notice bar">
          Queued {runResult.queued} of {runResult.requested}. Skipped{" "}
          {runResult.skipped}; missing {runResult.missing}.
        </div>
      )}

      <div className="split">
        <table className="reports youtube-cache-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                  aria-label="Select all visible videos"
                />
              </th>
              <th>Status</th>
              <th>Title</th>
              <th>Channel</th>
              <th>Duration</th>
              <th>Provider</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr
                key={video.video_id}
                className={active?.video_id === video.video_id ? "active" : ""}
                onClick={() => setActive(video)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(video.video_id)}
                    onChange={() => toggleOne(video.video_id)}
                    aria-label={`Select ${video.video_id}`}
                  />
                </td>
                <td>
                  <span className={`pill ${video.status}`}>{video.status}</span>
                </td>
                <td className="clip-cell" title={video.title || video.video_id}>
                  {video.title || video.video_id}
                </td>
                <td className="clip-cell" title={video.channel}>
                  {video.channel || "-"}
                </td>
                <td>{formatDuration(video.duration_seconds)}</td>
                <td>{video.provider || "-"}</td>
                <td>{formatDate(video.transcription_updated_at)}</td>
              </tr>
            ))}
            {!videos.length && !loading && (
              <tr>
                <td colSpan={7} className="muted center-cell">
                  No videos.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {active && (
          <YoutubeCacheDetail
            video={active}
            selected={selectedIds.has(active.video_id)}
            onToggle={() => toggleOne(active.video_id)}
            onRefresh={() => refreshActive(active.video_id)}
            onClose={() => setActive(null)}
          />
        )}
      </div>

      {selectedVideos.length > 0 && (
        <footer className="pager">
          <span className="muted">
            Selected: {selectedVideos.map((v) => v.video_id).join(", ")}
          </span>
        </footer>
      )}
    </div>
  );
}

function YoutubeCacheDetail({
  video,
  selected,
  onToggle,
  onRefresh,
  onClose,
}: {
  video: YoutubeTranscriptionCacheVideo;
  selected: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  onClose: () => void;
}) {
  return (
    <aside className="detail">
      <div className="detail-head">
        <span className={`pill ${video.status}`}>{video.status}</span>
        <span className="spacer" />
        <button className="link" onClick={onRefresh}>
          Refresh
        </button>
        <button className="link" onClick={onClose}>
          Close
        </button>
      </div>

      <h2>{video.title || video.video_id}</h2>
      <div className="muted">{video.channel || "No channel"}</div>

      <div className="row wrap detail-actions">
        <button onClick={onToggle}>{selected ? "Deselect" : "Select"}</button>
        {video.source_url && (
          <a
            className="button-link"
            href={video.source_url}
            target="_blank"
            rel="noreferrer"
          >
            Open source
          </a>
        )}
      </div>

      {video.error_detail && <div className="error message">{video.error_detail}</div>}

      <dl className="meta">
        <dt>Video id</dt>
        <dd>{video.video_id}</dd>
        <dt>Language</dt>
        <dd>{video.language}</dd>
        <dt>Duration</dt>
        <dd>{formatDuration(video.duration_seconds)}</dd>
        <dt>Provider</dt>
        <dd>{video.provider || "-"}</dd>
        <dt>Model</dt>
        <dd>{video.provider_model || "-"}</dd>
        <dt>Audio object</dt>
        <dd>{video.gcs_object_key || "-"}</dd>
        <dt>Payload object</dt>
        <dd>{video.payload_object_key || "-"}</dd>
        <dt>Audio updated</dt>
        <dd>{formatDate(video.audio_updated_at)}</dd>
        <dt>Transcript updated</dt>
        <dd>{formatDate(video.transcription_updated_at)}</dd>
        <dt>Reviewed</dt>
        <dd>{formatDate(video.reviewed_at)}</dd>
      </dl>

      <div className="field">
        <label>Transcript preview</label>
        <pre>{video.transcript_text || "No transcript cached."}</pre>
      </div>
    </aside>
  );
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
