import { Consultant } from "../models/Consultant.js";
import { CONSULTANT_EMAIL } from "../config.js";

export async function attachConsultant(req, res, next) {
  try {
    const consultant = await Consultant.findOne({ email: CONSULTANT_EMAIL });
    if (!consultant) {
      return res.status(500).json({
        error: "No consultant seeded. Run npm run seed from the project root.",
      });
    }
    req.consultant = consultant;
    next();
  } catch (err) {
    next(err);
  }
}
