-- 2. Row level security policies.
--
-- Safe to re-run: every policy is dropped first. Access rules live here rather
-- than in the UI so a bug in a component cannot leak one student's complaints
-- to another.

-- ---------------------------------------------------------------------------
-- Who is an admin?
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER is required: policies on `profiles` call this, and it reads
-- `profiles` — without it that recurses forever. `set search_path` is required
-- too, or a caller could point it at their own table and become admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Privilege escalation guard: the policy above would otherwise let a student
-- set their own role to 'admin'.
--
-- A trigger, not a REVOKE. A column-level revoke does nothing while Supabase's
-- table-level UPDATE grant exists, and a table-level revoke silently changes
-- nothing because Postgres only revokes grants issued by the running role. Both
-- were tested and both failed open.
--
-- auth.uid() is null outside a PostgREST request, so the SQL editor can still
-- set roles by hand. That is how the first admin is made.
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
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- No insert policy: rows come from the sign-up trigger (0005), which is
-- SECURITY DEFINER. No delete policy: it would orphan a complaint history.

-- ---------------------------------------------------------------------------
-- departments and locations — reference data
-- ---------------------------------------------------------------------------

drop policy if exists departments_select on public.departments;
create policy departments_select on public.departments
  for select to authenticated
  using (true);

drop policy if exists departments_write on public.departments;
create policy departments_write on public.departments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists locations_select on public.locations;
create policy locations_select on public.locations
  for select to authenticated
  using (true);

drop policy if exists locations_write on public.locations;
create policy locations_write on public.locations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- complaints
-- ---------------------------------------------------------------------------

drop policy if exists complaints_select on public.complaints;
create policy complaints_select on public.complaints
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

-- The with check runs against the row being written, so passing someone else's
-- reporter_id fails here rather than being silently accepted.
drop policy if exists complaints_insert_own on public.complaints;
create policy complaints_insert_own on public.complaints
  for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists complaints_update_admin on public.complaints;
create policy complaints_update_admin on public.complaints
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Deliberately NO student update policy, though students confirm and reopen.
-- RLS cannot express "status went resolved -> closed and nothing else changed":
-- USING sees the old row, WITH CHECK the new one, and neither compares them. So
-- a student policy would let them rewrite title or priority through PostgREST.
-- 0008 gives them SECURITY DEFINER functions instead.

-- No delete policy for anyone. Complaints are history.

-- ---------------------------------------------------------------------------
-- complaint_events — the timeline
-- ---------------------------------------------------------------------------

-- Readable when the parent complaint is; internal notes are admin-only. The
-- subquery obeys the complaints policies, so the two rules stay in sync.
drop policy if exists complaint_events_select on public.complaint_events;
create policy complaint_events_select on public.complaint_events
  for select to authenticated
  using (
    (not is_internal or public.is_admin())
    and exists (
      select 1 from public.complaints c
      where c.id = complaint_id
        and (c.reporter_id = auth.uid() or public.is_admin())
    )
  );

-- No insert, update or delete policy for anyone. The timeline is append-only:
-- events are written only by SECURITY DEFINER functions, in the same
-- transaction as the change they record.
