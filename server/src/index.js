import express from "express";
import cors from "cors";
import { PORT } from "./config.js";
import { connectDb } from "./db.js";
import "./models/index.js";
import { attachConsultant } from "./middleware/consultant.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { meRouter } from "./routes/me.js";
import { engagementsRouter } from "./routes/engagements.js";
import { timerRouter } from "./routes/timer.js";
import { entriesRouter } from "./routes/entries.js";
import { timesheetsRouter } from "./routes/timesheets.js";
import { demoRouter } from "./routes/demo.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api", attachConsultant);
app.use("/api/me", meRouter);
app.use("/api/engagements", engagementsRouter);
app.use("/api/timer", timerRouter);
app.use("/api/entries", entriesRouter);
app.use("/api/timesheets", timesheetsRouter);
app.use("/api/demo", demoRouter);

app.use(errorHandler);

connectDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
