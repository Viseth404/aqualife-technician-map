-- =============================================================
-- Aqualife: "Available today" switch for technicians
-- Run once: Supabase dashboard > SQL Editor > New query > paste > Run
-- =============================================================

-- The date a technician is NOT available. If it is today, they are off;
-- any other date (or empty) means available. So it resets every day by itself.
alter table public.technicians add column if not exists unavailable_on date;
