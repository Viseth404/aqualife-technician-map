-- =============================================================
-- Aqualife: saved customers (from "Customer Check")
-- Run once: Supabase dashboard > SQL Editor > New query > paste > Run
-- =============================================================

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
