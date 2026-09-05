-- 13. Who the owner is.
--
-- Two steps, in order. Step 1 flags a demo account so the owner-only rules can
-- be tested from a session that IS the owner. Step 2 hands ownership to the
-- real address afterwards, leaving the demo admin an ordinary admin.
--
-- Only one account can carry the flag — profiles_one_super_admin (0012) is a
-- unique index — so step 2 clears the old one first, in the same transaction.

-- ---------------------------------------------------------------------------
-- STEP 1 — the demo owner, for verification
-- ---------------------------------------------------------------------------

update public.profiles p
   set role = 'admin', is_super_admin = true
  from auth.users u
 where u.id = p.id
   and u.email = 'admin@campusfix.app';

-- ---------------------------------------------------------------------------
-- STEP 2 — hand it over. Uncomment, put the real address in, run.
-- ---------------------------------------------------------------------------
--
-- update public.profiles set is_super_admin = false where is_super_admin;
--
-- update public.profiles p
--    set role = 'admin', is_super_admin = true
--   from auth.users u
--  where u.id = p.id
--    and u.email = 'you@example.com';

-- Either way, this should return exactly one row.
select u.email, p.role, p.is_super_admin
  from public.profiles p
  join auth.users u on u.id = p.id
 where p.is_super_admin;
