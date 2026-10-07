-- =============================================================
-- Aqualife: sales + technicians can SEE saved customers on their phone map
-- Run once: Supabase dashboard > SQL Editor > New query > paste > Run
-- (Run 004, 005, 006 first if you haven't.)
--
-- Before: only admins could read saved customers.
-- After:  all staff can read them (name, phone, address on the map dots).
--         Adding, editing, and deleting customers stays admins-only.
-- =============================================================

drop policy if exists "admins read customers" on public.customers;
drop policy if exists "staff read customers" on public.customers;
create policy "staff read customers" on public.customers
  for select to authenticated using (public.is_staff());

-- (Unchanged: "admins add/edit/delete customers" policies from 005.)
select 'Staff can now read saved customers' as result;
