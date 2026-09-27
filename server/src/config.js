import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

export const PORT = Number(process.env.PORT || 5000);
export const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mxa-timesheet";
export const CONSULTANT_EMAIL = process.env.CONSULTANT_EMAIL || "alex@mxa.local";
