import { useEffect, useState } from "react";
import { getUserSettings, putUserSettings } from "../api.js";

export default function SettingsPage() {
  const [xhsAccountName, setXhsAccountName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState<string>("");

  useEffect(() => {
    void (async () => {
      setError(null);
      setLoading(true);
      try {
        const settings = await getUserSettings();
        setXhsAccountName(settings.xhsAccountName ?? "");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function submit() {
    setError(null);
    setSavedHint("");
    setSaving(true);
    try {
      const saved = await putUserSettings({
        xhsAccountName: xhsAccountName.trim(),
      });
      setXhsAccountName(saved.xhsAccountName);
      setSavedHint("已保存");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>配置</h1>
        <p className="muted page-lead">
          在这里维护用于内容生成与封面展示的小红书账号名称。保存后，新任务会自动使用该账号信息。
        </p>
      </header>
      <section className="card">
        <label className="label" htmlFor="xhs-account-name">
          小红书账号名称
        </label>
        <input
          id="xhs-account-name"
          className="input"
          value={xhsAccountName}
          onChange={(e) => setXhsAccountName(e.target.value)}
          placeholder="例如：职场英语小助手"
          disabled={loading}
        />
        <div className="row mt">
          <button
            type="button"
            className="btn primary"
            onClick={() => void submit()}
            disabled={loading || saving}
          >
            {saving ? "保存中…" : "保存配置"}
          </button>
          {savedHint ? <span className="muted small">{savedHint}</span> : null}
        </div>
      </section>
      {error ? <p className="error mt">{error}</p> : null}
    </div>
  );
}
