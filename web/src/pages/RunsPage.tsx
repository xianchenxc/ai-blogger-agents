import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listRuns, type RunListItem } from "../api.js";

export default function RunsPage() {
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const r = await listRuns({ limit: 100, offset: 0 });
      setRuns(r.runs);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="page">
      <header className="page-head">
        <div className="row spread">
          <h1>历史记录</h1>
          <button type="button" className="btn" onClick={() => void load()}>
            刷新
          </button>
        </div>
        <p className="muted page-lead">共 {total} 条（当前页最多 100 条）</p>
      </header>
      {error ? <p className="error">{error}</p> : null}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>runId</th>
              <th>阶段</th>
              <th>主题</th>
              <th>review</th>
              <th>更新时间</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {runs.map((row) => (
              <tr key={row.runId}>
                <td>
                  <code>{row.runId}</code>
                </td>
                <td>{String(row.state?.stage ?? "")}</td>
                <td>
                  {String(row.state?.topic ?? row.memory?.title ?? "")}
                </td>
                <td>{String(row.state?.review ?? "")}</td>
                <td className="nowrap">{row.updatedAt}</td>
                <td>
                  <Link className="link" to={`/runs/${encodeURIComponent(row.runId)}`}>
                    详情
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {runs.length === 0 && !error ? (
        <p className="muted">暂无记录（确认 output/ 下存在带 state.json 的目录）</p>
      ) : null}
    </div>
  );
}
