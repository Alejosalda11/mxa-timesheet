import { useEffect, useState } from "react";
import { api, initials } from "./api.js";
import Dashboard from "./pages/Dashboard.jsx";

export default function App() {
  const [me, setMe] = useState(null);

  useEffect(() => {
    api.me().then(setMe).catch(() => setMe(null));
  }, []);

  return (
    <div className="shell">
      <header className="mast">
        <div className="mast-left">
          <p className="logo">mxa consulting</p>
          <span className="product-pill">Time Tracker</span>
        </div>
        <div className="mast-meta">
          <span>
            ABN: <strong>34 613 307 618</strong>
          </span>
          <span>
            Location: <strong>Sydney NSW 2000</strong>
          </span>
        </div>
        <div className="mast-user">
          <span className="avatar">{initials(me?.name)}</span>
          <div>
            <p className="who">{me ? me.name : "Loading…"}</p>
            <p className="role">{me?.title || "Consultant"}</p>
          </div>
          <div className="mark" aria-hidden="true" />
        </div>
      </header>
      <main>
        <Dashboard />
      </main>
    </div>
  );
}
