-- 14. The one thing that happens off the complaint record.
--
-- Every complaint_events row needs a complaint_id, so that table cannot record
-- the thing an owner would most want to look up: who made this person an admin.
--
-- This closes that gap and only that gap. Announcements and department edits
-- stay unlogged on purpose — both are reversible and low-stakes, and a log that
-- covers complaints and role changes honestly beats one called "audit" that
-- quietly misses three tables.

create table if not exists public.admin_actions (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid not null references public.profiles (id),
  target_id  uuid not null references public.profiles (id),
  action     text not null,   -- 'role_change' is the only one so far
  detail     jsonb not null,  -- { from, to, department }
  created_at timestamptz not null default now()
);

create index if not exists admin_actions_created_at_idx
  on public.admin_actions (created_at desc);

alter table public.admin_actions enable row level security;

drop policy if exists admin_actions_select on public.admin_actions;
create policy admin_actions_select on public.admin_actions
  for select to authenticated
  using (public.is_admin());

-- Deliberately no insert, update or delete policy. Rows are written only by
-- set_user_role(), which is SECURITY DEFINER and so runs outside RLS. The table
-- is append-only to one function, unwritable by hand even for an admin, and
-- undeletable by anyone at all through the API. That is the whole point of it.

-- ---------------------------------------------------------------------------
-- set_user_role writes its own record
-- ---------------------------------------------------------------------------

-- Unchanged from 0012 except for the insert at the end. Five lines inside a
-- function that already exists, rather than a trigger on profiles: the trigger
-- would have to reconstruct *why* the row changed, and this function already
-- knows.
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

  if p_user = v_caller then
    raise exception 'You cannot change your own role.' using errcode = '42501';
  end if;

  select is_super_admin, role, department_id
    into v_super, v_role, v_dept
  from public.profiles where id = p_user;
  if not found then
    raise exception 'That account does not exist.' using errcode = '23503';
  end if;

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

  if v_role = p_role
     and (p_role <> 'staff' or v_dept is not distinct from p_department) then
    raise exception 'That account is already set that way.'
      using errcode = '23514';
  end if;

  perform set_config('campusfix.role_change', 'allow', true);
  update public.profiles
     set role          = p_role,
         department_id = case when p_role = 'staff' then p_department end
   where id = p_user;
  perform set_config('campusfix.role_change', '', true);

  -- The department's NAME, not its id. A log records what was true at the time,
  -- and an id would have to be joined against a table that can be renamed
  -- afterwards — which would silently rewrite history. The id is not worth
  -- keeping alongside it: nothing on the screen links from a role change to a
  -- department.
  insert into public.admin_actions (actor_id, target_id, action, detail)
  values (
    v_caller,
    p_user,
    'role_change',
    jsonb_build_object(
      'from', v_role::text,
      'to',   p_role::text,
      'department',
      case
        when p_role = 'staff'
        then (select name from public.departments where id = p_department)
      end
    )
  );
end;
$$;

revoke all on function public.set_user_role(uuid, user_role, uuid)
  from public, anon;
grant execute on function public.set_user_role(uuid, user_role, uuid)
  to authenticated;
