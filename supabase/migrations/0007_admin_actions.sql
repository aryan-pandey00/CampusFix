-- 7. The admin's three actions: assign, move the status, add a note.
--
-- All SECURITY DEFINER, for the same reasons as create_complaint: the status
-- change and its timeline event must land in one transaction. Because DEFINER
-- skips RLS, each function re-checks is_admin() — the same helper the policies
-- use, so "admin" has one definition.
--
-- The legal transitions. Anything not listed is rejected here, not merely
-- hidden in the UI:
--
--     open        --assign--> assigned      (needs a department)
--     assigned    --start---> in_progress
--     assigned    --resolve-> resolved      (needs a resolution note)
--     in_progress --resolve-> resolved      (needs a resolution note)
--
-- resolved -> closed and resolved -> open belong to the student (0008).

-- ---------------------------------------------------------------------------
-- Assign, or re-assign, a department
-- ---------------------------------------------------------------------------

create or replace function public.assign_complaint(
  p_complaint_id  uuid,
  p_department_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_status complaint_status;
  v_dept   uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can assign a complaint.' using errcode = '42501';
  end if;

  select status, department_id into v_status, v_dept
  from public.complaints where id = p_complaint_id;
  if not found then
    raise exception 'That complaint does not exist.' using errcode = '23503';
  end if;

  if not exists (
    select 1 from public.departments where id = p_department_id and is_active
  ) then
    raise exception 'That department does not exist.' using errcode = '23503';
  end if;

  -- Re-assigning something resolved or closed would rewrite history.
  if v_status not in ('open', 'assigned', 'in_progress') then
    raise exception 'A % complaint cannot be assigned.', v_status
      using errcode = '23514';
  end if;

  -- Only when the status would not move. A reopened complaint comes back as
  -- `open` while KEEPING its department, so assigning it to that same
  -- department is what carries it back to assigned — not a no-op. Guarding it
  -- would strand every reopened complaint.
  if v_status <> 'open' and v_dept is not distinct from p_department_id then
    raise exception 'That complaint is already with this department.'
      using errcode = '23514';
  end if;

  if v_status = 'open' then
    -- First assignment, or the one after a reopen: either way, a status change.
    update public.complaints
       set department_id = p_department_id,
           status        = 'assigned',
           assigned_at   = now()
     where id = p_complaint_id;

    insert into public.complaint_events
      (complaint_id, actor_id, type, from_status, to_status, is_internal)
    values (p_complaint_id, v_user, 'assigned', 'open', 'assigned', false);
  else
    -- Re-assignment: the department moves, the status does not.
    update public.complaints
       set department_id = p_department_id
     where id = p_complaint_id;

    insert into public.complaint_events
      (complaint_id, actor_id, type, is_internal)
    values (p_complaint_id, v_user, 'assigned', false);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Move the status along the loop
-- ---------------------------------------------------------------------------

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
  v_user uuid := auth.uid();
  v_from complaint_status;
  v_note text := nullif(btrim(p_note), '');
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change a status.' using errcode = '42501';
  end if;

  select status into v_from
  from public.complaints where id = p_complaint_id;
  if not found then
    raise exception 'That complaint does not exist.' using errcode = '23503';
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
-- Add a note without changing anything
-- ---------------------------------------------------------------------------

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
  v_user uuid := auth.uid();
  v_note text := nullif(btrim(p_note), '');
begin
  if not public.is_admin() then
    raise exception 'Only an admin can add a note.' using errcode = '42501';
  end if;

  if v_note is null then
    raise exception 'The note is empty.' using errcode = '23514';
  end if;

  if not exists (select 1 from public.complaints where id = p_complaint_id) then
    raise exception 'That complaint does not exist.' using errcode = '23503';
  end if;

  -- is_internal is enforced by the RLS policy on complaint_events, not here.
  insert into public.complaint_events
    (complaint_id, actor_id, type, note, is_internal)
  values (p_complaint_id, v_user, 'note', v_note, coalesce(p_is_internal, false));
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- anon never gets execute, so these are unreachable without a session.

revoke all on function public.assign_complaint(uuid, uuid) from public, anon;
grant execute on function public.assign_complaint(uuid, uuid) to authenticated;

revoke all on function public.advance_complaint(uuid, complaint_status, text)
  from public, anon;
grant execute on function public.advance_complaint(uuid, complaint_status, text)
  to authenticated;

revoke all on function public.add_complaint_note(uuid, text, boolean)
  from public, anon;
grant execute on function public.add_complaint_note(uuid, text, boolean)
  to authenticated;
