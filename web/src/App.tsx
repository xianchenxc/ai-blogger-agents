import { NavLink, Route, Routes } from "react-router-dom";
import CreatePage from "./pages/CreatePage.js";
import RunsPage from "./pages/RunsPage.js";
import RunDetailPage from "./pages/RunDetailPage.js";
import SettingsPage from "./pages/SettingsPage.js";

export default function App() {
  return (
    <div className="layout">
      <header className="app-header">
        <div className="header-left">
          <strong className="brand">XHS 职场英语</strong>
          <span className="brand-tag">Agent · Runs</span>
        </div>
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <nav className="nav nav-vertical">
            <NavLink to="/" end>
              <span className="nav-icon" aria-hidden="true">✦</span>
              <span className="nav-title">新建素材</span>
            </NavLink>
            <NavLink to="/runs">
              <span className="nav-icon" aria-hidden="true">◷</span>
              <span className="nav-title">生成记录</span>
            </NavLink>
            <NavLink to="/settings">
              <span className="nav-icon" aria-hidden="true">⚙</span>
              <span className="nav-title">配置</span>
            </NavLink>
          </nav>
        </aside>
        <main className="main content-pane">
          <Routes>
            <Route path="/" element={<CreatePage />} />
            <Route path="/runs" element={<RunsPage />} />
            <Route path="/runs/:runId" element={<RunDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
