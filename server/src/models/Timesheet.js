import mongoose from "mongoose";

const timesheetSchema = new mongoose.Schema(
  {
    consultant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultant",
      required: true,
    },
    weekStart: { type: String, required: true },
    status: { type: String, enum: ["draft", "submitted"], default: "draft" },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

timesheetSchema.index({ consultant: 1, weekStart: 1 }, { unique: true });

export const Timesheet = mongoose.model("Timesheet", timesheetSchema);
