import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteRun,
  fetchAssetBlob,
  getRun,
  type RunFileEntry,
} from "../api.js";

function AuthPng({ runId, name }: { runId: string; name: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    void (async () => {
      try {
        const blob = await fetchAssetBlob(runId, name);
        const url = URL.createObjectURL(blob);
        revoked = url;
        if (!cancelled) setSrc(url);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [runId, name]);

  if (err) {
    return (
      <figure className="shot">
        <figcaption className="error">{name}: {err}</figcaption>
      </figure>
    );
  }
  if (!src) {
    return (
      <figure className="shot">
        <figcaption className="muted">{name} 加载中…</figcaption>
      </figure>
    );
  }
  return (
    <figure className="shot">
      <img src={src} alt={name} />
      <figcaption>{name}</figcaption>
    </figure>
  );
}

export default function RunDetailPage() {
  const { runId: runIdParam } = useParams();
  const runId = runIdParam ?? "";
  const nav = useNavigate();
  const [files, setFiles] = useState<RunFileEntry[]>([]);
  const [state, setState] = useState<Record<string, unknown> | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const pngs = useMemo(
    () =>
      files
        .filter((f) => f.kind === "file" && f.name.toLowerCase().endsWith(".png"))
        .map((f) => f.name),
    [files],
  );

  async function loadMeta() {
    setError(null);
    try {
      const r = await getRun(runId);
      setFiles(r.files ?? []);
      setState(r.state ?? null);
      setUpdatedAt(r.updatedAt ?? "");
      const stateTopic = typeof r.state?.topic === "string" ? r.state.topic : "";
      const memoryTitle = r.memory?.title ?? "";
      setTopic(stateTopic || memoryTitle);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    void loadMeta();
  }, [runId]);

  async function remove() {
    if (!window.confirm(`确认删除 ${runId}？不可恢复。`)) return;
    try {
      await deleteRun(runId);
      nav("/runs");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const status = typeof state?.stage === "string" ? state.stage : "-";
  const createdAt =
    typeof state?.createdAt === "string"
      ? state.createdAt
      : typeof state?.startedAt === "string"
        ? state.startedAt
        : "-";
  const generatedAt =
    typeof state?.generatedAt === "string"
      ? state.generatedAt
      : typeof state?.updatedAt === "string"
        ? state.updatedAt
        : updatedAt || "-";

  return (
    <div className="page">
      <header className="page-head">
        <div className="row spread">
          <div className="row">
            <Link className="btn" to="/runs">
              ← 返回列表
            </Link>
            <h1>Run 详情</h1>
          </div>
          <button type="button" className="btn danger" onClick={() => void remove()}>
            删除 Run
          </button>
        </div>
        <p className="meta page-lead">
          <code>{runId}</code>
        </p>
        <div className="row wrap mt">
          <p className="meta">创建时间：{createdAt}</p>
          <p className="meta">生成时间：{generatedAt}</p>
          <p className="meta">状态：{status}</p>
        </div>
        <p className="muted mt">{topic || "暂无 topic 信息"}</p>
      </header>
      {error ? <p className="error">{error}</p> : null}

      <section className="card mt">
        <h2 className="section-title">截图预览</h2>
        <div className="gallery">
          {pngs.map((name) => (
            <AuthPng key={name} runId={runId} name={name} />
          ))}
        </div>
        {pngs.length === 0 ? <p className="muted">无 png 资源</p> : null}
      </section>
    </div>
  );
}
