# CampusFix

Campus complaint and maintenance tracking. A student reports an issue with a photo, the
office assigns it to a department, the department does the work, and the student confirms
the fix — or sends it back. Every step writes a timeline entry.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 + shadcn/ui · Supabase (Postgres, Auth,
Storage) · Recharts.

## Running it

```bash
npm install
npm run dev
```

`.env.local` needs:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Apply `supabase/migrations/*.sql` in order, in the Supabase SQL editor or with the CLI.
`0009_demo_seed.sql` is sample data and can be skipped.

In the Supabase dashboard, add the site's URL to **Authentication → URL Configuration →
Redirect URLs**, or the emailed password-reset link goes nowhere.

## How it is put together

- **Three roles.** A student files and confirms. An admin runs the queue. A department
  member signs in to `/work` and moves their own department's complaints.
- **Five states**, in one direction: open → assigned → in progress → resolved → closed.
  Only the student who filed a complaint can close it, and only they can reopen it.
- **Access rules live in RLS**, not in the UI, so a bug in a page cannot leak one student's
  complaints to another.
- **Photos are private.** They are served through short-lived signed URLs generated on the
  server; there is no public bucket URL.
