import { Router } from "express";
import { Engagement } from "../models/Engagement.js";
import { HttpError } from "../lib/timesheet.js";

export const engagementsRouter = Router();

engagementsRouter.get("/", async (req, res, next) => {
  try {
    const engagements = await Engagement.find()
      .populate("client")
      .sort({ name: 1 });
    res.json(engagements);
  } catch (err) {
    next(err);
  }
});

engagementsRouter.patch("/:id", async (req, res, next) => {
  try {
    const engagement = await Engagement.findById(req.params.id);
    if (!engagement) throw new HttpError(404, "Engagement not found.");

    const hourlyRate = Number(req.body?.hourlyRate);
    if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
      throw new HttpError(400, "Hourly fee must be 0 or more.");
    }

    engagement.hourlyRate = Math.round(hourlyRate * 100) / 100;
    await engagement.save();
    await engagement.populate("client");
    res.json(engagement);
  } catch (err) {
    next(err);
  }
});
