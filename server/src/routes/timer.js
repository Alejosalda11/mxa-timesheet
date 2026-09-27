import { Router } from "express";
import { TimeEntry } from "../models/TimeEntry.js";
import { Engagement } from "../models/Engagement.js";
import { HttpError, findRunningTimer, getOrCreateDraftTimesheet, populateEntry } from "../lib/timesheet.js";
import { assertNoOverlap } from "../lib/overlap.js";
import { durationMinutes, localYmd, mondayOf, parseTzOffset } from "../lib/week.js";

export const timerRouter = Router();

timerRouter.get("/", async (req, res, next) => {
  try {
    const running = await findRunningTimer(req.consultant._id);
    res.json(running);
  } catch (err) {
    next(err);
  }
});

timerRouter.post("/start", async (req, res, next) => {
  try {
    const { engagementId, notes } = req.body || {};
    if (!engagementId) throw new HttpError(400, "engagementId is required.");

    const engagement = await Engagement.findById(engagementId);
    if (!engagement) throw new HttpError(404, "Engagement not found.");

    const existing = await findRunningTimer(req.consultant._id);
    if (existing) throw new HttpError(409, "A timer is already running. Stop it first.");

    const startedAt = new Date();
    const tzOffset = parseTzOffset(req);
    const weekStart = mondayOf(localYmd(startedAt, tzOffset));
    const timesheet = await getOrCreateDraftTimesheet(req.consultant._id, weekStart);

    await assertNoOverlap({
      consultantId: req.consultant._id,
      startedAt,
      endedAt: null,
    });

    const entry = await TimeEntry.create({
      consultant: req.consultant._id,
      engagement: engagement._id,
      timesheet: timesheet._id,
      startedAt,
      endedAt: null,
      durationMinutes: 0,
      notes: notes || "",
    });

    await entry.populate(populateEntry());
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

timerRouter.post("/stop", async (req, res, next) => {
  try {
    const running = await TimeEntry.findOne({
      consultant: req.consultant._id,
      endedAt: null,
    });
    if (!running) throw new HttpError(404, "No timer is running.");

    const endedAt = new Date();
    if (endedAt <= running.startedAt) {
      throw new HttpError(400, "Timer ended before it started.");
    }

    await assertNoOverlap({
      consultantId: req.consultant._id,
      startedAt: running.startedAt,
      endedAt,
      excludeId: running._id,
    });

    running.endedAt = endedAt;
    running.durationMinutes = durationMinutes(running.startedAt, endedAt);
    await running.save();
    await running.populate(populateEntry());
    res.json(running);
  } catch (err) {
    next(err);
  }
});
