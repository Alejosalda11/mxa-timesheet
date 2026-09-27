import { useCallback, useEffect, useMemo, useState } from "react";
import {
  api,
  engagementLabel,
  entryValue,
  formatDateTimeLocal,
  formatHours,
  formatMoney,
  formatMoneyExact,
  formatWeekRange,
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

const emptyManual = {
  engagementId: "",
  startedAt: "",
  endedAt: "",
  notes: "",
};

export default function Dashboard() {
  const [engagements, setEngagements] = useState([]);
  const [timer, setTimer] = useState(null);
  const [week, setWeek] = useState(null);
  const [engagementId, setEngagementId] = useState("");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState("timer");
  const [clientFilter, setClientFilter] = useState("all");
  const [manual, setManual] = useState(emptyManual);
  const [editing, setEditing] = useState(null);
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
    setEngagementId((id) => id || eng[0]?._id || "");
    setManual((prev) => ({
      ...prev,
      engagementId: prev.engagementId || eng[0]?._id || "",
    }));
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  useEffect(() => {
    if (!timer) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const locked = week?.timesheet?.status === "submitted";
  const elapsed = useMemo(
    () => (timer ? elapsedSince(timer.startedAt) : 0),
    [timer, tick]
  );

  const clients = useMemo(() => {
    const names = new Set(engagements.map((e) => e.client?.name).filter(Boolean));
    return [...names];
  }, [engagements]);

  const entries = useMemo(() => {
    const all = (week?.days || []).flatMap((d) =>
      d.entries.map((entry) => ({ ...entry, date: d.date }))
    );
    if (clientFilter === "all") return all;
    return all.filter((e) => e.engagement?.client?.name === clientFilter);
  }, [week, clientFilter]);

  const totalMinutes = week?.totalMinutes || 0;
  const targetMinutes = week?.targetMinutes || 40 * 60;
  const progress = Math.min(100, Math.round((totalMinutes / targetMinutes) * 100));
  const billableMinutes = week?.billableMinutes || 0;
  const nonBillableMinutes = week?.nonBillableMinutes || 0;
  const billableRatio = totalMinutes
    ? Math.round((billableMinutes / totalMinutes) * 1000) / 10
    : 0;

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

  async function addManual(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createEntry({
        engagementId: manual.engagementId,
        startedAt: new Date(manual.startedAt).toISOString(),
        endedAt: new Date(manual.endedAt).toISOString(),
        notes: manual.notes,
      });
      setManual((prev) => ({ ...emptyManual, engagementId: prev.engagementId }));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.updateEntry(editing._id, {
        engagementId: editing.engagementId,
        startedAt: new Date(editing.startedAt).toISOString(),
        endedAt: new Date(editing.endedAt).toISOString(),
        notes: editing.notes,
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this entry?")) return;
    setBusy(true);
    setError("");
    try {
      await api.deleteEntry(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitWeek() {
    if (!week?.timesheet?._id) return;
    setBusy(true);
    setError("");
    try {
      await api.submitWeek(week.timesheet._id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadDemo() {
    setBusy(true);
    setError("");
    try {
      await api.loadDemo(localToday());
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dash">
      {error ? <p className="banner error">{error}</p> : null}

      <section className="kpis">
        <article className="kpi">
          <div className="kpi-top">
            <span className="kpi-label">Current period</span>
            <span className={`pill ${locked ? "pill-ok" : "pill-draft"}`}>
              {locked ? "Submitted" : "Draft"}
            </span>
          </div>
          <h2>{formatWeekRange(week?.timesheet?.weekStart)}</h2>
          <p className="kpi-meta">
            Deadline: Fri 5:00 PM
            {!locked ? (
              <button type="button" className="text-link" onClick={submitWeek} disabled={busy}>
                Submit now →
              </button>
            ) : null}
          </p>
        </article>

        <article className="kpi">
          <span className="kpi-label">Total hours logged</span>
          <h2>
            {(totalMinutes / 60).toFixed(1)} <span className="kpi-sub">/ 40.0 hrs</span>
          </h2>
          <div className="meter">
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="kpi-meta">Target completion {progress}%</p>
        </article>

        <article className="kpi">
          <span className="kpi-label">Billable ratio & value</span>
          <h2>{formatMoney(week?.billableValue)}</h2>
          <p className="kpi-meta accent">
            {billableRatio.toFixed(1)}% billable
          </p>
          <p className="kpi-meta">
            Billable {formatHours(billableMinutes)} · Non-billable {formatHours(nonBillableMinutes)}
          </p>
        </article>

        <article className="kpi kpi-hero">
          <span className="kpi-label">Captured revenue</span>
          <p className="hero-note">Preventing Friday afternoon reconstruction loss</p>
          <h2>{formatMoneyExact(week?.billableValue)}</h2>
          <p className="kpi-meta">
            {timer ? "Live timer capturing now" : "Real-time log capture ready"}
          </p>
        </article>
      </section>

      <section className="capture card">
        <div className="capture-head">
          <div>
            <span className="live-dot" />
            <strong>Quick time capture</strong>
          </div>
          <div className="mode-toggle">
            <button
              type="button"
              className={mode === "timer" ? "active" : ""}
              onClick={() => setMode("timer")}
            >
              Live timer
            </button>
            <button
              type="button"
              className={mode === "manual" ? "active" : ""}
              onClick={() => setMode("manual")}
              disabled={locked}
            >
              Quick manual entry
            </button>
          </div>
        </div>

        {timer && mode === "timer" ? (
          <div className="capture-row running">
            <div>
              <p className="field-label">Client / project</p>
              <p className="running-label">{engagementLabel(timer.engagement)}</p>
              {timer.notes ? <p className="muted">{timer.notes}</p> : null}
            </div>
            <div className="timer-display">{formatElapsed(elapsed)}</div>
            <button type="button" className="btn-stop" onClick={stop} disabled={busy}>
              Stop timer
            </button>
          </div>
        ) : mode === "timer" ? (
          <form className="capture-row" onSubmit={start}>
            <label>
              <span className="field-label">Client / project</span>
              <select
                value={engagementId}
                onChange={(e) => setEngagementId(e.target.value)}
                disabled={locked}
                required
              >
                {engagements.map((eng) => (
                  <option key={eng._id} value={eng._id}>
                    {engagementLabel(eng)}
                    {eng.billable ? "" : " (non-billable)"}
                  </option>
                ))}
              </select>
            </label>
            <label className="grow">
              <span className="field-label">Work description / notes</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What are you working on right now?"
                disabled={locked}
              />
            </label>
            <div>
              <span className="field-label">Timer display</span>
              <div className="timer-display idle">00:00:00</div>
            </div>
            <button type="submit" className="btn-start" disabled={busy || locked || !engagementId}>
              ▶ Start timer
            </button>
          </form>
        ) : (
          <form className="capture-row manual" onSubmit={addManual}>
            <label>
              <span className="field-label">Client / project</span>
              <select
                value={manual.engagementId}
                onChange={(e) => setManual({ ...manual, engagementId: e.target.value })}
                required
              >
                {engagements.map((eng) => (
                  <option key={eng._id} value={eng._id}>
                    {engagementLabel(eng)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">Start</span>
              <input
                type="datetime-local"
                value={manual.startedAt}
                onChange={(e) => setManual({ ...manual, startedAt: e.target.value })}
                required
              />
            </label>
            <label>
              <span className="field-label">End</span>
              <input
                type="datetime-local"
                value={manual.endedAt}
                onChange={(e) => setManual({ ...manual, endedAt: e.target.value })}
                required
              />
            </label>
            <label className="grow">
              <span className="field-label">Notes</span>
              <input
                value={manual.notes}
                onChange={(e) => setManual({ ...manual, notes: e.target.value })}
                placeholder="What did you work on?"
              />
            </label>
            <button type="submit" className="btn-start" disabled={busy}>
              Add entry
            </button>
          </form>
        )}
        {locked ? (
          <p className="locked-note">This week is submitted and locked until next Monday.</p>
        ) : null}
      </section>

      <section className="lower">
        <article className="card table-card">
          <div className="table-head">
            <h3>
              Timesheet entries <span>{entries.length} entries</span>
            </h3>
            <div className="table-tools">
              <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
                <option value="all">All clients</option>
                {clients.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <button type="button" className="btn-ghost" onClick={loadDemo} disabled={busy || locked}>
                Load demo data
              </button>
            </div>
          </div>
          {!entries.length ? (
            <p className="muted empty">No completed entries this week yet. Start the timer or load demo data.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Client / project</th>
                  <th>Description</th>
                  <th>Hours</th>
                  <th>Value</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry._id}>
                    <td className="mono">{entry.date}</td>
                    <td>
                      <strong>{entry.engagement?.client?.name}</strong>
                      <span className="sub">{entry.engagement?.name}</span>
                    </td>
                    <td>{entry.notes || "—"}</td>
                    <td>{formatHours(entry.durationMinutes)}</td>
                    <td>{entry.engagement?.billable ? formatMoneyExact(entryValue(entry)) : "—"}</td>
                    <td className="actions">
                      {!locked ? (
                        <>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() =>
                              setEditing({
                                _id: entry._id,
                                engagementId: entry.engagement._id,
                                startedAt: formatDateTimeLocal(entry.startedAt),
                                endedAt: formatDateTimeLocal(entry.endedAt),
                                notes: entry.notes || "",
                              })
                            }
                          >
                            Edit
                          </button>
                          <button type="button" className="icon-btn danger" onClick={() => remove(entry._id)}>
                            Delete
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {editing && !locked ? (
            <form className="edit-form" onSubmit={saveEdit}>
              <h4>Edit entry</h4>
              <select
                value={editing.engagementId}
                onChange={(e) => setEditing({ ...editing, engagementId: e.target.value })}
              >
                {engagements.map((eng) => (
                  <option key={eng._id} value={eng._id}>
                    {engagementLabel(eng)}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={editing.startedAt}
                onChange={(e) => setEditing({ ...editing, startedAt: e.target.value })}
              />
              <input
                type="datetime-local"
                value={editing.endedAt}
                onChange={(e) => setEditing({ ...editing, endedAt: e.target.value })}
              />
              <input
                value={editing.notes}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              />
              <button type="submit" className="btn-start" disabled={busy}>
                Save
              </button>
              <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
            </form>
          ) : null}
        </article>

        <aside className="side">
          <article className="card">
            <h3>Client breakdown</h3>
            {!(week?.clientBreakdown || []).length ? (
              <p className="muted">Hours will land here as you capture them.</p>
            ) : (
              <ul className="breakdown">
                {(week.clientBreakdown || []).map((row) => {
                  const pct = totalMinutes ? Math.round((row.minutes / totalMinutes) * 100) : 0;
                  return (
                    <li key={row.client}>
                      <div className="bd-top">
                        <span>{row.client}</span>
                        <strong>
                          {formatHours(row.minutes)} ({pct}%)
                        </strong>
                      </div>
                      <div className="meter">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </article>

          <article className="card submit-card">
            <h3>Timesheet submission</h3>
            {locked ? (
              <p>
                Submitted{" "}
                {week.timesheet.submittedAt
                  ? new Date(week.timesheet.submittedAt).toLocaleString()
                  : ""}
                . Entries are locked for approval.
              </p>
            ) : (
              <>
                <p>
                  Lock this week when the hours are ready for approval. A running timer must be
                  stopped first.
                </p>
                {timer ? (
                  <p className="warn">Stop the live timer before submitting.</p>
                ) : null}
                <p className="submit-total">
                  {formatHours(totalMinutes)} logged · {formatMoney(week?.billableValue)} billable
                </p>
                <button type="button" className="btn-start wide" onClick={submitWeek} disabled={busy}>
                  Submit week for approval
                </button>
              </>
            )}
          </article>
        </aside>
      </section>
    </div>
  );
}
