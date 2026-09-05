-- 11. The third role: a department member.
--
-- Safe to re-run.
--
--   student  files it, and is the ONLY one who can close it
--   admin    routes it between departments; may resolve as an override
--   staff    sees their own department only; starts work, resolves, hands back
--
-- Two deliberate limits on staff, both to stop work getting lost:
--
--   * they cannot reassign to another department. Staff-to-staff transfer is
--     ping-pong nobody owns; they hand it back to the office with a reason.
--   * they cannot close. resolved -> closed stays the student's alone (0008).
--
-- The admin keeps Resolve as an override: a complaint with a department that
-- never signs in would otherwise have no manual escape. complaint_events stamps
-- who acted, so the two stay distinguishable in the record.

-- ---------------------------------------------------------------------------
-- profiles.department_id
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists department_id uuid
    references public.departments (id) on delete set null;

-- A staff member with no department can read nothing, which is a broken account
-- rather than a valid state. The two columns are always written together in one
-- UPDATE — by set_user_role() (0012), or by hand in the SQL editor.
alter table public.profiles
  drop constraint if exists profiles_staff_has_department;
alter table public.profiles
  add constraint profiles_staff_has_department
  check (role <> 'staff' or department_id is not null);

-- ---------------------------------------------------------------------------
-- department_id is not writable through the app either
-- ---------------------------------------------------------------------------
--
-- Closes the hole the column above opens, in the same migration. 0002's
-- profiles_update_own lets any user update their own row, and that row now has
-- a department_id — so without this a staff member could point themselves at
-- another department with one PATCH and read its complaints.
--
-- A trigger and not a REVOKE, for the reason recorded in 0002.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null then
    raise exception 'role cannot be changed through the application'
      using errcode = '42501';
  end if;

  if new.department_id is distinct from old.department_id
     and auth.uid() is not null then
    raise exception 'department cannot be changed through the application'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- Recreated so this file stands on its own if 0002 has not been re-run.
drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- ---------------------------------------------------------------------------
-- Which department is the caller in?
-- ---------------------------------------------------------------------------

-- Same shape as is_admin(), for the same two reasons.
--
-- Returns null for a student, an admin, or anyone signed out. The policies below
-- compare against it, and nothing equals null — so the predicate cannot widen
-- anyone else's access, and a complaint with no department is invisible to all
-- staff.
create or replace function public.my_department()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select department_id
  from public.profiles
  where id = auth.uid() and role = 'staff';
$$;

-- ---------------------------------------------------------------------------
-- The department predicate, added to three policies
-- ---------------------------------------------------------------------------

-- complaints: staff see their department's complaints at every status,
-- resolved and closed included — that is the record of their own work.
drop policy if exists complaints_select on public.complaints;
create policy complaints_select on public.complaints
  for select to authenticated
  using (
    reporter_id = auth.uid()
    or public.is_admin()
    or department_id = public.my_department()
  );

-- complaint_events: readable when the parent complaint is. One exists() with a
-- branch per role, because the rules are entangled — staff see internal events
-- but only on their own department's complaints, the student sees only
-- non-internal ones on their own — and there must be no reading of this under
-- which an internal note reaches the reporter.
drop policy if exists complaint_events_select on public.complaint_events;
create policy complaint_events_select on public.complaint_events
  for select to authenticated
  using (
    exists (
      -- Both outer columns are qualified. Unqualified they would still resolve
      -- correctly today, but only because complaints has no column of either
      -- name — a coincidence, not a rule.
      select 1 from public.complaints c
      where c.id = complaint_events.complaint_id
        and (
          public.is_admin()
          or c.department_id = public.my_department()
          or (
            c.reporter_id = auth.uid()
            and not complaint_events.is_internal
          )
        )
    )
  );

