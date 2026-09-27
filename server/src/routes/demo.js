import { Router } from "express";
import { Engagement } from "../models/Engagement.js";
import { TimeEntry } from "../models/TimeEntry.js";
import { HttpError, getOrCreateDraftTimesheet } from "../lib/timesheet.js";
import { addDays, durationMinutes, mondayOf, parseTzOffset } from "../lib/week.js";

export const demoRouter = Router();

function localDate(ymd, hour, minute, tzOffset) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour, minute) + tzOffset * 60 * 1000);
}

demoRouter.post("/load", async (req, res, next) => {
  try {
    const tzOffset = parseTzOffset(req);
    const today = req.body?.date || new Date().toISOString().slice(0, 10);
    const weekStart = mondayOf(String(today));
    const timesheet = await getOrCreateDraftTimesheet(req.consultant._id, weekStart);

    const running = await TimeEntry.findOne({
      consultant: req.consultant._id,
      endedAt: null,
    });
    if (running) throw new HttpError(409, "Stop the running timer before loading demo data.");

    await TimeEntry.deleteMany({
      consultant: req.consultant._id,
      timesheet: timesheet._id,
      endedAt: { $ne: null },
    });

    const engagements = await Engagement.find().populate("client");
    const byKey = (client, name) =>
      engagements.find((e) => e.client?.name === client && e.name === name);

    const acme = byKey("Acme Corp", "Cloud Migration");
    const apex = byKey("Apex Health", "EHR Portal Audit");
    const tech = byKey("TechStart", "MVP Architecture");
    const internal = byKey("MXA Internal", "Practice ops");
    if (!acme || !apex || !tech || !internal) {
      throw new HttpError(500, "Expected seed engagements are missing. Run npm run seed.");
    }

    const mon = weekStart;
    const tue = addDays(weekStart, 1);
    const wed = addDays(weekStart, 2);
    const thu = addDays(weekStart, 3);

    const slots = [
      [acme, mon, 9, 0, 14, 0, "Terraform script deployment & Kubernetes cutover"],
      [internal, mon, 14, 30, 16, 0, "Internal delivery standup"],
      [apex, tue, 9, 0, 13, 30, "HIPAA compliance review for OAuth auth"],
      [tech, tue, 14, 0, 18, 0, "Technical design doc review and GraphQL schema"],
      [acme, wed, 9, 0, 13, 30, "Cloud Migration — landing zone hardening"],
      [apex, wed, 14, 0, 16, 30, "EHR portal audit walkthrough"],
      [tech, thu, 9, 0, 11, 0, "MVP architecture spike"],
    ];

    const created = [];
    for (const [engagement, ymd, sh, sm, eh, em, notes] of slots) {
      const startedAt = localDate(ymd, sh, sm, tzOffset);
      const endedAt = localDate(ymd, eh, em, tzOffset);
      created.push(
        await TimeEntry.create({
          consultant: req.consultant._id,
          engagement: engagement._id,
          timesheet: timesheet._id,
          startedAt,
          endedAt,
          durationMinutes: durationMinutes(startedAt, endedAt),
          notes,
        })
      );
    }

    res.status(201).json({ created: created.length, weekStart });
  } catch (err) {
    next(err);
  }
});
