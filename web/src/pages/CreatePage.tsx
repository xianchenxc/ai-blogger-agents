import { useState } from "react";
import { Link } from "react-router-dom";
import { getInvocation, postInvocation } from "../api.js";

const EDITABLE_FILES = [
  "topic.md",
  "knowledge.md",
  "dialogue.md",
  "post.md",
  "slides.md",
];

export default function CreatePage() {
  const [input, setInput] = useState("");
  const [invocationId, setInvocationId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  async function submit() {
    setError(null);
    setStatus("");
    const text = input.trim();
    if (!text) {
      setError("请输入需求描述");
      return;
    }
    try {
      const { id } = await postInvocation({ input: text });
      setInvocationId(id);
      setPolling(true);
      setStatus("pending");
      const poll = async () => {
        const job = await getInvocation(id);
        setStatus(job.status);
        if (job.status === "pending" || job.status === "running") {
          window.setTimeout(poll, 1500);
          return;
        }
        setPolling(false);
        if (job.status === "failed") {
          setError(job.error ?? "failed");
        }
      };
      void poll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="page">
      <h1>新建生成</h1>
      <p className="muted">
        提交后将异步执行 Agent。完成后请到「历史」查看最新{" "}
        <code>run-*</code>；若接口返回 <code>runIdGuess</code> 可辅助定位。
      </p>
      <label className="label">需求描述</label>
      <textarea
        className="textarea"
        rows={8}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="例如：生成一条小红书职场英语图文，场景为跨团队催进度，Slack 对话模板。"
      />
      <div className="row">
        <button type="button" className="btn primary" onClick={() => void submit()}>
          提交
        </button>
        <Link className="btn" to="/runs">
          查看历史
        </Link>
      </div>
      {invocationId ? (
        <p className="meta">
          任务 ID：<code>{invocationId}</code> 状态：<code>{status}</code>
          {polling ? "（轮询中）" : null}
        </p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      <section className="card mt">
        <h2>鉴权（可选）</h2>
        <p className="muted small">
          若服务端设置了 <code>ADMIN_API_TOKEN</code>，在此保存 Bearer
          token（仅存浏览器 localStorage）。
        </p>
        <TokenSetter />
      </section>
      <section className="card mt">
        <h2>可在线编辑的文件</h2>
        <p className="muted small">
          历史详情中可编辑：{EDITABLE_FILES.join("、")}
        </p>
      </section>
    </div>
  );
}

function TokenSetter() {
  const [v, setV] = useState(() => localStorage.getItem("admin_api_token") ?? "");
  return (
    <div className="row wrap">
      <input
        className="input"
        type="password"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="ADMIN_API_TOKEN"
      />
      <button
        type="button"
        className="btn"
        onClick={() => {
          if (v.trim()) localStorage.setItem("admin_api_token", v.trim());
          else localStorage.removeItem("admin_api_token");
          alert("已保存");
        }}
      >
        保存 Token
      </button>
    </div>
  );
}
