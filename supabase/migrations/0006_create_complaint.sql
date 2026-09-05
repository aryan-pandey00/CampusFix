-- 6. Filing a complaint.
--
-- A function rather than two inserts from the app: complaint_events has no
-- insert policy for anyone, and the complaint and its `created` event have to
-- be written in one transaction or a failure between them leaves a complaint
-- with no history.
--
-- SECURITY DEFINER, so RLS does not apply inside it. Everything it trusts is
-- checked here.

create or replace function public.create_complaint(
  p_title           text,
  p_description     text,
  p_category        category,
  p_priority        priority,
  p_location_id     uuid,
  p_location_detail text default null,
  p_photo_path      text default null
)
returns table (complaint_id uuid, ticket_no text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user            uuid := auth.uid();
  v_requires_detail boolean;
  v_detail          text := nullif(btrim(p_location_detail), '');
  v_new             public.complaints%rowtype;
begin
  -- From the session, never an argument: that is what stops one student filing
  -- under another's name.
  if v_user is null then
    raise exception 'You must be signed in to file a complaint.'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = v_user) then
    raise exception 'Your profile is missing. Sign out and back in.'
      using errcode = '42501';
  end if;

  -- Also reads requires_detail from the database rather than the browser.
  select requires_detail into v_requires_detail
  from public.locations
  where id = p_location_id and is_active;

  if not found then
    raise exception 'That location does not exist.' using errcode = '23503';
  end if;

  if v_requires_detail and v_detail is null then
    raise exception 'That location needs a room or area detail.'
      using errcode = '23514';
  end if;

  -- The bucket policy enforces this on upload; re-checking stops someone
  -- pointing their complaint at another student's object.
  if p_photo_path is not null
     and p_photo_path not like v_user::text || '/%' then
    raise exception 'That photo does not belong to you.' using errcode = '42501';
  end if;

  if btrim(coalesce(p_title, '')) = '' then
    raise exception 'A title is required.' using errcode = '23514';
  end if;

  insert into public.complaints (
    reporter_id, title, description, category, priority,
    location_id, location_detail, photo_path
  )
  values (
    v_user, btrim(p_title), btrim(p_description), p_category, p_priority,
    p_location_id, v_detail, p_photo_path
  )
  returning * into v_new;

  -- Same transaction. A complaint without its opening event cannot exist.
  insert into public.complaint_events (
    complaint_id, actor_id, type, to_status, is_internal
  )
  values (v_new.id, v_user, 'created', 'open', false);

  return query select v_new.id, v_new.ticket_no;
end;
$$;

-- anon is never granted execute, so this is unreachable without a session.
revoke all on function public.create_complaint(
  text, text, category, priority, uuid, text, text) from public, anon;
grant execute on function public.create_complaint(
  text, text, category, priority, uuid, text, text) to authenticated;
