import { NavLink, Route, Routes } from "react-router-dom";
import CreatePage from "./pages/CreatePage.js";
import RunsPage from "./pages/RunsPage.js";
import RunDetailPage from "./pages/RunDetailPage.js";

export default function App() {
  return (
    <div className="layout">
      <header className="header">
        <div className="header-left">
          <strong className="brand">XHS 职场英语</strong>
          <span className="brand-tag">Agent · Runs</span>
        </div>
        <nav className="nav">
          <NavLink to="/" end>
            新建
          </NavLink>
          <NavLink to="/runs">历史</NavLink>
        </nav>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<CreatePage />} />
          <Route path="/runs" element={<RunsPage />} />
          <Route path="/runs/:runId" element={<RunDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
