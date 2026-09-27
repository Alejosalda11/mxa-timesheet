const tzOffset = () => String(new Date().getTimezoneOffset());

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    "x-tz-offset": tzOffset(),
    ...(options.headers || {}),
  };
  const res = await fetch(path, { ...options, headers });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  me: () => request("/api/me"),
  engagements: () => request("/api/engagements"),
  timer: () => request("/api/timer"),
  startTimer: (body) =>
    request("/api/timer/start", { method: "POST", body: JSON.stringify(body) }),
  stopTimer: () => request("/api/timer/stop", { method: "POST", body: "{}" }),
  currentWeek: (date) => request(`/api/timesheets/current?date=${date}`),
  createEntry: (body) =>
    request("/api/entries", { method: "POST", body: JSON.stringify(body) }),
  updateEntry: (id, body) =>
    request(`/api/entries/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteEntry: (id) => request(`/api/entries/${id}`, { method: "DELETE" }),
  submitWeek: (id) =>
    request(`/api/timesheets/${id}/submit`, { method: "POST", body: "{}" }),
};

export function localToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatMinutes(total) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTimeLocal(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function engagementLabel(engagement) {
  if (!engagement) return "Unknown";
  const client = engagement.client?.name || "Client";
  return `${client} · ${engagement.name}`;
}