-- profiles: staff can read two sets of people, and nobody else.
--
--   1. whoever reported a complaint in their department — the fixer needs a
--      name and a number to knock on the right door.
--   2. their own colleagues, so a teammate's action reads as a person.
--
-- The `my_department() is not null` guard on the second clause is load bearing:
-- without it every student (department_id null) would match every other.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.complaints c
      where c.reporter_id = profiles.id
        and c.department_id = public.my_department()
    )
    or (
      public.my_department() is not null
      and profiles.department_id = public.my_department()
    )
  );

-- ---------------------------------------------------------------------------
-- The photo, for the person actually holding the spanner
-- ---------------------------------------------------------------------------

-- Minting a signed URL requires select on the object, so this policy is what
-- decides whether the department can see the picture at all. photo_path stores
-- the object key, so it joins straight to storage.objects.name — never a URL,
-- because the bucket is private permanently (0003).
drop policy if exists complaint_photos_select on storage.objects;
create policy complaint_photos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'complaint-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or exists (
        select 1 from public.complaints c
        where c.photo_path = storage.objects.name
          and c.department_id = public.my_department()
      )
    )
  );

-- The join above is by path, which had no index of its own.
create index if not exists complaints_photo_path_idx
  on public.complaints (photo_path)
  where photo_path is not null;

-- Staff read their queue by department, then order it by status.
create index if not exists complaints_department_id_idx
  on public.complaints (department_id, status);

-- ---------------------------------------------------------------------------
-- advance_complaint: the department's job now, with the admin as override
-- ---------------------------------------------------------------------------

