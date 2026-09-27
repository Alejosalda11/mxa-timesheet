import { Timesheet } from "../models/Timesheet.js";
import { TimeEntry } from "../models/TimeEntry.js";

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function getOrCreateDraftTimesheet(consultantId, weekStart) {
  let timesheet = await Timesheet.findOne({ consultant: consultantId, weekStart });
  if (!timesheet) {
    timesheet = await Timesheet.create({
      consultant: consultantId,
      weekStart,
      status: "draft",
    });
  }
  if (timesheet.status === "submitted") {
    throw new HttpError(409, "This week is already submitted and locked.");
  }
  return timesheet;
}

export async function assertTimesheetEditable(timesheetId) {
  const timesheet = await Timesheet.findById(timesheetId);
  if (!timesheet) throw new HttpError(404, "Timesheet not found.");
  if (timesheet.status === "submitted") {
    throw new HttpError(409, "Submitted timesheets cannot be changed.");
  }
  return timesheet;
}

export async function findRunningTimer(consultantId) {
  return TimeEntry.findOne({ consultant: consultantId, endedAt: null }).populate({
    path: "engagement",
    populate: { path: "client" },
  });
}

export function populateEntry() {
  return {
    path: "engagement",
    populate: { path: "client" },
  };
}
