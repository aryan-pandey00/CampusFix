# CampusFix

**Campus complaints that do not get lost.**

A broken fan, a blocked drain, a lift that has been out for a week — on most
campuses these are reported to a register, a phone number or a WhatsApp group.
Nobody can tell you who has it, whether anything has happened, or whether the
same tap has broken four times this year.

CampusFix gives every complaint an owner, a clock and a record.

![Reporting an issue](docs/screenshots/report-an-issue.png)

## How it works

A student reports the problem with a photo and gets a ticket number. The
maintenance office assigns it to a department. The department starts the work,
and writes down what they actually did. The student then confirms the fix — or
sends it back with a reason, and it returns to the office.

Five states, always in the same order:

```
open  →  assigned  →  in progress  →  resolved  →  closed
```

Every one of those steps is saved with who did it and when, so "what happened to
my complaint?" always has an answer.

## Who uses it

| | |
|---|---|
| **Student** | Files a complaint, follows it, and is the only one who can close it |
| **Maintenance office** | Sees every complaint, routes it to a department, watches what is ageing |
| **Department** | Sees only its own work — starts it, resolves it, or hands it back |

![The maintenance office dashboard](docs/screenshots/dashboard.png)

## The parts that matter

**The student has the last word.** An admin can mark a complaint resolved, but
only the person who reported it can close it. If it is not actually fixed, they
send it back and it reopens.

**Nothing happens off the record.** Every status change writes a timeline entry
in the same database transaction as the change itself, so a complaint cannot
move without leaving a trace.

**The rules are enforced in the database, not in the screens.** Who can read
which complaint, and which status changes are legal, are checked inside
Postgres. Hiding a button is not security — someone can always call the API
directly, and the answer has to be the same.

**Photos stay private.** They are never public links. Each one is served through
a short-lived signed URL, so only the student who filed it, the office, and the
department holding the job can open it.

**It spots repeat faults.** Because every complaint carries a place and a
department, the reports show which places break most often and which departments
are slowest. A paper register cannot answer that.

## Built with

Next.js 16 (App Router) · TypeScript · Tailwind CSS with shadcn/ui · Supabase
for Postgres, authentication and file storage · Recharts.

## Running it locally

```bash
npm install
npm run dev
```

Create a Supabase project and put its keys in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Then apply `supabase/migrations/*.sql` in order, in the Supabase SQL editor.
`0009_demo_seed.sql` is sample data and can be skipped.

Two settings in the Supabase dashboard:

- **Authentication → URL Configuration → Redirect URLs**: add your site's URL,
  or the emailed password-reset link will not come back to the app.
- The first admin is made by editing that account's `role` in the table editor.
  After that, admins are managed from inside the app.
