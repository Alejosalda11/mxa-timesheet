import { Router } from "express";
import { TimeEntry } from "../models/TimeEntry.js";
import { Engagement } from "../models/Engagement.js";
import {
  HttpError,
  assertTimesheetEditable,
  getOrCreateDraftTimesheet,
  populateEntry,
} from "../lib/timesheet.js";
import { assertNoOverlap } from "../lib/overlap.js";
import { durationMinutes, localYmd, mondayOf, parseTzOffset } from "../lib/week.js";

export const entriesRouter = Router();

function parseRange(body) {
  const startedAt = body.startedAt ? new Date(body.startedAt) : null;
  const endedAt = body.endedAt ? new Date(body.endedAt) : null;
  if (!startedAt || Number.isNaN(startedAt.getTime())) {
    throw new HttpError(400, "startedAt is required.");
  }
  if (!endedAt || Number.isNaN(endedAt.getTime())) {
    throw new HttpError(400, "endedAt is required.");
  }
  if (endedAt <= startedAt) {
    throw new HttpError(400, "endedAt must be after startedAt.");
  }
  return { startedAt, endedAt };
}

entriesRouter.post("/", async (req, res, next) => {
  try {
    const { engagementId, notes } = req.body || {};
    if (!engagementId) throw new HttpError(400, "engagementId is required.");
    const engagement = await Engagement.findById(engagementId);
    if (!engagement) throw new HttpError(404, "Engagement not found.");

    const { startedAt, endedAt } = parseRange(req.body);
    const tzOffset = parseTzOffset(req);
    const weekStart = mondayOf(localYmd(startedAt, tzOffset));
    const timesheet = await getOrCreateDraftTimesheet(req.consultant._id, weekStart);

    await assertNoOverlap({
      consultantId: req.consultant._id,
      startedAt,
      endedAt,
    });

    const entry = await TimeEntry.create({
      consultant: req.consultant._id,
      engagement: engagement._id,
      timesheet: timesheet._id,
      startedAt,
      endedAt,
      durationMinutes: durationMinutes(startedAt, endedAt),
      notes: notes || "",
    });
    await entry.populate(populateEntry());
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

entriesRouter.patch("/:id", async (req, res, next) => {
  try {
    const entry = await TimeEntry.findOne({
      _id: req.params.id,
      consultant: req.consultant._id,
    });
    if (!entry) throw new HttpError(404, "Entry not found.");
    if (!entry.endedAt) throw new HttpError(400, "Stop the timer before editing it.");
    await assertTimesheetEditable(entry.timesheet);

    const nextStart = req.body.startedAt ? new Date(req.body.startedAt) : entry.startedAt;
    const nextEnd = req.body.endedAt ? new Date(req.body.endedAt) : entry.endedAt;
    if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime())) {
      throw new HttpError(400, "Invalid datetime.");
    }
    if (nextEnd <= nextStart) throw new HttpError(400, "endedAt must be after startedAt.");

    if (req.body.engagementId) {
      const engagement = await Engagement.findById(req.body.engagementId);
      if (!engagement) throw new HttpError(404, "Engagement not found.");
      entry.engagement = engagement._id;
    }

    await assertNoOverlap({
      consultantId: req.consultant._id,
      startedAt: nextStart,
      endedAt: nextEnd,
      excludeId: entry._id,
    });

    const tzOffset = parseTzOffset(req);
    const weekStart = mondayOf(localYmd(nextStart, tzOffset));
    const timesheet = await getOrCreateDraftTimesheet(req.consultant._id, weekStart);

    entry.startedAt = nextStart;
    entry.endedAt = nextEnd;
    entry.durationMinutes = durationMinutes(nextStart, nextEnd);
    entry.timesheet = timesheet._id;
    if (req.body.notes !== undefined) entry.notes = req.body.notes;
    await entry.save();
    await entry.populate(populateEntry());
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

entriesRouter.delete("/:id", async (req, res, next) => {
  try {
    const entry = await TimeEntry.findOne({
      _id: req.params.id,
      consultant: req.consultant._id,
    });
    if (!entry) throw new HttpError(404, "Entry not found.");
    if (!entry.endedAt) throw new HttpError(400, "Stop the timer before deleting it.");
    await assertTimesheetEditable(entry.timesheet);
    await entry.deleteOne();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
