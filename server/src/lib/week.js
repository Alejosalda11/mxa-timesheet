/** Convert a Date to YYYY-MM-DD in the client's timezone. */
export function localYmd(date, tzOffsetMinutes) {
  const shifted = new Date(date.getTime() - tzOffsetMinutes * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export function mondayOf(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt.toISOString().slice(0, 10);
}

export function addDays(ymd, n) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function weekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function durationMinutes(startedAt, endedAt) {
  if (!endedAt) return 0;
  return Math.max(0, Math.round((endedAt - startedAt) / 60000));
}

export function parseTzOffset(req) {
  const header = req.get("x-tz-offset");
  const query = req.query.tzOffset;
  const raw = header ?? query;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}
