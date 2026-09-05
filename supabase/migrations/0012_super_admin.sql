-- 12. Users, and one owner who cannot be removed.
--
-- There is no fourth role. The owner is an ordinary `admin` carrying a flag, so
-- is_admin() and every policy written against it keep working, and the flag
-- gates exactly one function.
--
--   * only the owner can change anyone's role
--   * nobody can change the owner's role, including the owner
--   * nobody can grant or revoke the flag itself through the app, at all
--
-- All three are enforced in Postgres rather than by hiding a button: an admin
-- who calls the function directly with the anon key is refused.

-- ---------------------------------------------------------------------------
-- The flag
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

-- At most one owner: a second could demote the first. A constraint, not a
-- convention — a partial unique index on a constant, so every flagged row
-- collides on the same key.
create unique index if not exists profiles_one_super_admin
  on public.profiles ((true))
  where is_super_admin;

-- Same shape as is_admin() and my_department(), for the same two reasons.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_super_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- The guard gains exactly one door
-- ---------------------------------------------------------------------------

-- 0002 froze `role` and 0011 froze `department_id`. Both now have to be
-- writable by one function and nothing else, so the freeze is conditional on a
-- transaction-local setting that only set_user_role() sets.
--
-- A setting rather than trusting SECURITY DEFINER: DEFINER changes which role
-- runs the UPDATE, but auth.uid() still returns the caller, so to the trigger
-- set_user_role's UPDATE looks exactly like a PATCH sent by hand. `true` as the
-- third argument makes the setting die with the transaction.
--
-- is_super_admin gets no door. Nothing in the app writes it.
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_permitted boolean :=
    coalesce(current_setting('campusfix.role_change', true), '') = 'allow';
begin
  if auth.uid() is not null and not v_permitted then
    if new.role is distinct from old.role then
      raise exception 'role cannot be changed through the application'
        using errcode = '42501';
    end if;
    if new.department_id is distinct from old.department_id then
      raise exception 'department cannot be changed through the application'
        using errcode = '42501';
    end if;
  end if;

  if new.is_super_admin is distinct from old.is_super_admin
     and auth.uid() is not null then
    raise exception 'the owner flag cannot be changed through the application'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- ---------------------------------------------------------------------------
-- set_user_role: the only way a role changes
-- ---------------------------------------------------------------------------

-- One UPDATE, because they are one fact: profiles_staff_has_department (0011)
-- refuses a staff row with no department, so two statements could never get
-- from student to staff.
create or replace function public.set_user_role(
  p_user       uuid,
  p_role       user_role,
  p_department uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_super  boolean;
  v_role   user_role;
  v_dept   uuid;
begin
  if not public.is_super_admin() then
    raise exception 'Only the owner can change roles.' using errcode = '42501';
  end if;

  -- Against locking yourself out. The owner check below already covers today's
  -- owner; this holds if the flag ever moves.
  if p_user = v_caller then
    raise exception 'You cannot change your own role.' using errcode = '42501';
  end if;

  select is_super_admin, role, department_id
    into v_super, v_role, v_dept
  from public.profiles where id = p_user;
  if not found then
    raise exception 'That account does not exist.' using errcode = '23503';
  end if;

  -- "Nobody can remove me."
  if v_super then
    raise exception 'The owner cannot be demoted.' using errcode = '42501';
  end if;

  if p_role = 'staff' then
    if p_department is null then
      raise exception 'Pick a department for a department account.'
        using errcode = '23514';
    end if;
    if not exists (
      select 1 from public.departments where id = p_department and is_active
    ) then
      raise exception 'That department does not exist.' using errcode = '23503';
    end if;
  elsif p_department is not null then
    raise exception 'Only a department account has a department.'
      using errcode = '23514';
  end if;

  -- A no-op is refused rather than recorded. Moving a staff member between
  -- departments is NOT a no-op, which is why the department is part of
  -- the comparison and not just the role.
  if v_role = p_role
     and (p_role <> 'staff' or v_dept is not distinct from p_department) then
    raise exception 'That account is already set that way.'
      using errcode = '23514';
  end if;

  perform set_config('campusfix.role_change', 'allow', true);
  update public.profiles
     set role          = p_role,
         -- Cleared on the way out of staff: they are not in that department any
         -- more, and leaving it behind would be a stale fact on the row.
         department_id = case when p_role = 'staff' then p_department end
   where id = p_user;
  perform set_config('campusfix.role_change', '', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_list_users: the roster, with the one field that is not in profiles
-- ---------------------------------------------------------------------------

-- Email lives in auth.users, which PostgREST does not expose — for good reason.
-- The alternative was copying it into profiles on sign-up, which means two
-- copies of one fact and a silent drift the first time an address changes. This
-- reads it where it lives.
--
-- Being SECURITY DEFINER over auth.users is exactly why the admin check is the
-- first statement, and why search_path is pinned. anon never gets execute, so
-- this is unreachable without a session before its own check even runs.
create or replace function public.admin_list_users()
returns table (
  id             uuid,
  full_name      text,
  roll_no        text,
  phone          text,
  email          text,
  role           user_role,
  department_id  uuid,
  department     text,
  is_super_admin boolean,
  created_at     timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can list users.' using errcode = '42501';
  end if;

  return query
    select p.id,
           p.full_name,
           p.roll_no,
           p.phone,
           u.email::text,
           p.role,
           p.department_id,
           d.name,
           p.is_super_admin,
           p.created_at
      from public.profiles p
      join auth.users u on u.id = p.id
      left join public.departments d on d.id = p.department_id
     order by p.created_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;

revoke all on function public.set_user_role(uuid, user_role, uuid)
  from public, anon;
grant execute on function public.set_user_role(uuid, user_role, uuid)
  to authenticated;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

-- ---------------------------------------------------------------------------
-- Flagging the owner
-- ---------------------------------------------------------------------------
--
-- Nothing in this file sets the flag. It is set once by hand, which is the same
-- door the first admin came through: auth.uid() is null in the SQL editor, so
-- the trigger above lets it past, and nothing in the running app can do it.
--
-- See 0013_owner_bootstrap.sql, which flags a demo account so the rules can
-- actually be tested, and carries the one statement that hands ownership to a
-- real address afterwards. No real address is written into this repo —
-- CLAUDE.md keeps the authors unidentifiable, and an email is a name.
