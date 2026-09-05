-- 18. Accounts that cannot delete themselves.
--
-- The README publishes three demo logins so a visitor can see all three roles
-- without signing up. That makes every account-level action on those accounts
-- reachable by anyone, and one of them is irreversible: deleting an account
-- nulls reporter_id on every complaint it filed, permanently, and re-registering
-- the same email gives a new id that the old complaints will never point at.
--
-- A changed password or a changed name is recoverable from the dashboard in
-- seconds. A deleted account is not, so that is the one guarded here.
--
-- The owner is deliberately still allowed to delete a protected account through
-- admin_delete_account(): the flag stops the account removing itself, not the
-- person who owns the project from administering it.

-- ---------------------------------------------------------------------------
-- The flag
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists is_protected boolean not null default false;

comment on column public.profiles.is_protected is
  'A shared demo account. Cannot delete itself; the owner can still delete it.';

-- ---------------------------------------------------------------------------
-- Frozen against the application, like role and department
-- ---------------------------------------------------------------------------
--
-- profiles_update_own (0002) lets any user update their own row. Without this,
-- a visitor signed in as a demo account would simply set is_protected to false
-- with one PATCH and then delete it — the guard below would be decoration.
--
-- No door for set_user_role() either: nothing in the app grants or clears this.
-- It is set here, by hand, the same way the owner flag is.

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

  if new.is_protected is distinct from old.is_protected
     and auth.uid() is not null then
    raise exception 'the protected flag cannot be changed through the application'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Refuse self-deletion
-- ---------------------------------------------------------------------------
--
-- Unchanged from 0015 except for the one check. Checked in the same select as
-- the owner flag, so a protected account is refused before its password is even
-- read — there is nothing to brute force here.

create or replace function public.delete_own_account(p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user      uuid := auth.uid();
  v_super     boolean;
  v_protected boolean;
  v_hash      text;
begin
  -- No p_user argument: the only account this can delete is the caller's.
  if v_user is null then
    raise exception 'You must be signed in.' using errcode = '42501';
  end if;

  select is_super_admin, is_protected
    into v_super, v_protected
    from public.profiles where id = v_user;
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

  if v_protected then
    raise exception 'This is a shared demo account and cannot be deleted.'
      using errcode = '42501';
  end if;

  -- Re-authentication inside the boundary. The screen asks too, but a screen
  -- asking is not enforcement: without this a stolen session cookie could
  -- delete the account with the anon key and no password.
  --
  -- `is distinct from`, not `<>`: crypt(null, hash) is null, and `hash <> null`
  -- is NULL rather than true, so a `<>` guard would NOT fire on a null
  -- password and the function would go on to delete the account.
  select encrypted_password into v_hash from auth.users where id = v_user;
  if v_hash is null or v_hash is distinct from crypt(p_password, v_hash) then
    raise exception 'That password is not right.' using errcode = '42501';
  end if;

  delete from auth.users where id = v_user;
end;
$$;

revoke all on function public.delete_own_account(text) from public, anon;
grant execute on function public.delete_own_account(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Flag the three accounts the README hands out
-- ---------------------------------------------------------------------------
--
-- By email, from auth.users, because that is what the README publishes. Set
-- here rather than through the app: the trigger above freezes this column for
-- every request that arrives with a session, and the SQL editor has none.

update public.profiles p
   set is_protected = true
  from auth.users u
 where u.id = p.id
   and u.email in (
     'student@campusfix.app',
     'admin@campusfix.app',
     'electrical@campusfix.app'
   );

-- Should return three rows, all true.
select u.email, p.role, p.is_protected
  from public.profiles p
  join auth.users u on u.id = p.id
 where p.is_protected;
