import mongoose from "mongoose";
import { MONGODB_URI } from "./config.js";

export async function connectDb() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(MONGODB_URI);
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
