-- 15. Leaving.
--
-- Run this, then RE-RUN 0008, which changed.
--
-- Deleting an account is a schema decision, not a button. `reporter_id` was
-- `not null ... on delete cascade`, so a delete would have taken every
-- complaint that person filed, every resolution note on them, and every
-- timeline row hanging off them.
--
-- So: the person goes, the record stays, and the record stops carrying a name.

-- ---------------------------------------------------------------------------
-- 1. The record outlives the person
-- ---------------------------------------------------------------------------

alter table public.complaints alter column reporter_id drop not null;

alter table public.complaints drop constraint if exists complaints_reporter_id_fkey;
alter table public.complaints add constraint complaints_reporter_id_fkey
  foreign key (reporter_id) references public.profiles (id) on delete set null;

-- No hole on the way in: create_complaint() takes the reporter from auth.uid()
-- and refuses a null one, and complaints_insert checks `reporter_id =
-- auth.uid()`, which is NULL — not true — for a null reporter. Only a delete
-- can null it.

-- ---------------------------------------------------------------------------
-- 2. The same for the role log — the FK that would otherwise refuse
-- ---------------------------------------------------------------------------

-- 0014 made actor_id and target_id `not null` with no on-delete rule, which is
-- NO ACTION — so anyone whose role has ever been changed could not be deleted
-- at all, failing on a foreign key at the very end of the flow.
--
-- Cascade would be the wrong repair: it deletes the evidence. Set null, like
-- complaints — the change stays on the record, without a name on it.
alter table public.admin_actions alter column actor_id  drop not null;
alter table public.admin_actions alter column target_id drop not null;

alter table public.admin_actions drop constraint if exists admin_actions_actor_id_fkey;
alter table public.admin_actions add constraint admin_actions_actor_id_fkey
  foreign key (actor_id) references public.profiles (id) on delete set null;

alter table public.admin_actions drop constraint if exists admin_actions_target_id_fkey;
alter table public.admin_actions add constraint admin_actions_target_id_fkey
  foreign key (target_id) references public.profiles (id) on delete set null;

-- In practice only target_id is ever nulled: the actor is always the owner, who
-- cannot delete themselves.

-- ---------------------------------------------------------------------------
-- 3. Deleting yourself, and nobody else
-- ---------------------------------------------------------------------------

-- crypt() lives in the extensions schema on Supabase. Idempotent; a no-op on a
-- project that already has it, wherever it was installed.
create extension if not exists pgcrypto with schema extensions;

-- SECURITY DEFINER because auth.users is not reachable any other way. The
-- function is the whole boundary, so it re-checks everything rather than
-- trusting the screen that called it.
create or replace function public.delete_own_account(p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user  uuid := auth.uid();
  v_super boolean;
  v_hash  text;
begin
  -- No p_user argument: the only account this can delete is the caller's.
  if v_user is null then
    raise exception 'You must be signed in.' using errcode = '42501';
  end if;

  select is_super_admin into v_super from public.profiles where id = v_user;
  if not found then
    raise exception 'Your profile is missing. Sign out and back in.'
      using errcode = '42501';
  end if;

  -- The owner cannot leave. Nothing in the app can grant is_super_admin, and
  -- profiles_one_super_admin stops a replacement being flagged, so this would
  -- permanently leave nobody able to change anyone's role.
  if v_super then
    raise exception 'The owner account cannot be deleted.'
      using errcode = '42501';
  end if;

  -- Re-authentication inside the boundary. The screen asks too, but a screen
  -- asking is not enforcement: without this a stolen session cookie could
  -- delete the account with the anon key and no password.
  --
  -- `is distinct from`, not `<>`: crypt(null, hash) is null, and `hash <> null`
  -- is NULL rather than true, so a `<>` guard would NOT fire on a null
  -- password and the function would go on to delete the account. That is the
  -- same trap this migration fixes in 0008 — see the note there.
  select encrypted_password into v_hash from auth.users where id = v_user;
  if v_hash is null or v_hash is distinct from crypt(p_password, v_hash) then
    raise exception 'That password is not right.' using errcode = '42501';
  end if;

  -- Cascades to profiles (0001), which in turn nulls reporter_id on the
  -- complaints, actor_id on the timeline, created_by on announcements and
  -- target_id on the role log. The complaints, notes and timelines all stay.
  delete from auth.users where id = v_user;
end;
$$;

revoke all on function public.delete_own_account(text) from public, anon;
grant execute on function public.delete_own_account(text) to authenticated;

-- Photos are deliberately not deleted. A photo is evidence on a complaint that
-- survives, and complaint_photos_select (0011) matches objects by path against
-- the complaint, not against the uploader — so an admin and the holding
-- department can still open it after the reporter is gone.

-- ---------------------------------------------------------------------------
-- 4. The dead end that 1–3 would otherwise create
-- ---------------------------------------------------------------------------

-- Not optional once deletion exists.
--
-- `closed` is on no whitelist in advance_complaint() — 0011 says so in as many
-- words — because confirm_complaint() (0008) is deliberately the only door to
-- it, and that door is reporter-only. So a complaint that was resolved and then
-- had its reporter deleted is stuck at `resolved` forever: it can never be
-- closed, it sits in the office's "Awaiting confirmation" tile and in the
-- department's queue permanently, and nothing in the app can clear it.
--
-- The deck's promise is that the student has the last word. This does not break
-- it: there is no student left to have it. The office gets the last word only
-- when the person who was owed it is gone, and the note on the event says so
-- rather than letting a closure look like a confirmation.
create or replace function public.close_abandoned_complaint(p_complaint_id uuid)
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
  -- The office, not the department. A department closing its own work with no
  -- student to check it is exactly the thing the five-state loop exists to
  -- prevent, reporter or no reporter.
  if not public.is_admin() then
    raise exception 'Only the maintenance office can close an abandoned complaint.'
      using errcode = '42501';
  end if;

  select reporter_id, status into v_reporter, v_status
  from public.complaints where id = p_complaint_id;
  if not found then
    raise exception 'That complaint does not exist.' using errcode = '23503';
  end if;

  -- The narrow condition that makes this legitimate. `is not null`, so a
  -- complaint that still has a reporter is refused and confirm_complaint stays
  -- the only door for everybody else.
  if v_reporter is not null then
    raise exception 'That complaint still has a reporter, and only they can confirm the fix.'
      using errcode = '42501';
  end if;

  if v_status <> 'resolved' then
    raise exception 'Only a resolved complaint can be closed, not a % one.',
      v_status using errcode = '23514';
  end if;

  update public.complaints
     set status = 'closed', closed_at = now()
   where id = p_complaint_id;

  -- A `status` event, not `confirmed`. Nobody confirmed anything, and a
  -- `confirmed` row would render as "confirmed the fix" against an admin's
  -- name — a closure dressed up as a student's approval.
  insert into public.complaint_events
    (complaint_id, actor_id, type, from_status, to_status, note, is_internal)
  values (
    p_complaint_id, v_user, 'status', 'resolved', 'closed',
    'Closed by the office. The student who reported this deleted their account, so there is nobody left to confirm the fix.',
    false
  );
end;
$$;

revoke all on function public.close_abandoned_complaint(uuid) from public, anon;
grant execute on function public.close_abandoned_complaint(uuid) to authenticated;
