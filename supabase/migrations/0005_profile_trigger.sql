-- 5. Create a profile row automatically on sign-up.
--
-- Without it a user can authenticate but has no profile, so every RLS policy
-- that joins to profiles treats them as a stranger.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- SECURITY: `role` is deliberately absent. raw_user_meta_data is whatever the
  -- client passed to signUp() and is attacker-controlled — reading a role from
  -- it would let anyone create an admin account. The column default ('student')
  -- is the only thing that sets a role here.
  insert into public.profiles (id, full_name, roll_no, phone)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'roll_no'),   ''),
    nullif(trim(new.raw_user_meta_data ->> 'phone'),     '')
  )
  on conflict (id) do nothing;   -- keeps hand-made test profiles intact

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
