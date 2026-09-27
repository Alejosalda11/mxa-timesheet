import { CONSULTANT_EMAIL } from "./config.js";
import { connectDb, disconnectDb } from "./db.js";
import { Consultant } from "./models/Consultant.js";
import { Client } from "./models/Client.js";
import { Engagement } from "./models/Engagement.js";
import { TimeEntry } from "./models/TimeEntry.js";
import { Timesheet } from "./models/Timesheet.js";

async function seed() {
  await connectDb();

  await Promise.all([
    TimeEntry.deleteMany({}),
    Timesheet.deleteMany({}),
    Engagement.deleteMany({}),
    Client.deleteMany({}),
    Consultant.deleteMany({}),
  ]);

  const consultant = await Consultant.create({
    name: "Alex Vance",
    title: "Senior Consultant",
    email: CONSULTANT_EMAIL,
  });

  const [acme, apex, tech, internal] = await Client.create([
    { name: "Acme Corp" },
    { name: "Apex Health" },
    { name: "TechStart" },
    { name: "MXA Internal" },
  ]);

  await Engagement.create([
    { client: acme._id, name: "Cloud Migration", billable: true, hourlyRate: 210 },
    { client: apex._id, name: "EHR Portal Audit", billable: true, hourlyRate: 185 },
    { client: tech._id, name: "MVP Architecture", billable: true, hourlyRate: 240 },
    { client: internal._id, name: "Practice ops", billable: false, hourlyRate: 0 },
  ]);

  console.log(`Seeded consultant ${consultant.name} <${consultant.email}>`);
  console.log("Clients: Acme Corp, Apex Health, TechStart, MXA Internal");
  await disconnectDb();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
