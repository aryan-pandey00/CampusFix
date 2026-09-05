-- 4. Seed data: departments and locations.
--
-- Safe to re-run: rows are matched on slug and updated in place, so renaming
-- one here and re-running is the supported way to fix a name. Ids never change,
-- so existing complaints follow along.

-- ---------------------------------------------------------------------------
-- Departments
-- ---------------------------------------------------------------------------
-- To retire one, set is_active = false rather than deleting it, so old
-- assignments keep resolving.
--
-- SLUGS ARE FROZEN and deliberately do not match the names — `civil` displays
-- as "Building & Infrastructure". Renaming is safe; changing a slug would
-- insert a second row and orphan every complaint pointing at the first.

insert into public.departments (name, slug) values
  ('Electrical Services',      'electrical'),
  ('Plumbing Services',        'plumbing'),
  ('Carpentry & Furniture',    'carpentry'),
  ('IT & Network Support',     'it-network'),
  ('Cleaning & Housekeeping',  'housekeeping'),
  ('Building & Infrastructure','civil'),
  ('General Maintenance',      'general')
on conflict (slug) do update set name = excluded.name;

-- ---------------------------------------------------------------------------
-- Locations — the real places on campus
-- ---------------------------------------------------------------------------
-- requires_detail decides whether the report form demands a second field, and
-- detail_label is the question it asks. The rule for a new location: a place
-- with parts a technician has to be sent to asks which part; a single space
-- does not. The library and the parking ask, but never block a complaint.
--
-- sort_order is spaced by 10 so a location can be slotted in without
-- renumbering.

insert into public.locations
  (name, slug, kind, requires_detail, detail_label, detail_hint, sort_order)
values
  -- "Where in the block?" and not "Room number": a washroom, a corridor and a
  -- lift are all in a block and none of them has one.
  ('Block A', 'block-a', 'academic', true,
   'Where in the block?', 'Room 204, or the second-floor washroom', 10),
  ('Block B', 'block-b', 'academic', true,
   'Where in the block?', 'Room 204, or the second-floor washroom', 20),
  ('Block C', 'block-c', 'academic', true,
   'Where in the block?', 'Room 204, or the second-floor washroom', 30),
  ('Block D', 'block-d', 'academic', true,
   'Where in the block?', 'Room 204, or the second-floor washroom', 40),
  ('Block E', 'block-e', 'academic', true,
   'Where in the block?', 'Room 204, or the second-floor washroom', 50),
  ('Block F', 'block-f', 'academic', true,
   'Where in the block?', 'Room 204, or the second-floor washroom', 60),
  ('Boys Hostel', 'boys-hostel', 'residence', true,
   'Where in the hostel?', 'Room 112, or the ground-floor washroom', 70),

  -- One entry for every lab on campus. There are too many across departments to
  -- list, so the student types which one.
  ('Lab', 'lab', 'academic', true,
   'Which lab?', 'OS Lab, Lab 8', 80),

  ('Central Library', 'central-library', 'facility', false,
   'Where in the library?', 'Reading hall, or the first floor', 90),

  -- Separate from the central library, and separate per department, so the
  -- student says which one.
  ('Department Library', 'department-library', 'facility', true,
   'Which department?', 'B.Tech, B.Pharma', 100),

  -- Canteen and cafeteria are one place under one manager, so one row.
  ('Canteen', 'canteen', 'facility', false, null, null, 110),
  ('Playground', 'playground', 'facility', false, null, null, 120),
  ('Parking', 'parking', 'facility', false,
   'Which part?', 'Two-wheeler area, or the visitor bay', 130),
  ('Stationery Shop', 'stationery-shop', 'facility', false, null, null, 140)
on conflict (slug) do update set
  name            = excluded.name,
  kind            = excluded.kind,
  requires_detail = excluded.requires_detail,
  detail_label    = excluded.detail_label,
  detail_hint     = excluded.detail_hint,
  sort_order      = excluded.sort_order;
