# MXA Timesheet

A small MERN app for one consultant: capture time against billable work as it happens, then lock a week and submit it for approval.

This is a coding-challenge slice, not a practice-management product. The requirement is capture-as-you-go plus a period that can be submitted. Everything else was left out on purpose.

## How to run

You need **Node 18+**, **Docker** (for MongoDB), and two terminals if you prefer not to use the root `dev` script.

```bash
# from the repo root
docker compose up -d
npm run install:all
npm run seed
npm run dev
```

- API: http://localhost:5000
- UI: http://localhost:5173 (Vite proxies `/api` to the server)

If Mongo is already running locally, skip Docker and keep `server/.env` pointing at `mongodb://127.0.0.1:27017/mxa-timesheet`.

Re-running `npm run seed` wipes time entries and timesheets and restores the sample consultant, clients, and engagements.

## What we built and why

Consultants currently lose hours because time lives in phone notes and Friday memory. The app has two jobs:

1. **Today** — start/stop a timer against an engagement (client + piece of work), with an optional note. This is the replacement for “scribble it in a phone”.
2. **This week** — Monday–Sunday view, totals, manual add when the timer was forgotten, then **Submit week**. Submitted weeks are immutable.

There is no login. One consultant is seeded (`Alex Chen`, `alex@mxa.local`). The API treats that as the current user.

Time is always against an **engagement**, not a free-text client name, so a week can be billed later without reconstructing “what was that meeting?”.

## Domain

- **Consultant** — the single seeded user
- **Client** / **Engagement** — work you can book time to (`billable` flag included)
- **TimeEntry** — start/end (or a running timer with `endedAt: null`)
- **Timesheet** — one per consultant per week (`weekStart` is Monday as `YYYY-MM-DD`), `draft` or `submitted`

Rules the API enforces:

- Only one running timer
- Intervals `[startedAt, endedAt)` cannot overlap (a running timer is open-ended)
- You cannot start, edit, or delete entries on a submitted week
- Submit fails if a timer is running or the week has no completed entries

Week boundaries use the browser timezone (`x-tz-offset` header, same idea as `Date#getTimezoneOffset()`), so “today” and “this week” match what the consultant sees on the laptop.

## Deliberately left out

- Authentication and multi-consultant tenancy
- Approver role / reject / reopen-with-audit
- Invoicing, rates, PDF export
- Mobile app, calendar sync, reminders
- Rounding to 6/15 minutes
- Historical week picker (current week only)

## What we would do next

- JWT login and an approver inbox
- Reopen a submitted week with a reason and an audit log
- Friday reminder if the week is still draft
- Round and lock to billing increments
- Prev/next week navigation

## Edge cases worth knowing

- **Timezone:** the server does not assume UTC days. The client sends its offset; Monday is computed from the local calendar date of `startedAt`.
- **Overlap:** back-to-back entries (end equals next start) are allowed; overlapping ones return `409`.
- **Submit:** stop the timer first; empty weeks cannot be submitted.
- **Lock:** after submit, Today will not start a new timer until the following week.

## Project layout

```
client/   Vite + React (Today, This week)
server/   Express + Mongoose
docker-compose.yml
```
