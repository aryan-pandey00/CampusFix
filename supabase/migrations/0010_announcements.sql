-- 10. Announcements.
--
-- Every other arrow in the app points along a single ticket. This is the one
-- way the office says something to everybody, and the payoff is fewer rows in
-- the queue: "water off in Boys Hostel, Tuesday 9-1" is fifteen students who do
-- not each file a "no water" complaint.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null,

  -- null means campus-wide. A targeted one can be shown on the report form the
  -- moment a student picks the place it covers, which is the only moment it can
  -- stop a duplicate. `set null` so retiring a location keeps the record.
  location_id uuid references public.locations (id) on delete set null,

  -- starts_at lets the office write Monday's shutdown on Friday. ends_at is NOT
  -- NULL on purpose: one that never expires becomes furniture nobody reads.
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz not null,

  -- Nullable, as complaint_events.actor_id is: deleting a
  -- user must not erase the history of what they announced.
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),

  -- The window has to make sense. Checked here rather than in the form, because
  -- a server action runs as the signed-in user and a form is a convenience.
  constraint announcements_window check (ends_at > starts_at),
  constraint announcements_title_len check (char_length(title) between 3 and 120),
  constraint announcements_body_len check (char_length(body) between 3 and 1000)
);

-- Every read asks the same question: which of these are live right now. Both
-- pages sort by newest first within that.
create index announcements_window_idx
  on public.announcements (ends_at desc, starts_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
--
-- Note what is NOT here: an RPC. Complaint writes need one because they carry a
-- multi-step invariant. An announcement does not — admin-only, author-is-self
-- and end-after-start are a policy and two CHECK constraints, which is stronger
-- than an RPC because there is no path around a constraint.

alter table public.announcements enable row level security;

-- The live window is enforced in the policy, not in the query: a student cannot
-- read an expired or not-yet-started announcement even by asking for it by id.
-- An admin sees every row, because they have to manage the ones that have not
-- started and the ones that have finished.
drop policy if exists announcements_select on public.announcements;
create policy announcements_select on public.announcements
  for select to authenticated
  using (
    public.is_admin()
    or (now() >= starts_at and now() < ends_at)
  );

-- The author is whoever actually inserted the row. A client can send any value
-- it likes; this refuses everything except the truth.
drop policy if exists announcements_insert on public.announcements;
create policy announcements_insert on public.announcements
  for insert to authenticated
  with check (public.is_admin() and created_by = auth.uid());

-- Update covers "End now", the normal way to retire one early. Any admin may
-- retire any announcement: the office is one desk, not a set of private
-- noticeboards.
drop policy if exists announcements_update on public.announcements;
create policy announcements_update on public.announcements
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Delete is for a typo caught before anyone read it. Retiring is an update, so
-- the record of what was announced survives.
drop policy if exists announcements_delete on public.announcements;
create policy announcements_delete on public.announcements
  for delete to authenticated
  using (public.is_admin());
