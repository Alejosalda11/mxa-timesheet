import { Router } from "express";

export const meRouter = Router();

meRouter.get("/", (req, res) => {
  res.json(req.consultant);
});
