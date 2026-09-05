-- 1. Enums, tables, ticket numbers.
--
-- RLS is enabled at the bottom with NO policies, which denies everything to
-- everyone. Policies arrive in 0002, so the tables are never readable by
-- someone holding the anon key.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type user_role as enum ('student', 'staff', 'admin');

create type complaint_status as enum (
  'open', 'assigned', 'in_progress', 'resolved', 'closed'
);

create type priority as enum ('low', 'medium', 'high', 'urgent');

create type category as enum (
  'electrical', 'plumbing', 'carpentry',
  'it_network', 'housekeeping', 'civil', 'other'
);

-- Drives how the location dropdown is grouped, and nothing else.
create type location_kind as enum ('academic', 'residence', 'facility');

create type event_type as enum (
  'created', 'assigned', 'status', 'note', 'confirmed', 'reopened',
  -- A department handing work back to the office. Its own type rather than a
  -- `status` event with a note, because handbacks have to be countable.
  'returned'
);

-- ---------------------------------------------------------------------------
-- profiles — one row per user, created by the trigger in 0005
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text,
  roll_no      text,
  phone        text,
  role         user_role   not null default 'student',
  hostel_block text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- departments — seeded in 0004
-- ---------------------------------------------------------------------------

create table public.departments (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  contact_name text,
  is_active    boolean not null default true
);

-- ---------------------------------------------------------------------------
-- locations — the places on campus, seeded in 0004
-- ---------------------------------------------------------------------------

create table public.locations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  kind            location_kind not null default 'facility',
  -- A block needs a spot inside it; the playground does not. create_complaint()
  -- checks this rather than trusting the browser.
  requires_detail boolean not null default false,
  -- The question the second field asks, and the examples behind it. Never the
  -- same text as each other: detail_hint is the placeholder, and a box that
  -- repeats its own label says nothing.
  detail_label    text,
  detail_hint     text,
  sort_order      int     not null default 0,
  is_active       boolean not null default true
);

-- ---------------------------------------------------------------------------
-- complaints — the core record
-- ---------------------------------------------------------------------------

-- Gaps are expected: a rolled-back insert still consumes a number. The ticket
-- identifies a complaint, it does not count them.
create sequence complaint_ticket_seq;

create table public.complaints (
  id              uuid primary key default gen_random_uuid(),
  ticket_no       text not null unique
                    default ('CF-' || lpad(nextval('complaint_ticket_seq')::text, 4, '0')),
  reporter_id     uuid not null references public.profiles (id) on delete cascade,

  title           text     not null,
  description     text     not null,
  category        category not null,
  priority        priority not null default 'medium',

  -- A key so reports can group on it exactly; the detail is free text.
  location_id     uuid not null references public.locations (id),
  location_detail text,

  status          complaint_status not null default 'open',
  department_id   uuid references public.departments (id),

  assigned_to_id  uuid references public.profiles (id) on delete set null,

  -- Storage object key, never a URL. Photos are served as signed URLs.
  photo_path      text,
  resolution_note text,

  created_at      timestamptz not null default now(),
  assigned_at     timestamptz,
  resolved_at     timestamptz,
  closed_at       timestamptz,
  reopen_count    int not null default 0
);

-- ---------------------------------------------------------------------------
-- complaint_events — append-only timeline
-- ---------------------------------------------------------------------------

create table public.complaint_events (
  id           uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints (id) on delete cascade,
  -- Nullable so deleting a user does not erase what they did.
  actor_id     uuid references public.profiles (id) on delete set null,
  type         event_type not null,
  from_status  complaint_status,
  to_status    complaint_status,
  note         text,
  -- true = admin-only, hidden from the student.
  is_internal  boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Every student query filters on reporter_id, and so does its RLS policy.
create index complaints_reporter_id_idx on public.complaints (reporter_id);
create index complaints_status_idx on public.complaints (status);
create index complaint_events_complaint_id_idx
  on public.complaint_events (complaint_id, created_at);

-- ---------------------------------------------------------------------------
-- Lock everything down. Policies come in 0002.
-- ---------------------------------------------------------------------------

alter table public.profiles         enable row level security;
alter table public.departments      enable row level security;
alter table public.locations        enable row level security;
alter table public.complaints       enable row level security;
alter table public.complaint_events enable row level security;
