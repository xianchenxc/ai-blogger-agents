import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteRun,
  fetchAssetBlob,
  getRun,
  getRunFileText,
  putRunFile,
  type RunFileEntry,
} from "../api.js";

const MD_FILES = [
  "topic.md",
  "knowledge.md",
  "dialogue.md",
  "post.md",
  "slides.md",
];

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
  const [stateJson, setStateJson] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("state.json");
  const [editor, setEditor] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      setStateJson(JSON.stringify(r.state, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function loadFile(name: string) {
    setError(null);
    setActiveTab(name);
    if (name === "state.json") {
      setEditor(stateJson);
      return;
    }
    try {
      const t = await getRunFileText(runId, name);
      setEditor(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    void loadMeta();
  }, [runId]);

  useEffect(() => {
    if (activeTab === "state.json") {
      setEditor(stateJson);
    }
  }, [stateJson, activeTab]);

  async function save() {
    if (!MD_FILES.includes(activeTab)) {
      setError("仅可保存 .md 文件");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await putRunFile(runId, activeTab, editor);
      await loadMeta();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`确认删除 ${runId}？不可恢复。`)) return;
    try {
      await deleteRun(runId);
      nav("/runs");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div className="row spread">
          <h1>Run 详情</h1>
          <div className="row">
            <Link className="btn" to="/runs">
              返回列表
            </Link>
            <button type="button" className="btn danger" onClick={() => void remove()}>
              删除
            </button>
          </div>
        </div>
        <p className="meta page-lead">
          <code>{runId}</code>
        </p>
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

      <section className="card mt">
        <h2 className="section-title">文本文件</h2>
        <div className="tabs">
          <button
            type="button"
            className={activeTab === "state.json" ? "tab active" : "tab"}
            onClick={() => void loadFile("state.json")}
          >
            state.json（只读展示）
          </button>
          {MD_FILES.map((name) => (
            <button
              key={name}
              type="button"
              className={activeTab === name ? "tab active" : "tab"}
              onClick={() => void loadFile(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <textarea
          className="textarea code"
          rows={18}
          value={editor}
          onChange={(e) => setEditor(e.target.value)}
          readOnly={activeTab === "state.json"}
        />
        {activeTab !== "state.json" ? (
          <div className="row mt">
            <button
              type="button"
              className="btn primary"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        ) : null}
      </section>

      <section className="card mt">
        <h2 className="section-title">目录清单</h2>
        <ul className="filelist">
          {files.map((f) => (
            <li key={f.name}>
              <code>{f.name}</code>
              {f.size != null ? <span className="muted"> {f.size} B</span> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
