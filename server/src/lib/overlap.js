import { TimeEntry } from "../models/TimeEntry.js";

function openEnd(endedAt) {
  return endedAt ?? new Date("9999-12-31T23:59:59.999Z");
}

export function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < openEnd(bEnd) && bStart < openEnd(aEnd);
}

export async function assertNoOverlap({
  consultantId,
  startedAt,
  endedAt,
  excludeId,
}) {
  const filter = { consultant: consultantId };
  if (excludeId) filter._id = { $ne: excludeId };

  const others = await TimeEntry.find(filter).select("startedAt endedAt");
  const conflict = others.find((other) =>
    intervalsOverlap(startedAt, endedAt, other.startedAt, other.endedAt)
  );
  if (conflict) {
    const err = new Error("This time overlaps another entry.");
    err.status = 409;
    throw err;
  }
}
