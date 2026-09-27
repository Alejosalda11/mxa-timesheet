import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  engagementLabel,
  formatMinutes,
  formatTime,
  localToday,
} from "../api.js";

function elapsedSince(startedAt) {
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
}

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function Today() {
  const [engagements, setEngagements] = useState([]);
  const [timer, setTimer] = useState(null);
  const [week, setWeek] = useState(null);
  const [engagementId, setEngagementId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    const [eng, running, current] = await Promise.all([
      api.engagements(),
      api.timer(),
      api.currentWeek(localToday()),
    ]);
    setEngagements(eng);
    setTimer(running);
    setWeek(current);
    if (!engagementId && eng[0]) setEngagementId(eng[0]._id);
  }, [engagementId]);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  useEffect(() => {
    if (!timer) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const today = week?.days?.find((d) => d.date === localToday());
  const locked = week?.timesheet?.status === "submitted";

  const elapsed = useMemo(
    () => (timer ? elapsedSince(timer.startedAt) : 0),
    // tick forces recompute
    [timer, tick]
  );

  async function start(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.startTimer({ engagementId, notes });
      setNotes("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    setError("");
    try {
      await api.stopTimer();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h1>Today</h1>
      <p className="lede">
        Capture work as it happens. Stop the timer when you switch, then submit the week when it is ready for approval.
      </p>
      {error ? <p className="banner error">{error}</p> : null}
      {locked ? (
        <p className="banner">This week is submitted and locked. You cannot start a new timer until next week.</p>
      ) : null}

      {timer ? (
        <div className="card timer">
          <p className="muted">Running</p>
          <h2>{engagementLabel(timer.engagement)}</h2>
          {timer.notes ? <p>{timer.notes}</p> : null}
          <p className="elapsed">{formatElapsed(elapsed)}</p>
          <button type="button" className="primary" onClick={stop} disabled={busy}>
            Stop timer
          </button>
        </div>
      ) : (
        <form className="card" onSubmit={start}>
          <h2>Start timer</h2>
          <label>
            Engagement
            <select
              value={engagementId}
              onChange={(e) => setEngagementId(e.target.value)}
              required
              disabled={locked}
            >
              {engagements.map((eng) => (
                <option key={eng._id} value={eng._id}>
                  {engagementLabel(eng)}
                  {eng.billable ? "" : " (non-billable)"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Note (optional)
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What are you working on?"
              disabled={locked}
            />
          </label>
          <button type="submit" className="primary" disabled={busy || locked || !engagementId}>
            Start timer
          </button>
        </form>
      )}

      <div className="card">
        <h2>Logged today</h2>
        {!today?.entries?.length ? (
          <p className="muted">Nothing completed yet today.</p>
        ) : (
          <ul className="entry-list">
            {today.entries.map((entry) => (
              <li key={entry._id}>
                <div>
                  <strong>{engagementLabel(entry.engagement)}</strong>
                  <p className="muted">
                    {formatTime(entry.startedAt)} – {formatTime(entry.endedAt)} ·{" "}
                    {formatMinutes(entry.durationMinutes)}
                    {entry.engagement?.billable === false ? " · non-billable" : ""}
                  </p>
                  {entry.notes ? <p>{entry.notes}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="total">Today: {formatMinutes(today?.totalMinutes || 0)}</p>
      </div>
    </section>
  );
}
