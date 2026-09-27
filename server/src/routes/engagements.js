import { Router } from "express";
import { Engagement } from "../models/Engagement.js";

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
