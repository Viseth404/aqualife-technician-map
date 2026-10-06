-- =============================================================
-- Aqualife: super admin role + app settings (delivery pricing, office)
-- Run once: Supabase dashboard > SQL Editor > New query > paste > Run
-- (Run 004 and 005 first if you haven't.)
--
--   superadmin  everything an admin can do, plus: manage staff accounts
--               (in the app) and change settings (delivery prices, office).
--   admin       unchanged
--   sales / technician  unchanged (phone screen, read-only)
-- =============================================================

-- 1. Allow the new role.
alter table public.staff drop constraint if exists staff_role_check;
alter table public.staff add constraint staff_role_check
  check (role in ('superadmin', 'admin', 'sales', 'technician'));

-- 2. Super admins can do everything admins can.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.staff where user_id = auth.uid() and role in ('admin', 'superadmin')) $$;

create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.staff where user_id = auth.uid() and role = 'superadmin') $$;

revoke execute on function public.is_superadmin() from public, anon;
grant execute on function public.is_superadmin() to authenticated;

-- 3. Make the owner super admin: if nobody is super admin yet, promote the first admin.
--    To choose someone else instead, run:
--      update public.staff set role = 'superadmin' where email = 'you@example.com';
update public.staff set role = 'superadmin'
where not exists (select 1 from public.staff where role = 'superadmin')
  and user_id = (select user_id from public.staff where role = 'admin' order by added_at, email limit 1);

-- 4. Settings the super admin can change in the app.
create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid()
);
alter table public.app_settings enable row level security;

drop policy if exists "staff read settings" on public.app_settings;
drop policy if exists "superadmin add settings" on public.app_settings;
drop policy if exists "superadmin edit settings" on public.app_settings;
create policy "staff read settings"      on public.app_settings for select to authenticated using (public.is_staff());
create policy "superadmin add settings"  on public.app_settings for insert to authenticated with check (public.is_superadmin());
create policy "superadmin edit settings" on public.app_settings for update to authenticated using (public.is_superadmin()) with check (public.is_superadmin());

-- Starting values (same prices for moto and car – change them in the app: Settings > Delivery).
insert into public.app_settings (key, value) values
  ('delivery', '{
    "vehicles": {
      "moto": { "enabled": true, "rows": [{"upToKm":20,"fee":0},{"upToKm":25,"fee":5},{"upToKm":30,"fee":10},{"upToKm":35,"fee":15},{"upToKm":40,"fee":20}], "beyond": {"everyKm":5,"fee":5} },
      "car":  { "enabled": true, "rows": [{"upToKm":20,"fee":0},{"upToKm":25,"fee":5},{"upToKm":30,"fee":10},{"upToKm":35,"fee":15},{"upToKm":40,"fee":20}], "beyond": {"everyKm":5,"fee":5} }
    }
  }'::jsonb),
  ('office', '{"name":"AquaLife (Cambodia) Co.,Ltd","lat":11.5537869,"lng":104.9208086}'::jsonb)
on conflict (key) do nothing;

-- Live updates when settings change.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'app_settings') then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end $$;

-- 5. Saved customers remember which vehicle the price was for.
alter table public.customers add column if not exists vehicle text check (vehicle in ('moto', 'car'));

-- 6. Show the staff list.
select email, role, added_at from public.staff order by role, email;
