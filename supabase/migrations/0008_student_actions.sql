-- 8. The student closes the loop.
--
-- The last two transitions, and the only two that belong to the student:
--
--     resolved --confirm--> closed
--     resolved --reopen---> open     (needs a reason; keeps the department)
--
-- Separate functions rather than arguments to advance_complaint() because the
-- actor rule is the opposite: that one refuses anyone who is not an admin,
-- these refuse anyone who is not the reporter. An admin cannot confirm a fix on
-- a student's behalf.

-- ---------------------------------------------------------------------------
-- Confirm: the fix is real, close it
-- ---------------------------------------------------------------------------

create or replace function public.confirm_complaint(p_complaint_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_reporter uuid;
  v_status   complaint_status;
begin
  if v_user is null then
    raise exception 'You must be signed in.' using errcode = '42501';
  end if;

  select reporter_id, status into v_reporter, v_status
  from public.complaints where id = p_complaint_id;
  if not found then
    raise exception 'That complaint does not exist.' using errcode = '23503';
  end if;

  -- Deliberately not `or is_admin()`. Only the person who reported the problem
  -- can say it is fixed.
  -- `is distinct from`, not `<>`. reporter_id became nullable in 0015 so a
  -- complaint can outlive the person who filed it — and `null <> uuid` is
  -- NULL, not true, so a `<>` guard would NOT fire on an orphaned complaint
  -- and this function would go on to close it for whoever happened to ask.
  -- Any signed-in user could have confirmed a stranger's complaint.
  if v_reporter is distinct from v_user then
    raise exception 'Only the student who reported this can confirm it.'
      using errcode = '42501';
  end if;

  if v_status <> 'resolved' then
    raise exception 'Only a resolved complaint can be confirmed, not a % one.',
      v_status using errcode = '23514';
  end if;

  update public.complaints
     set status = 'closed', closed_at = now()
   where id = p_complaint_id;

  insert into public.complaint_events
    (complaint_id, actor_id, type, from_status, to_status, is_internal)
  values (p_complaint_id, v_user, 'confirmed', 'resolved', 'closed', false);
end;
$$;

-- ---------------------------------------------------------------------------
-- Reopen: it is not actually fixed
-- ---------------------------------------------------------------------------

create or replace function public.reopen_complaint(
  p_complaint_id uuid,
  p_reason       text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_reporter uuid;
  v_status   complaint_status;
  v_reason   text := nullif(btrim(p_reason), '');
begin
  if v_user is null then
    raise exception 'You must be signed in.' using errcode = '42501';
  end if;

  select reporter_id, status into v_reporter, v_status
  from public.complaints where id = p_complaint_id;
  if not found then
    raise exception 'That complaint does not exist.' using errcode = '23503';
  end if;

  -- `is distinct from`, not `<>`, for the reason recorded in confirm_complaint
  -- above: an orphaned complaint would otherwise pass this guard.
  if v_reporter is distinct from v_user then
    raise exception 'Only the student who reported this can reopen it.'
      using errcode = '42501';
  end if;

  if v_status <> 'resolved' then
    raise exception 'Only a resolved complaint can be reopened, not a % one.',
      v_status using errcode = '23514';
  end if;

  -- A reopen with no reason puts the complaint back in the queue with no clue
  -- what is still wrong, which wastes the next visit exactly as the first one
  -- was wasted.
  if v_reason is null then
    raise exception 'Say what is still wrong.' using errcode = '23514';
  end if;

  -- department_id is deliberately untouched: the same department that thought
  -- it was done is the one that should look again.
  --
  -- resolution_note and resolved_at ARE cleared, because they now describe
  -- something that turned out not to be true, and the detail screen would
  -- otherwise show "What was done" on a complaint that is not done. Nothing is
  -- lost: the old note is preserved on the `status` event in the timeline.
  update public.complaints
     set status          = 'open',
         reopen_count    = reopen_count + 1,
         resolution_note = null,
         resolved_at     = null
   where id = p_complaint_id;

  insert into public.complaint_events
    (complaint_id, actor_id, type, from_status, to_status, note, is_internal)
  values (p_complaint_id, v_user, 'reopened', 'resolved', 'open', v_reason, false);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.confirm_complaint(uuid) from public, anon;
grant execute on function public.confirm_complaint(uuid) to authenticated;

revoke all on function public.reopen_complaint(uuid, text) from public, anon;
grant execute on function public.reopen_complaint(uuid, text) to authenticated;
