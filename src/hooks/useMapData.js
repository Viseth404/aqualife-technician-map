// Loads and saves technicians + zones.
// - With Supabase: data is shared by all admins and updates live (Realtime).
// - Without Supabase ("demo mode"): data is kept in this browser only.
import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { starterTechnicians } from '../config';

const LOCAL_KEY = 'aqulife-map-data';

// ---- Convert between database rows (snake_case) and app objects ----
const techFromRow = (r) => ({
  id: r.id,
  name: r.name,
  phone: r.phone ?? '',
  color: r.color,
  photoUrl: r.photo_url ?? '',
  lat: r.lat,
  lng: r.lng,
  unavailableOn: r.unavailable_on, // "YYYY-MM-DD" the tech is off (undefined if column not added yet)
});
const techToRow = (t) => ({
  id: t.id,
  name: t.name,
  phone: t.phone,
  color: t.color,
  photo_url: t.photoUrl || null,
  lat: t.lat,
  lng: t.lng,
  // Only send this when known, so saving still works before migration 003 is run.
  ...(t.unavailableOn !== undefined && { unavailable_on: t.unavailableOn }),
});
const zoneFromRow = (r) => ({
  id: r.id,
  name: r.name,
  geojson: r.geojson, // GeoJSON Feature with a Polygon geometry
  mainTechnicianId: r.main_technician_id,
  backupTechnicianId: r.backup_technician_id,
});
const zoneToRow = (z) => ({
  id: z.id,
  name: z.name,
  geojson: z.geojson,
  main_technician_id: z.mainTechnicianId || null,
  backup_technician_id: z.backupTechnicianId || null,
  updated_at: new Date().toISOString(),
});

const customerFromRow = (r) => ({
  id: r.id,
  name: r.name,
  phone: r.phone ?? '',
  note: r.note ?? '',
  address: r.address ?? '',
  lat: r.lat,
  lng: r.lng,
  zoneId: r.zone_id,
  zoneName: r.zone_name ?? '',
  technicianId: r.technician_id,
  technicianName: r.technician_name ?? '',
  distanceKm: r.distance_km,
  fee: r.fee === null ? null : Number(r.fee),
  createdAt: r.created_at,
});
const customerToRow = (c) => ({
  id: c.id,
  name: c.name,
  phone: c.phone || null,
  note: c.note || null,
  address: c.address || null,
  lat: c.lat,
  lng: c.lng,
  zone_id: c.zoneId || null,
  zone_name: c.zoneName || null,
  technician_id: c.technicianId || null,
  technician_name: c.technicianName || null,
  distance_km: c.distanceKm ?? null,
  fee: c.fee ?? null,
});

// "Failed to fetch" (Chrome), "Load failed" (Safari), "NetworkError" (Firefox):
// the request never reached the server (Wi-Fi dropped, page reloading, …).
const isNetworkError = (e) => /failed to fetch|load failed|networkerror|network request failed/i.test(e?.message || '');

// Run a Supabase request; if the network hiccups, try again (up to 3 tries).
async function withRetry(makeRequest, tries = 3) {
  let result;
  for (let i = 0; i < tries; i++) {
    result = await makeRequest();
    if (!result.error || !isNetworkError(result.error)) return result;
    await new Promise((r) => setTimeout(r, 600 * (i + 1))); // wait 0.6s, 1.2s
  }
  return result;
}

// Insert or replace an item in a list by id.
const upsertById = (list, item) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

function readLocal() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_KEY));
    if (saved?.technicians) return saved;
  } catch {
    /* ignore broken data */
  }
  return { technicians: starterTechnicians, zones: [], customers: [] };
}

