-- 9. Demo data. Sample data, skippable.
--
-- RE-RUNNING REGENERATES: every [demo] complaint is deleted and rebuilt, and
-- the delete is scoped to the rows this file created, so real complaints are
-- never touched. Remove it before a real pilot with:
--
--     delete from public.complaints where description like '%[demo]%';
--
-- SQL rather than a script driving the API, because complaints are backdated
-- and create_complaint() always stamps now(). Reporters are drawn round-robin
-- from whichever student profiles exist. No photos — storage objects cannot be
-- seeded from SQL.

do $$
declare
  v_students uuid[];
  v_admin    uuid;
  r          record;
  v_id       uuid;
  v_loc      uuid;
  v_dept     uuid;
  v_created  timestamptz;
  v_assigned timestamptz;
  v_started  timestamptz;
  v_resolved timestamptz;
  v_closed   timestamptz;
  i          int := 0;
begin
  -- Dashboard-created accounts have no profile form behind them, so they arrive
  -- with a null full_name and the queue reads "(no name)". Give every nameless
  -- student a plausible one, in creation order, so "Reported by" looks like a
  -- real campus rather than a test fixture.
  with unnamed as (
    select id, row_number() over (order by created_at) as n
    from public.profiles
    where role = 'student' and (full_name is null or btrim(full_name) = '')
  ), names as (
    select * from (values
      (1,'Rahul Verma','2400901539011'),  (2,'Priya Sharma','2400901539012'),
      (3,'Aman Gupta','2400901539013'),   (4,'Sneha Singh','2400901539014'),
      (5,'Vikram Yadav','2400901539015'), (6,'Neha Chauhan','2400901539016'),
      (7,'Rohit Kumar','2400901539017'),  (8,'Anjali Mishra','2400901539018'),
      (9,'Kartik Nair','2400901539019'),  (10,'Divya Menon','2400901539020')
    ) as t(n, full_name, roll_no)
  )
  update public.profiles p
     set full_name = names.full_name,
         roll_no   = coalesce(p.roll_no, names.roll_no)
    from unnamed join names on names.n = unnamed.n
   where p.id = unnamed.id;

  -- Regenerate from scratch, so the round-robin below covers every student who
  -- exists now rather than only those who existed the first time this ran.
  -- This is also what makes the per-row "skip if it exists" check unnecessary.
  delete from public.complaints where description like '%[demo]%';

  select array_agg(id order by created_at) into v_students
  from public.profiles where role = 'student';

  select id into v_admin
  from public.profiles where role = 'admin' order by created_at limit 1;

  if v_students is null or array_length(v_students, 1) = 0 or v_admin is null then
    raise exception 'Need at least one student profile and one admin profile first.';
  end if;

  for r in
    select * from (values
      -- title, description, category, priority, location, detail, target, days ago, department, resolution
      ('Tube light flickering in the front row','Flickers constantly, hard to read the board.','electrical','medium','block-b','204','closed',53,'electrical','Replaced the starter and the tube.'),
      ('Fan making a loud grinding noise','Sounds like the bearing is gone. Cannot hear the lecture.','electrical','high','block-a','108','closed',51,'electrical','Greased the bearing and tightened the mount.'),
      ('Tap in the corridor will not close','Running continuously since morning, water everywhere.','plumbing','urgent','block-c','Ground floor','closed',49,'plumbing','Replaced the washer and the spindle.'),
      ('Projector shows a blue screen only','HDMI input not detected from any laptop.','it_network','high','lab','OS Lab','closed',46,'it-network','Replaced the HDMI cable and reset the projector.'),
      ('Bench broken at the back','Two students cannot sit, the seat plank has cracked.','carpentry','medium','block-d','301','closed',44,'carpentry','Replaced the plank and repainted.'),
      ('Wi-Fi keeps dropping every few minutes','Cannot stay connected long enough to submit anything.','it_network','high','central-library',null,'closed',41,'it-network','Replaced the access point on that floor.'),
      ('Water cooler not cooling','Water comes out warm all day.','electrical','medium','canteen',null,'closed',38,'electrical','Compressor gas refilled.'),
      ('Toilet flush not working','Second cubicle, flush handle does nothing.','plumbing','high','block-e','Ground floor','closed',35,'plumbing','Replaced the flush valve.'),

      ('Seepage patch spreading on the wall','Damp patch above the window, growing each week.','civil','medium','block-b','210','resolved',31,'civil','Sealed from outside and replastered. Watch it through the next rain.'),
      ('Classroom not swept for three days','Dust and wrappers everywhere.','housekeeping','medium','block-f','405','resolved',28,'housekeeping','Added the room to the daily round.'),
      ('Printer jams on every second page','Paper feed pulls two sheets at once.','it_network','low','department-library','B.Tech','resolved',24,'it-network','Cleaned the feed rollers.'),
      ('Floor tile cracked near the entrance','Sharp edge sticking up, someone will trip.','civil','high','block-a','Ground floor','resolved',21,'civil','Tile replaced and grouted.'),

      ('Door lock jammed, room cannot be secured','Key turns but the bolt does not move.','carpentry','high','block-c','112','in_progress',17,'carpentry',null),
      ('No water in the washroom since morning','Taps dry on the whole floor.','plumbing','urgent','boys-hostel','Second floor','in_progress',15,'plumbing',null),
      ('Lab PCs very slow to log in','Takes almost ten minutes per machine.','it_network','medium','lab','Programming Lab','in_progress',12,'it-network',null),

      ('Switchboard sparked when plugging in','Visible spark and a burning smell.','electrical','urgent','block-d','208','assigned',9,'electrical',null),
      ('Garbage bins not emptied all week','Overflowing and smelling near the stairs.','housekeeping','high','block-e','Ground floor','assigned',7,'housekeeping',null),
      ('Cupboard door hinge broken','Door hangs off and will not shut.','carpentry','low','department-library','B.Pharma','assigned',6,'carpentry',null),

      ('Benches missing from the classroom','Only twelve benches for forty students.','other','high','block-f','402','open',5,null,null),
      ('Mosquitoes very bad in the evening','Standing water nearby, impossible to study.','housekeeping','medium','boys-hostel','Common room','open',4,null,null),
      ('Parking area has a large pothole','Bikes are getting stuck in it.','civil','medium','parking',null,'open',3,null,null),
      ('Stationery shop shutter stuck halfway','Cannot open fully, shop is half shut.','carpentry','low','stationery-shop',null,'open',2,null,null),

      ('Fan in the corner does not run at all','Regulator turns but nothing happens.','electrical','high','block-a','108','reopened',26,'electrical','Replaced the capacitor.'),
      ('Drain blocked outside the canteen','Water pooling across the walkway.','plumbing','high','canteen',null,'reopened',19,'plumbing','Cleared the blockage.')
    ) as t(title, descr, category, priority, loc_slug, detail, target, days_ago, dept_slug, note)
  loop
    select id into v_loc from public.locations where slug = r.loc_slug;
    if v_loc is null then
      raise exception 'Unknown location slug: %', r.loc_slug;
    end if;

    v_dept := null;
    if r.dept_slug is not null then
      select id into v_dept from public.departments where slug = r.dept_slug;
    end if;

    i := i + 1;
    v_created  := now() - (r.days_ago || ' days')::interval;
    v_assigned := v_created  + interval '5 hours';
    v_started  := v_assigned + interval '1 day 2 hours';
    v_resolved := v_started  + interval '1 day 6 hours';
    v_closed   := v_resolved + interval '20 hours';

    insert into public.complaints (
      reporter_id, title, description, category, priority,
      location_id, location_detail, status, department_id,
      resolution_note, created_at, assigned_at, resolved_at, closed_at, reopen_count
    ) values (
      v_students[1 + (i % array_length(v_students, 1))],
      r.title,
      r.descr || '  [demo]',
      r.category::category,
      r.priority::priority,
      v_loc,
      r.detail,
      case r.target when 'reopened' then 'open' else r.target end::complaint_status,
      v_dept,
      case when r.target in ('resolved', 'closed') then r.note else null end,
      v_created,
      case when r.target <> 'open' then v_assigned else null end,
      case when r.target in ('resolved', 'closed') then v_resolved else null end,
      case when r.target = 'closed' then v_closed else null end,
      case when r.target = 'reopened' then 1 else 0 end
    )
    returning id into v_id;

    -- The timeline. Every status a complaint passed through leaves an event,
    -- backdated to when it would have happened, so the student's timeline and
    -- the reports both read as a real history rather than a snapshot.
    insert into public.complaint_events
      (complaint_id, actor_id, type, from_status, to_status, note, is_internal, created_at)
    values (v_id, v_students[1 + (i % array_length(v_students, 1))],
            'created', null, 'open', null, false, v_created);

    if r.target <> 'open' then
      insert into public.complaint_events
        (complaint_id, actor_id, type, from_status, to_status, is_internal, created_at)
      values (v_id, v_admin, 'assigned', 'open', 'assigned', false, v_assigned);
    end if;

    if r.target in ('in_progress', 'resolved', 'closed', 'reopened') then
      insert into public.complaint_events
        (complaint_id, actor_id, type, from_status, to_status, is_internal, created_at)
      values (v_id, v_admin, 'status', 'assigned', 'in_progress', false, v_started);
    end if;

    if r.target in ('resolved', 'closed', 'reopened') then
      insert into public.complaint_events
        (complaint_id, actor_id, type, from_status, to_status, note, is_internal, created_at)
      values (v_id, v_admin, 'status', 'in_progress', 'resolved', r.note, false, v_resolved);
    end if;

    if r.target = 'closed' then
      insert into public.complaint_events
        (complaint_id, actor_id, type, from_status, to_status, is_internal, created_at)
      values (v_id, v_students[1 + (i % array_length(v_students, 1))],
              'confirmed', 'resolved', 'closed', false, v_closed);
    end if;

    if r.target = 'reopened' then
      insert into public.complaint_events
        (complaint_id, actor_id, type, from_status, to_status, note, is_internal, created_at)
      values (v_id, v_students[1 + (i % array_length(v_students, 1))],
              'reopened', 'resolved', 'open',
              'Still not right — it worked for a day and then went back to how it was.',
              false, v_resolved + interval '2 days');
    end if;

    -- A couple of internal notes, so the "hidden from the student" behaviour is
    -- visible during a demo rather than only in a test.
    if i % 7 = 0 then
      insert into public.complaint_events
        (complaint_id, actor_id, type, note, is_internal, created_at)
      values (v_id, v_admin, 'note',
              'Contractor quoted twice the usual rate. Checking with accounts before approving.',
              true, v_assigned + interval '3 hours');
    end if;
  end loop;

  raise notice 'inserted % demo complaints', i;
end $$;

-- ---------------------------------------------------------------------------
-- Repair: every complaint must open with a `created` event
-- ---------------------------------------------------------------------------
-- An early test fixture inserted CF-0002 directly, without a timeline, because
-- at that point it only existed to prove one student cannot see another's.
-- A complaint with an empty timeline contradicts the rule the whole product
-- rests on, and during a demo it just looks broken.
--
-- Written as a general backfill rather than a fix for one ticket: anything that
-- ever reaches the database without an opening event gets one, stamped to when
-- the complaint was actually filed.

insert into public.complaint_events
  (complaint_id, actor_id, type, from_status, to_status, is_internal, created_at)
select c.id, c.reporter_id, 'created', null, 'open', false, c.created_at
from public.complaints c
where not exists (
  select 1 from public.complaint_events e where e.complaint_id = c.id
);

-- What the seed produced.
select
  status,
  count(*) as complaints,
  count(*) filter (where department_id is null) as unassigned
from public.complaints
group by status
order by
  array_position(array['open','assigned','in_progress','resolved','closed']::text[], status::text);