-- The transitions are unchanged from 0007; who may perform them is not:
--
--     assigned    --start---> in_progress    admin, or staff of that department
--     assigned    --resolve-> resolved       "        (note still mandatory)
--     in_progress --resolve-> resolved       "
--
-- Everything else, `closed` included, still falls through to the rejection at
-- the bottom for everyone — which is why staff need no separate "may not close"
-- check. 0008 is the only door to closed.
create or replace function public.advance_complaint(
  p_complaint_id uuid,
  p_to_status    complaint_status,
  p_note         text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_admin boolean := public.is_admin();
  v_mine  uuid := public.my_department();
  v_from  complaint_status;
  v_dept  uuid;
  v_note  text := nullif(btrim(p_note), '');
begin
  -- The cheap half runs before the row is read, so a student cannot use this to
  -- probe which complaint ids exist. A staff member still can, one at a time,
  -- and learns only that something exists — no title, no status, no department.
  -- That is the price of having to read the row's department before the caller
  -- can be judged.
  if not v_admin and v_mine is null then
    raise exception 'Only the office or the assigned department can change a status.'
      using errcode = '42501';
  end if;

  select status, department_id into v_from, v_dept
  from public.complaints where id = p_complaint_id;
  if not found then
    raise exception 'That complaint does not exist.' using errcode = '23503';
  end if;

  if not v_admin and v_dept is distinct from v_mine then
    raise exception 'That complaint is not with your department.'
      using errcode = '42501';
  end if;

  if v_from = p_to_status then
    raise exception 'That complaint is already %.', p_to_status
      using errcode = '23514';
  end if;

  -- The whitelist. Everything else falls through to the rejection below.
  if v_from = 'assigned' and p_to_status = 'in_progress' then
    update public.complaints set status = 'in_progress' where id = p_complaint_id;

  elsif v_from in ('assigned', 'in_progress') and p_to_status = 'resolved' then
    -- A resolution with no note tells the student nothing.
    if v_note is null then
      raise exception 'Say what was done before marking it resolved.'
        using errcode = '23514';
    end if;
    update public.complaints
       set status          = 'resolved',
           resolution_note = v_note,
           resolved_at     = now()
     where id = p_complaint_id;

  else
    raise exception 'A complaint cannot go from % to %.', v_from, p_to_status
      using errcode = '23514';
  end if;

  insert into public.complaint_events
    (complaint_id, actor_id, type, from_status, to_status, note, is_internal)
  values (p_complaint_id, v_user, 'status', v_from, p_to_status, v_note, false);
end;
$$;

-- ---------------------------------------------------------------------------
-- add_complaint_note: same widening, same guard
-- ---------------------------------------------------------------------------

-- Staff need both kinds: "the part is on order" for the student, and "third
-- time this month on the same riser" for the record. Which one the student can
-- read is decided by the RLS policy above, not here.
create or replace function public.add_complaint_note(
  p_complaint_id uuid,
  p_note         text,
  p_is_internal  boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_admin boolean := public.is_admin();
  v_mine  uuid := public.my_department();
  v_dept  uuid;
  v_note  text := nullif(btrim(p_note), '');
begin
  if not v_admin and v_mine is null then
    raise exception 'Only the office or the assigned department can add a note.'
      using errcode = '42501';
  end if;

  if v_note is null then
    raise exception 'The note is empty.' using errcode = '23514';
  end if;

  select department_id into v_dept
  from public.complaints where id = p_complaint_id;
  if not found then
    raise exception 'That complaint does not exist.' using errcode = '23503';
  end if;

  if not v_admin and v_dept is distinct from v_mine then
    raise exception 'That complaint is not with your department.'
      using errcode = '42501';
  end if;

  insert into public.complaint_events
    (complaint_id, actor_id, type, note, is_internal)
  values (p_complaint_id, v_user, 'note', v_note, coalesce(p_is_internal, false));
end;
$$;

-- ---------------------------------------------------------------------------
-- return_to_office: not ours
-- ---------------------------------------------------------------------------

-- The alternative to letting staff reassign: a department handed a wiring job
-- that is actually a leak gives it back, with a reason.
--
-- It clears the department and puts the status back to `open`, so the complaint
-- reappears in the admin's Unassigned count. Once department_id is null it is
-- invisible to every staff member including the one who returned it, which is
-- what makes the handover real rather than a label.
create or replace function public.return_to_office(
  p_complaint_id uuid,
  p_reason       text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_mine   uuid := public.my_department();
  v_from   complaint_status;
  v_dept   uuid;
  v_reason text := nullif(btrim(p_reason), '');
begin
  -- Deliberately not `or is_admin()`: an admin has assign_complaint, which moves
  -- work without pretending a department refused it.
  if v_mine is null then
    raise exception 'Only a department can send a complaint back.'
      using errcode = '42501';
  end if;

  if v_reason is null then
    raise exception 'Say why it is not yours.' using errcode = '23514';
  end if;

  select status, department_id into v_from, v_dept
  from public.complaints where id = p_complaint_id;
  if not found then
    raise exception 'That complaint does not exist.' using errcode = '23503';
  end if;

  if v_dept is distinct from v_mine then
    raise exception 'That complaint is not with your department.'
      using errcode = '42501';
  end if;

  -- Handing back something resolved would drop the student's pending
  -- confirm-or-reopen decision; a closed one would reopen history.
  if v_from not in ('assigned', 'in_progress') then
    raise exception 'A % complaint cannot be sent back.', v_from
      using errcode = '23514';
  end if;

  -- Cleared with the department: it records when the complaint was handed to
  -- someone, and after a handback nobody has it.
  update public.complaints
     set department_id = null,
         status        = 'open',
         assigned_at   = null
   where id = p_complaint_id;

  -- Not internal. A complaint that drops back to Open after a week looks like
  -- nothing happened, and the reason is the explanation the student is owed.
  insert into public.complaint_events
    (complaint_id, actor_id, type, from_status, to_status, note, is_internal)
  values (p_complaint_id, v_user, 'returned', v_from, 'open', v_reason, false);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- anon never gets execute, so these are unreachable without a session even
-- before their own role checks run.

revoke all on function public.advance_complaint(uuid, complaint_status, text)
  from public, anon;
grant execute on function public.advance_complaint(uuid, complaint_status, text)
  to authenticated;

revoke all on function public.add_complaint_note(uuid, text, boolean)
  from public, anon;
grant execute on function public.add_complaint_note(uuid, text, boolean)
  to authenticated;

revoke all on function public.return_to_office(uuid, text) from public, anon;
grant execute on function public.return_to_office(uuid, text) to authenticated;
