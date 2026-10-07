// App settings the super admin can change in the app (Settings page):
//   delivery – price tables per vehicle (moto, car), and whether provinces are accepted
//   office   – office name + location (distances are measured from here)
// Stored in Supabase table app_settings (migration 006). Values from src/config.js
// are used until then, and in demo mode (saved in this browser).
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { config } from '../config';
import { isInPhnomPenh } from './geo';
import { isSupabaseConfigured, supabase } from './supabase';

export const VEHICLES = ['moto', 'car'];

export const DEFAULT_SETTINGS = {
  delivery: {
    vehicle: 'moto', // which vehicle delivery is calculated by (super admin chooses; hidden from others)
    acceptProvinces: false, // false = only Phnom Penh; locations in a province are blocked
    vehicles: Object.fromEntries(
      VEHICLES.map((v) => [v, { enabled: true, rows: config.deliveryFees, beyond: config.beyondLastRow }]),
    ),
  },
  office: { name: config.office.name, lat: config.office.lat, lng: config.office.lng },
};

// The vehicle delivery is calculated by (route + price table).
// Older saved settings have no "vehicle": use the first one that was switched on.
export function activeVehicle(delivery) {
  if (VEHICLES.includes(delivery?.vehicle)) return delivery.vehicle;
  return VEHICLES.find((v) => delivery?.vehicles?.[v]?.enabled) || 'moto';
}
export const activePricing = (delivery) => delivery.vehicles[activeVehicle(delivery)];

// Is this location in a province while the super admin only accepts Phnom Penh?
// Then Customer Check shows "Outside Phnom Penh": no route, no fee, can't be saved.
export const isBlockedProvince = (point, delivery) => !delivery?.acceptProvinces && !isInPhnomPenh(point);

const LOCAL_KEY = 'aqulife-settings';
const SettingsContext = createContext({ ...DEFAULT_SETTINGS, loading: false, saveSetting: async () => false });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      try {
        const saved = JSON.parse(localStorage.getItem(LOCAL_KEY));
        if (saved) setSettings({ ...DEFAULT_SETTINGS, ...saved });
      } catch {
        /* ignore */
      }
      return;
    }
    const apply = (rows) =>
      setSettings((cur) => ({ ...cur, ...Object.fromEntries(rows.filter((r) => r.key in DEFAULT_SETTINGS).map((r) => [r.key, r.value])) }));

    supabase
      .from('app_settings')
      .select('key, value')
      .then(({ data }) => {
        if (data) apply(data); // table missing (006 not run) -> keep defaults
        setLoading(false);
      });
    const channel = supabase
      .channel('app-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, (p) => p.new?.key && apply([p.new]))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // Save one setting. Returns { ok, error }.
  const saveSetting = useCallback(async (key, value) => {
    if (!isSupabaseConfigured) {
      setSettings((cur) => {
        const next = { ...cur, [key]: value };
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify({ delivery: next.delivery, office: next.office }));
        } catch {
          /* ignore */
        }
        return next;
      });
      return { ok: true };
    }
    const { error } = await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) return { ok: false, error: error.message };
    setSettings((cur) => ({ ...cur, [key]: value }));
    return { ok: true };
  }, []);

  return <SettingsContext.Provider value={{ ...settings, loading, saveSetting }}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
