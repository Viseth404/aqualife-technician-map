-- =============================================================
-- Aqualife: only listed admins can use the data
-- Run once: Supabase dashboard > SQL Editor > New query > paste > Run
--
-- Before: any logged-in account could read/change everything.
-- After:  only accounts in public.admins can. A stranger who signs up gets nothing.
-- =============================================================

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
