// "Available today" helpers.
// A technician is off when unavailableOn equals today's date in Phnom Penh,
// so the switch turns itself back on the next day.

// Today's date in Phnom Penh as "YYYY-MM-DD".
export function todayInPhnomPenh() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export const isAvailable = (tech) => Boolean(tech) && tech.unavailableOn !== todayInPhnomPenh();

// Straight-line distance in km between two { lat, lng } points.
function kmBetween(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// Who handles a zone today? Checked in this order:
//   1. main technician (if available)
//   2. backup technician (if available)
//   3. "cover": the available technician whose pin is closest to the zone
// Returns { tech, role, main, backup } where role is
//   'main' | 'backup' | 'cover' | 'nobody' (everyone is off) | 'unassigned' (zone has no technician)
export function zoneHandler(zone, techById) {
  const main = techById[zone.mainTechnicianId];
  const backup = techById[zone.backupTechnicianId];
  if (!main && !backup) return { tech: null, role: 'unassigned', main, backup };
  if (main && isAvailable(main)) return { tech: main, role: 'main', main, backup };
  if (backup && isAvailable(backup)) return { tech: backup, role: 'backup', main, backup };

  const center = zoneCenter(zone);
  const nearest = Object.values(techById)
    .filter((t) => isAvailable(t) && Number.isFinite(t.lat) && Number.isFinite(t.lng))
    .sort((a, b) => kmBetween(center, a) - kmBetween(center, b))[0];
  if (nearest) return { tech: nearest, role: 'cover', main, backup };
  return { tech: null, role: 'nobody', main, backup };
}

// Middle of the zone (average of its corners) – good enough for "who is closest".
function zoneCenter(zone) {
  const ring = zone.geojson?.geometry?.coordinates?.[0] ?? [];
  const pts = ring.slice(0, -1); // last corner repeats the first
  const n = pts.length || 1;
  return {
    lng: pts.reduce((sum, p) => sum + p[0], 0) / n,
    lat: pts.reduce((sum, p) => sum + p[1], 0) / n,
  };
}
