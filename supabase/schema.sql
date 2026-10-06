-- =============================================================
-- Aqualife Technician Map – Supabase database setup
-- Run once: Supabase dashboard > SQL Editor > New query > paste > Run
-- =============================================================

-- Technicians -------------------------------------------------
create table if not exists public.technicians (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  color       text not null default '#2563eb' check (color ~ '^#[0-9a-fA-F]{6}$'),
  photo_url   text,
  lat         double precision,   -- pin location on the map
  lng         double precision,
  created_at  timestamptz not null default now()
);

-- Zones (stored as a GeoJSON Feature with a Polygon geometry) ---
create table if not exists public.zones (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  geojson               jsonb not null,
  main_technician_id    uuid references public.technicians(id) on delete set null,
  backup_technician_id  uuid references public.technicians(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint zones_geojson_is_polygon check (
    geojson->>'type' = 'Feature' and geojson->'geometry'->>'type' = 'Polygon'
  )
);

-- Security: only signed-in admins can read or change data ------
alter table public.technicians enable row level security;
alter table public.zones       enable row level security;

create policy "admins read technicians"   on public.technicians for select to authenticated using (true);
create policy "admins add technicians"    on public.technicians for insert to authenticated with check (true);
create policy "admins edit technicians"   on public.technicians for update to authenticated using (true) with check (true);
create policy "admins delete technicians" on public.technicians for delete to authenticated using (true);

create policy "admins read zones"   on public.zones for select to authenticated using (true);
create policy "admins add zones"    on public.zones for insert to authenticated with check (true);
create policy "admins edit zones"   on public.zones for update to authenticated using (true) with check (true);
create policy "admins delete zones" on public.zones for delete to authenticated using (true);

-- Live updates: every admin sees changes without refreshing ------
alter publication supabase_realtime add table public.technicians, public.zones;

-- Starting technicians (edit phones / photos later in the app) ---
insert into public.technicians (id, name, phone, color, lat, lng) values
  ('6f1c2b1e-0001-4a51-9a10-000000000001', 'Jenny',  '012 000 001', '#2563eb', 11.575, 104.920),
  ('6f1c2b1e-0002-4a51-9a10-000000000002', 'Vuthy',  '012 000 002', '#1e3a8a', 11.545, 104.905),
  ('6f1c2b1e-0003-4a51-9a10-000000000003', 'Dara',   '012 000 003', '#16a34a', 11.530, 104.940),
  ('6f1c2b1e-0004-4a51-9a10-000000000004', 'Sophea', '012 000 004', '#ea580c', 11.590, 104.950)
on conflict (id) do nothing;

-- Saved customers (same as migrations/002_customers.sql) ------

create table if not exists public.customers (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  phone            text,
  note             text,
  address          text,
  lat              double precision not null,
  lng              double precision not null,
  -- Zone + technician at the time of saving. Names are copied too,
  -- so the record still makes sense if a zone/technician is renamed or deleted.
  zone_id          uuid references public.zones(id) on delete set null,
  zone_name        text,
  technician_id    uuid references public.technicians(id) on delete set null,
  technician_name  text,
  distance_km      double precision,
  fee              numeric(10, 2),
  created_by       uuid default auth.uid(),
  created_at       timestamptz not null default now()
);

alter table public.customers enable row level security;

create policy "admins read customers"   on public.customers for select to authenticated using (true);
create policy "admins add customers"    on public.customers for insert to authenticated with check (true);
create policy "admins edit customers"   on public.customers for update to authenticated using (true) with check (true);
create policy "admins delete customers" on public.customers for delete to authenticated using (true);

alter publication supabase_realtime add table public.customers;

-- "Available today" switch (same as migrations/003_technician_availability.sql)
alter table public.technicians add column if not exists unavailable_on date;

-- Admins only (same as migrations/004_admin_allowlist.sql) -------

-- 1. The admin list (by Supabase user id; email kept just for reading).
create table if not exists public.admins (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  email     text,
  added_at  timestamptz not null default now()
);
-- Nobody can read or change this list through the app; manage it here in the dashboard.
alter table public.admins enable row level security;

-- 2. "Is the logged-in person an admin?"
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 3. Make everyone who has an account RIGHT NOW an admin.
--    ⚠️ Check the list printed at the end and remove anyone you don't know.
insert into public.admins (user_id, email)
select id, email from auth.users
on conflict (user_id) do nothing;

-- 4. Replace the old "any logged-in user" rules with "admins only".
do $$
declare
  t text;
begin
  foreach t in array array['technicians', 'zones', 'customers'] loop
    execute format('drop policy if exists "admins read %1$s"   on public.%1$I', t);
    execute format('drop policy if exists "admins add %1$s"    on public.%1$I', t);
    execute format('drop policy if exists "admins edit %1$s"   on public.%1$I', t);
    execute format('drop policy if exists "admins delete %1$s" on public.%1$I', t);
    execute format('create policy "admins read %1$s"   on public.%1$I for select to authenticated using (public.is_admin())', t);
    execute format('create policy "admins add %1$s"    on public.%1$I for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "admins edit %1$s"   on public.%1$I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "admins delete %1$s" on public.%1$I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- 5. Show the admin list. Remove a stranger with:
--      delete from public.admins where email = 'stranger@example.com';
select email, added_at from public.admins order by added_at;

-- ---------------------------------------------------------------
-- LATER: to add a new admin
--   1) Authentication > Users > Add user (email + password, tick Auto Confirm)
--   2) Run:  insert into public.admins (user_id, email)
--            select id, email from auth.users where email = 'new.admin@example.com';
-- ---------------------------------------------------------------
