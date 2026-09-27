import mongoose from "mongoose";

const consultantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const Consultant = mongoose.model("Consultant", consultantSchema);
