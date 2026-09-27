import { NavLink, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "./api.js";
import Today from "./pages/Today.jsx";
import Week from "./pages/Week.jsx";

export default function App() {
  const [me, setMe] = useState(null);

  useEffect(() => {
    api.me().then(setMe).catch(() => setMe(null));
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="brand">mxa timesheet</p>
          <p className="who">{me ? me.name : "Loading consultant…"}</p>
        </div>
        <nav>
          <NavLink to="/" end>
            Today
          </NavLink>
          <NavLink to="/week">This week</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/week" element={<Week />} />
        </Routes>
      </main>
    </div>
  );
}
