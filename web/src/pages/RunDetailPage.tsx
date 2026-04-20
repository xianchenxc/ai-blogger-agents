import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteRun,
  fetchAssetBlob,
  getRun,
  type RunFileEntry,
} from "../api.js";

type PreviewImage = {
  name: string;
  src: string;
};

function AuthPng({
  runId,
  name,
  onOpenPreview,
  onLoaded,
}: {
  runId: string;
  name: string;
  onOpenPreview: (image: PreviewImage) => void;
  onLoaded: (image: PreviewImage) => void;
}) {
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
        if (!cancelled) {
          setSrc(url);
          onLoaded({ name, src: url });
        }
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
      <button
        type="button"
        className="shot-trigger"
        onClick={() => onOpenPreview({ name, src })}
      >
        <img src={src} alt={name} />
      </button>
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
  const [preview, setPreview] = useState<PreviewImage | null>(null);
  const [imageSrcByName, setImageSrcByName] = useState<Record<string, string>>({});

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

  useEffect(() => {
    setImageSrcByName({});
    setPreview(null);
  }, [runId]);

  useEffect(() => {
    if (!preview) return;
    const onKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === "Escape") {
        setPreview(null);
        return;
      }
      const currentIndex = pngs.findIndex((name) => name === preview.name);
      if (currentIndex < 0 || pngs.length <= 1) return;
      if (evt.key === "ArrowRight") {
        const nextIndex = (currentIndex + 1) % pngs.length;
        const nextName = pngs[nextIndex];
        const nextSrc = imageSrcByName[nextName];
        if (nextSrc) {
          evt.preventDefault();
          setPreview({ name: nextName, src: nextSrc });
        }
        return;
      }
      if (evt.key === "ArrowLeft") {
        const prevIndex = (currentIndex - 1 + pngs.length) % pngs.length;
        const prevName = pngs[prevIndex];
        const prevSrc = imageSrcByName[prevName];
        if (prevSrc) {
          evt.preventDefault();
          setPreview({ name: prevName, src: prevSrc });
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [imageSrcByName, pngs, preview]);

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
  const previewIndex = preview ? pngs.findIndex((name) => name === preview.name) : -1;
  const canNavigate = previewIndex >= 0 && pngs.length > 1;

  function goPreview(offset: -1 | 1): void {
    if (!preview || !canNavigate) return;
    const nextIndex = (previewIndex + offset + pngs.length) % pngs.length;
    const nextName = pngs[nextIndex];
    const nextSrc = imageSrcByName[nextName];
    if (!nextSrc) return;
    setPreview({ name: nextName, src: nextSrc });
  }

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
            <AuthPng
              key={name}
              runId={runId}
              name={name}
              onOpenPreview={(image) => setPreview(image)}
              onLoaded={(image) => {
                setImageSrcByName((prev) => {
                  if (prev[image.name] === image.src) return prev;
                  return { ...prev, [image.name]: image.src };
                });
              }}
            />
          ))}
        </div>
        {pngs.length === 0 ? <p className="muted">无 png 资源</p> : null}
      </section>
      {preview ? (
        <div
          className="image-preview-backdrop"
          role="presentation"
          onClick={() => setPreview(null)}
        >
          <div
            className="image-preview-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={preview.name}
            onClick={(evt) => evt.stopPropagation()}
          >
            <button
              type="button"
              className="image-preview-nav image-preview-nav-prev"
              onClick={() => goPreview(-1)}
              aria-label="上一张"
              disabled={!canNavigate}
            >
              ‹
            </button>
            <button
              type="button"
              className="image-preview-nav image-preview-nav-next"
              onClick={() => goPreview(1)}
              aria-label="下一张"
              disabled={!canNavigate}
            >
              ›
            </button>
            <button
              type="button"
              className="image-preview-close"
              onClick={() => setPreview(null)}
              aria-label="关闭预览"
            >
              ×
            </button>
            <img src={preview.src} alt={preview.name} />
            <p className="image-preview-caption">{preview.name}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
