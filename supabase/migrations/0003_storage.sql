-- 3. The private photo bucket.
--
-- PRIVATE, permanently. Photos are served as short-lived signed URLs generated
-- server-side, and generating one requires select on the object — which is why
-- the select policy below decides who can see what.
--
-- Path convention, enforced by the policies: <user-uuid>/<filename>. The first
-- folder segment IS the owner's id, which is what makes "your own photos only"
-- expressible as a policy.

-- ---------------------------------------------------------------------------
-- The bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'complaint-photos',
  'complaint-photos',
  false,                                              -- private, permanently
  5242880,                                            -- 5 MB ceiling
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public             = false,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Enforced by storage itself. The client also compresses, but a client-side
-- limit is a courtesy — anyone can skip it by calling the API directly.

-- ---------------------------------------------------------------------------
-- Object policies
-- ---------------------------------------------------------------------------

-- A student writes into their own folder and nowhere else.
drop policy if exists complaint_photos_insert on storage.objects;
create policy complaint_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'complaint-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- The owner and any admin can read. Everyone else, including anonymous
-- visitors who guess a path, gets nothing.
drop policy if exists complaint_photos_select on storage.objects;
create policy complaint_photos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'complaint-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- No update or delete policy. A photo is evidence attached to a complaint; the
-- student should not be able to remove it after an admin has acted on it.
