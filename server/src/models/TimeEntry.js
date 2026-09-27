import mongoose from "mongoose";

const timeEntrySchema = new mongoose.Schema(
  {
    consultant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultant",
      required: true,
    },
    engagement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Engagement",
      required: true,
    },
    timesheet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Timesheet",
      default: null,
    },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

timeEntrySchema.index({ consultant: 1, endedAt: 1 });
timeEntrySchema.index({ timesheet: 1 });

export const TimeEntry = mongoose.model("TimeEntry", timeEntrySchema);
