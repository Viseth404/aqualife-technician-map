-- =============================================================
-- Aqualife: staff roles – admin / sales / technician
-- Run once: Supabase dashboard > SQL Editor > New query > paste > Run
-- (Run 004_admin_allowlist.sql first if you haven't.)
--
--   admin       everything (same as before)
--   sales       read zones + technicians only (price check on the phone screen)
--   technician  read zones + technicians only (price check on the phone screen)
--
-- Saved customers (names, phones) stay admin-only.
-- =============================================================

-- 1. Staff list with a role (replaces the old "admins" list).
create table if not exists public.staff (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  email     text,
  role      text not null check (role in ('admin', 'sales', 'technician')),
  added_at  timestamptz not null default now()
);
-- Nobody can read or change this list through the app; manage it here in the dashboard.
alter table public.staff enable row level security;

-- 2. Everyone who was an admin stays an admin.
do $$
begin
  if to_regclass('public.admins') is not null then
    insert into public.staff (user_id, email, role)
    select user_id, email, 'admin' from public.admins
    on conflict (user_id) do nothing;
  end if;
end $$;

-- 3. Helper checks used by the rules below (and by the app to pick the screen).
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.staff where user_id = auth.uid() $$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.staff where user_id = auth.uid()) $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.staff where user_id = auth.uid() and role = 'admin') $$;

revoke execute on function public.my_role(), public.is_staff(), public.is_admin() from public, anon;
grant execute on function public.my_role(), public.is_staff(), public.is_admin() to authenticated;

-- 4. Rules:
--    technicians + zones: all staff can READ, only admins can change.
--    customers: admins only.
do $$
declare
  t text;
begin
  foreach t in array array['technicians', 'zones', 'customers'] loop
    execute format('drop policy if exists "admins read %1$s"   on public.%1$I', t);
    execute format('drop policy if exists "staff read %1$s"    on public.%1$I', t);
    execute format('drop policy if exists "admins add %1$s"    on public.%1$I', t);
    execute format('drop policy if exists "admins edit %1$s"   on public.%1$I', t);
    execute format('drop policy if exists "admins delete %1$s" on public.%1$I', t);
    if t = 'customers' then
      execute format('create policy "admins read %1$s" on public.%1$I for select to authenticated using (public.is_admin())', t);
    else
      execute format('create policy "staff read %1$s"  on public.%1$I for select to authenticated using (public.is_staff())', t);
    end if;
    execute format('create policy "admins add %1$s"    on public.%1$I for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "admins edit %1$s"   on public.%1$I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "admins delete %1$s" on public.%1$I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- 5. The old list is no longer used.
drop table if exists public.admins;

-- 6. Show the staff list.
select email, role, added_at from public.staff order by role, email;

-- ---------------------------------------------------------------
-- ADD A STAFF MEMBER
--   1) Authentication > Users > Add user (email + password, tick Auto Confirm)
--   2) Run (role = 'admin', 'sales' or 'technician'):
--        insert into public.staff (user_id, email, role)
--        select id, email, 'sales' from auth.users where email = 'sales1@example.com';
--
-- CHANGE A ROLE
--        update public.staff set role = 'technician' where email = 'someone@example.com';
--
-- REMOVE ACCESS
--        delete from public.staff where email = 'someone@example.com';
--      (and delete the user in Authentication > Users)
-- ---------------------------------------------------------------
