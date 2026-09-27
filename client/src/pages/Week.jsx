import { useCallback, useEffect, useState } from "react";
import {
  api,
  engagementLabel,
  formatDateTimeLocal,
  formatMinutes,
  formatTime,
  localToday,
} from "../api.js";

const weekday = (ymd) =>
  new Date(`${ymd}T00:00:00`).toLocaleDateString([], { weekday: "short", day: "numeric" });

export default function Week() {
  const [engagements, setEngagements] = useState([]);
  const [week, setWeek] = useState(null);
  const [timer, setTimer] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);

  const emptyForm = {
    engagementId: "",
    startedAt: "",
    endedAt: "",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    const [eng, current, running] = await Promise.all([
      api.engagements(),
      api.currentWeek(localToday()),
      api.timer(),
    ]);
    setEngagements(eng);
    setWeek(current);
    setTimer(running);
    setForm((prev) => ({
      ...prev,
      engagementId: prev.engagementId || eng[0]?._id || "",
    }));
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  const locked = week?.timesheet?.status === "submitted";

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

  async function addManual(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createEntry({
        engagementId: form.engagementId,
        startedAt: new Date(form.startedAt).toISOString(),
        endedAt: new Date(form.endedAt).toISOString(),
        notes: form.notes,
      });
      setForm((prev) => ({ ...emptyForm, engagementId: prev.engagementId }));
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

  return (
    <section>
      <div className="week-head">
        <div>
          <h1>This week</h1>
          <p className="lede">
            Week of {week?.timesheet?.weekStart || "…"}. Total{" "}
            {formatMinutes(week?.totalMinutes || 0)}.
          </p>
        </div>
        {locked ? (
          <p className="banner">
            Submitted {week.timesheet.submittedAt ? new Date(week.timesheet.submittedAt).toLocaleString() : ""}.
            Entries are locked.
          </p>
        ) : (
          <button type="button" className="primary" onClick={submitWeek} disabled={busy}>
            Submit week
          </button>
        )}
      </div>

      {error ? <p className="banner error">{error}</p> : null}
      {timer && !locked ? (
        <p className="banner">A timer is running. Stop it on Today before submitting.</p>
      ) : null}

      <div className="days">
        {(week?.days || []).map((day) => (
          <article className="card day" key={day.date}>
            <header>
              <h2>{weekday(day.date)}</h2>
              <span>{formatMinutes(day.totalMinutes)}</span>
            </header>
            {!day.entries.length ? (
              <p className="muted">No time</p>
            ) : (
              <ul className="entry-list">
                {day.entries.map((entry) => (
                  <li key={entry._id}>
                    <div>
                      <strong>{engagementLabel(entry.engagement)}</strong>
                      <p className="muted">
                        {formatTime(entry.startedAt)} – {formatTime(entry.endedAt)} ·{" "}
                        {formatMinutes(entry.durationMinutes)}
                      </p>
                      {entry.notes ? <p>{entry.notes}</p> : null}
                    </div>
                    {!locked ? (
                      <div className="row-actions">
                        <button
                          type="button"
                          className="link"
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
                        <button type="button" className="link danger" onClick={() => remove(entry._id)}>
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>

      {!locked ? (
        <form className="card" onSubmit={addManual}>
          <h2>Add time</h2>
          <p className="muted">Use this when you forgot to start the timer.</p>
          <label>
            Engagement
            <select
              value={form.engagementId}
              onChange={(e) => setForm({ ...form, engagementId: e.target.value })}
              required
            >
              {engagements.map((eng) => (
                <option key={eng._id} value={eng._id}>
                  {engagementLabel(eng)}
                </option>
              ))}
            </select>
          </label>
          <div className="split">
            <label>
              Start
              <input
                type="datetime-local"
                value={form.startedAt}
                onChange={(e) => setForm({ ...form, startedAt: e.target.value })}
                required
              />
            </label>
            <label>
              End
              <input
                type="datetime-local"
                value={form.endedAt}
                onChange={(e) => setForm({ ...form, endedAt: e.target.value })}
                required
              />
            </label>
          </div>
          <label>
            Note
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
          <button type="submit" className="primary" disabled={busy}>
            Add entry
          </button>
        </form>
      ) : null}

      {editing && !locked ? (
        <form className="card" onSubmit={saveEdit}>
          <h2>Edit entry</h2>
          <label>
            Engagement
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
          </label>
          <div className="split">
            <label>
              Start
              <input
                type="datetime-local"
                value={editing.startedAt}
                onChange={(e) => setEditing({ ...editing, startedAt: e.target.value })}
              />
            </label>
            <label>
              End
              <input
                type="datetime-local"
                value={editing.endedAt}
                onChange={(e) => setEditing({ ...editing, endedAt: e.target.value })}
              />
            </label>
          </div>
          <label>
            Note
            <input
              value={editing.notes}
              onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
            />
          </label>
          <div className="row-actions">
            <button type="submit" className="primary" disabled={busy}>
              Save
            </button>
            <button type="button" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
