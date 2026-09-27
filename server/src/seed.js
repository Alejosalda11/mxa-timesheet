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
    name: "Alex Chen",
    email: CONSULTANT_EMAIL,
  });

  const [northwind, harbor, apex] = await Client.create([
    { name: "Northwind Retail" },
    { name: "Harbor Legal" },
    { name: "Apex Health" },
  ]);

  await Engagement.create([
    { client: northwind._id, name: "ERP rollout", billable: true },
    { client: northwind._id, name: "Weekly ops standup", billable: false },
    { client: harbor._id, name: "Discovery", billable: true },
    { client: apex._id, name: "Data migration", billable: true },
  ]);

  console.log(`Seeded consultant ${consultant.name} <${consultant.email}>`);
  console.log("Clients: Northwind Retail, Harbor Legal, Apex Health");
  await disconnectDb();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
