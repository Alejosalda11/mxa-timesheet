import mongoose from "mongoose";

const engagementSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    name: { type: String, required: true },
    billable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Engagement = mongoose.model("Engagement", engagementSchema);
