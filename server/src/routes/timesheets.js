import { Router } from "express";
import { TimeEntry } from "../models/TimeEntry.js";
import { Timesheet } from "../models/Timesheet.js";
import { HttpError, entryValue, findRunningTimer, populateEntry } from "../lib/timesheet.js";
import { mondayOf, parseTzOffset, weekDates } from "../lib/week.js";

export const timesheetsRouter = Router();

function serializeWeek(timesheet, entries, tzOffset) {
  const days = weekDates(timesheet.weekStart).map((date) => {
    const dayEntries = entries.filter((entry) => {
      if (!entry.endedAt) return false;
      const ymd = new Date(entry.startedAt.getTime() - tzOffset * 60000)
        .toISOString()
        .slice(0, 10);
      return ymd === date;
    });
    const totalMinutes = dayEntries.reduce((sum, e) => sum + e.durationMinutes, 0);
    return { date, entries: dayEntries, totalMinutes };
  });

  const totalMinutes = days.reduce((sum, d) => sum + d.totalMinutes, 0);
  const completed = days.flatMap((d) => d.entries);
  const billableMinutes = completed
    .filter((e) => e.engagement?.billable)
    .reduce((sum, e) => sum + e.durationMinutes, 0);
  const nonBillableMinutes = totalMinutes - billableMinutes;
  const billableValue = completed.reduce((sum, e) => sum + entryValue(e), 0);

  const byClient = new Map();
  for (const entry of completed) {
    const name = entry.engagement?.client?.name || "Unknown";
    const current = byClient.get(name) || { client: name, minutes: 0, value: 0 };
    current.minutes += entry.durationMinutes;
    current.value += entryValue(entry);
    byClient.set(name, current);
  }
  const clientBreakdown = [...byClient.values()].sort((a, b) => b.minutes - a.minutes);

  return {
    timesheet,
    days,
    totalMinutes,
    billableMinutes,
    nonBillableMinutes,
    billableValue,
    clientBreakdown,
    targetMinutes: 40 * 60,
  };
}

timesheetsRouter.get("/current", async (req, res, next) => {
  try {
    const tzOffset = parseTzOffset(req);
    const today = req.query.date || new Date().toISOString().slice(0, 10);
    const weekStart = mondayOf(String(today));

    let timesheet = await Timesheet.findOne({
      consultant: req.consultant._id,
      weekStart,
    });
    if (!timesheet) {
      timesheet = await Timesheet.create({
        consultant: req.consultant._id,
        weekStart,
        status: "draft",
      });
    }

    const entries = await TimeEntry.find({
      consultant: req.consultant._id,
      timesheet: timesheet._id,
    })
      .populate(populateEntry())
      .sort({ startedAt: 1 });

    res.json(serializeWeek(timesheet, entries, tzOffset));
  } catch (err) {
    next(err);
  }
});

timesheetsRouter.post("/:id/submit", async (req, res, next) => {
  try {
    const timesheet = await Timesheet.findOne({
      _id: req.params.id,
      consultant: req.consultant._id,
    });
    if (!timesheet) throw new HttpError(404, "Timesheet not found.");
    if (timesheet.status === "submitted") {
      throw new HttpError(409, "This week is already submitted.");
    }

    const running = await findRunningTimer(req.consultant._id);
    if (running) {
      throw new HttpError(409, "Stop the running timer before submitting.");
    }

    const completed = await TimeEntry.countDocuments({
      timesheet: timesheet._id,
      endedAt: { $ne: null },
    });
    if (completed === 0) {
      throw new HttpError(400, "Add at least one completed entry before submitting.");
    }

    timesheet.status = "submitted";
    timesheet.submittedAt = new Date();
    await timesheet.save();
    res.json(timesheet);
  } catch (err) {
    next(err);
  }
});
