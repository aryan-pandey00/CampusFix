-- 16. The owner can remove an account.
--
-- 0015 already taught the database what a person-shaped hole looks like, and
-- none of that cares whose hand is on the switch — which is why this file is
-- small.
--
-- No service_role key: a SECURITY DEFINER function owned by postgres may delete
-- from auth.users. The one difference from delete_own_account() is that the id
-- comes from an argument rather than auth.uid(), which is why every guard below
-- is re-checked rather than assumed from the caller's session.

-- ---------------------------------------------------------------------------
-- Deleting somebody else
-- ---------------------------------------------------------------------------

create or replace function public.delete_user_account(
  p_user     uuid,
  p_password text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_caller uuid := auth.uid();
  v_hash   text;
  v_role   user_role;
  v_super  boolean;
  v_name   text;
  v_email  text;
begin
  -- Owner only, the same gate as set_user_role(). An ordinary admin cannot even
  -- demote someone (0012), so letting one erase a person outright would be a
  -- larger power granted through a smaller door. is_admin() is deliberately not
  -- what is checked here.
  if not public.is_super_admin() then
    raise exception 'Only the owner can delete an account.' using errcode = '42501';
  end if;

  -- Sent to their own page rather than refused flatly: deleting your own account
  -- is a different flow with a different confirmation, and it exists.
  if p_user = v_caller then
    raise exception 'Delete your own account from your account page.'
      using errcode = '42501';
  end if;

  select role, is_super_admin, full_name
    into v_role, v_super, v_name
  from public.profiles where id = p_user;
  if not found then
    raise exception 'That account does not exist.' using errcode = '23503';
  end if;

  -- Unreachable in practice, because the owner is the only caller and the check
  -- above already refused self. Kept because it is the rule, not the situation:
  -- if a second owner ever became possible, this is what stops one erasing the
  -- other.
  if v_super then
    raise exception 'The owner account cannot be deleted.' using errcode = '42501';
  end if;

  -- The caller's own password, checked here and not only on the screen. Without
  -- it, a stolen owner cookie plus the anon key erases anybody. `is distinct
  -- from`, not `<>`: crypt(null, hash) is null, and a `<>` guard would not fire
  -- on a null password — the same trap 0015 fixed in two other places.
  select encrypted_password into v_hash from auth.users where id = v_caller;
  if v_hash is null or v_hash is distinct from crypt(p_password, v_hash) then
    raise exception 'That password is not right.' using errcode = '42501';
  end if;

  select email into v_email from auth.users where id = p_user;

  /*
    Logged BEFORE the delete, and with the name and email copied into `detail`.

    This is the part that is easy to get wrong. `admin_actions.target_id` became
    `on delete set null` in 0017, so that a deleted person could not break the
    role log — which means the instant this delete runs, a row identifying the
    target by id alone identifies nobody. The activity screen would show "the
    owner deleted a deleted account", and the single question this log exists to
    answer would be unanswerable the moment it mattered.

    So identity is captured as text at write time, exactly as set_user_role()
    stores a department by name rather than by id, and for the same reason: a log
    records what was true then. target_id is still set, and still goes null —
    it is the join for as long as it can be, and `detail` is the record after.
  */
  insert into public.admin_actions (actor_id, target_id, action, detail)
  values (
    v_caller,
    p_user,
    'account_deleted',
    jsonb_build_object(
      'name',  v_name,
      'email', v_email,
      'role',  v_role::text,
      'by',    'owner'
    )
  );

  delete from auth.users where id = p_user;
end;
$$;

revoke all on function public.delete_user_account(uuid, text) from public, anon;
grant execute on function public.delete_user_account(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- The other half of the same question
-- ---------------------------------------------------------------------------

-- delete_own_account() recorded nothing, which left the log half-built the
-- moment the owner could delete someone too: an admin looking at a complaint
-- with no reporter could see WHO removed the person if the owner did it, and
-- find nothing at all if they left on their own. Two ways for a reporter to
-- vanish and only one of them written down is worse than either answer.
--
-- Same action name and same shape, with 'by' telling the two apart, so the
-- activity screen renders one list and not two.
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
  v_role  user_role;
  v_name  text;
  v_email text;
begin
  if v_user is null then
    raise exception 'You must be signed in.' using errcode = '42501';
  end if;

  select is_super_admin, role, full_name
    into v_super, v_role, v_name
  from public.profiles where id = v_user;
  if not found then
    raise exception 'Your profile is missing. Sign out and back in.'
      using errcode = '42501';
  end if;

  if v_super then
    raise exception 'The owner account cannot be deleted.'
      using errcode = '42501';
  end if;

  select encrypted_password, email into v_hash, v_email
  from auth.users where id = v_user;
  if v_hash is null or v_hash is distinct from crypt(p_password, v_hash) then
    raise exception 'That password is not right.' using errcode = '42501';
  end if;

  -- actor and target are the same person, which is the honest record of what
  -- happened: nobody did this to them.
  insert into public.admin_actions (actor_id, target_id, action, detail)
  values (
    v_user, v_user, 'account_deleted',
    jsonb_build_object('name', v_name, 'email', v_email,
                       'role', v_role::text, 'by', 'self')
  );

  delete from auth.users where id = v_user;
end;
$$;

revoke all on function public.delete_own_account(text) from public, anon;
grant execute on function public.delete_own_account(text) to authenticated;