export function useMapData(enabled = true) {
  const [technicians, setTechnicians] = useState([]);
  const [zones, setZones] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ---------- Load data ----------
  useEffect(() => {
    if (!enabled) return;

    if (!isSupabaseConfigured) {
      const data = readLocal();
      setTechnicians(data.technicians);
      setZones(data.zones);
      setCustomers(data.customers ?? []);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const [techRes, zoneRes, custRes] = await Promise.all([
        supabase.from('technicians').select('*').order('created_at'),
        supabase.from('zones').select('*').order('created_at'),
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
      ]);
      if (cancelled) return;
      if (techRes.error || zoneRes.error) setError((techRes.error || zoneRes.error).message);
      else if (custRes.error) {
        // Most likely the customers table was not created yet.
        setError('Saved customers are not set up yet: run supabase/migrations/002_customers.sql in Supabase (SQL Editor).');
      }
      setTechnicians((techRes.data ?? []).map(techFromRow));
      setZones((zoneRes.data ?? []).map(zoneFromRow));
      setCustomers((custRes.data ?? []).map(customerFromRow));
      setLoading(false);
    })();

    // Live updates: when another admin changes something, update our map too.
    const channel = supabase
      .channel('map-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'technicians' }, (p) => {
        if (p.eventType === 'DELETE') setTechnicians((l) => l.filter((x) => x.id !== p.old.id));
        else setTechnicians((l) => upsertById(l, techFromRow(p.new)));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zones' }, (p) => {
        if (p.eventType === 'DELETE') setZones((l) => l.filter((x) => x.id !== p.old.id));
        else setZones((l) => upsertById(l, zoneFromRow(p.new)));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (p) => {
        if (p.eventType === 'DELETE') setCustomers((l) => l.filter((x) => x.id !== p.old.id));
        else setCustomers((l) => upsertById(l, customerFromRow(p.new)));
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [enabled]);

  // Demo mode: save to the browser whenever data changes.
  useEffect(() => {
    if (isSupabaseConfigured || loading) return;
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify({ technicians, zones, customers }));
    } catch {
      /* storage full or blocked: ignore */
    }
  }, [technicians, zones, customers, loading]);

  // Show database errors in the UI instead of failing silently.
  // Returns true if the save worked.
  const report = ({ error: e }, what) => {
    if (e) {
      console.error(`[Aqualife] saving ${what} failed:`, e);
      setError(
        isNetworkError(e)
          ? `Could not save ${what}: no connection to the database. Check your internet and try again.`
          : /unavailable_on/.test(e.message)
            ? '"Available today" is not set up yet: run supabase/migrations/003_technician_availability.sql in Supabase (SQL Editor).'
            : `Could not save ${what}: ${e.message}`,
      );
    }
    return !e;
  };

  // ---------- Save actions (update screen first, then database) ----------
  const saveTechnician = useCallback(async (tech) => {
    let previous;
    setTechnicians((l) => {
      previous = l.find((x) => x.id === tech.id);
      return upsertById(l, tech);
    });
    if (isSupabaseConfigured) {
      const ok = report(await withRetry(() => supabase.from('technicians').upsert(techToRow(tech))), 'technician');
      // Database said no: put the old values back so the screen matches the database.
      if (!ok && previous) setTechnicians((l) => upsertById(l, previous));
      return ok;
    }
    return true;
  }, []);

  const deleteTechnician = useCallback(async (id) => {
    setTechnicians((l) => l.filter((t) => t.id !== id));
    // Their zones become unassigned (the database does this too with "on delete set null").
    setZones((l) =>
      l.map((z) => ({
        ...z,
        mainTechnicianId: z.mainTechnicianId === id ? null : z.mainTechnicianId,
        backupTechnicianId: z.backupTechnicianId === id ? null : z.backupTechnicianId,
      })),
    );
    if (isSupabaseConfigured) report(await withRetry(() => supabase.from('technicians').delete().eq('id', id)), 'technician');
  }, []);

  const saveZone = useCallback(async (zone) => {
    setZones((l) => upsertById(l, zone));
    if (isSupabaseConfigured) report(await withRetry(() => supabase.from('zones').upsert(zoneToRow(zone))), 'zone');
  }, []);

  const deleteZone = useCallback(async (id) => {
    setZones((l) => l.filter((z) => z.id !== id));
    if (isSupabaseConfigured) report(await withRetry(() => supabase.from('zones').delete().eq('id', id)), 'zone');
  }, []);

  const saveCustomer = useCallback(async (customer) => {
    const withDate = { createdAt: new Date().toISOString(), ...customer };
    if (isSupabaseConfigured) {
      const ok = report(await withRetry(() => supabase.from('customers').upsert(customerToRow(withDate))), 'customer');
      if (!ok) return false; // don't show it in the list if the database said no
    }
    setCustomers((l) => upsertById(l, withDate));
    return true;
  }, []);

  const deleteCustomer = useCallback(async (id) => {
    setCustomers((l) => l.filter((c) => c.id !== id));
    if (isSupabaseConfigured) report(await withRetry(() => supabase.from('customers').delete().eq('id', id)), 'customer');
  }, []);

  return {
    technicians,
    zones,
    customers,
    saveCustomer,
    deleteCustomer,
    loading,
    error,
    clearError: () => setError(null),
    saveTechnician,
    deleteTechnician,
    saveZone,
    deleteZone,
  };
}
