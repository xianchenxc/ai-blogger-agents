import { useState } from "react";
import { getInvocation, postInvocation } from "../api.js";

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
      <header className="page-head">
        <h1>新建素材</h1>
        <p className="muted page-lead">
          输入清晰的生成需求后提交，任务会异步执行。可在「历史生成」实时查看状态，
          完成后进入详情页查看 topic 与生成图片。
        </p>
      </header>
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
      </div>
      {invocationId ? (
        <p className="meta">
          任务 ID：<code>{invocationId}</code> 状态：<code>{status}</code>
          {polling ? "（轮询中）" : null}
        </p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
