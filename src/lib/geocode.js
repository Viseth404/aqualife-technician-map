// Address search with Photon (free OpenStreetMap search, no key needed).
import { config } from '../config';

// Cambodia bounding box: west, south, east, north
const CAMBODIA_BBOX = '102.3,10.4,107.7,14.7';

// Turn Photon's address parts into one readable line.
function toLabel(p) {
  const parts = [
    p.name,
    [p.housenumber, p.street].filter(Boolean).join(' '),
    p.district || p.locality,
    p.city,
    p.state,
  ].filter(Boolean);
  return [...new Set(parts)].join(', ');
}

// Search addresses near the office. Returns [{ lat, lng, label }].
export async function searchAddress(query, lang, signal) {
  const params = new URLSearchParams({
    q: query,
    limit: '6',
    lat: String(config.office.lat),
    lon: String(config.office.lng),
    bbox: CAMBODIA_BBOX,
  });
  if (lang === 'en') params.set('lang', 'en'); // otherwise local (Khmer) names
  const res = await fetch(`${config.geocoderUrl}/api/?${params}`, { signal });
  if (!res.ok) throw new Error(`Search error ${res.status}`);
  const data = await res.json();
  return data.features.map((f) => ({
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    label: toLabel(f.properties),
  }));
}

// Find the address of a clicked point. Returns a label or ''.
export async function reverseGeocode({ lat, lng }, lang) {
  try {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lng) });
    if (lang === 'en') params.set('lang', 'en');
    const res = await fetch(`${config.geocoderUrl}/reverse?${params}`);
    const data = await res.json();
    return data.features?.[0] ? toLabel(data.features[0].properties) : '';
  } catch {
    return '';
  }
}

// ---------- Google Maps links and typed coordinates ----------
// Reads a location out of text the admin pasted. Returns:
//   { lat, lng, label }  – found a place
//   'short'              – a short link (maps.app.goo.gl) we can't open from the browser
//   null                 – not a link / coordinates
const inCambodiaArea = (lat, lng) => lat > 5 && lat < 20 && lng > 98 && lng < 112;

export function parseMapsLink(text) {
  const s = text.trim();

  // Plain coordinates: "11.5537, 104.9208"
  const plain = s.match(/^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/);
  if (plain) return { lat: +plain[1], lng: +plain[2], label: '' };

  if (!/^https?:\/\//i.test(s) || !/google\.[a-z.]+\/maps|maps\.google\.|goo\.gl|maps\.app/i.test(s)) return null;
  if (/goo\.gl|maps\.app/i.test(s)) return 'short';

  let url;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  const path = decodeURIComponent(url.pathname).replace(/\+/g, ' ');

  // Exact place pins look like "!3d11.55!4d104.92". In a directions link the
  // last one is the destination (usually the customer).
  const pins = [...s.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
  // "@11.55,104.92,15z" is the map view (less exact, used as a fallback).
  const at = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  // "?q=11.55,104.92" or "?query=…" or "?ll=…" or "?destination=…"
  const param = ['q', 'query', 'll', 'destination']
    .map((k) => url.searchParams.get(k))
    .find((v) => v && /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(v));

  let lat, lng;
  if (pins.length) [lat, lng] = [+pins.at(-1)[1], +pins.at(-1)[2]];
  else if (param) [lat, lng] = param.split(',').map(Number);
  else if (at) [lat, lng] = [+at[1], +at[2]];
  else return null;
  if (!inCambodiaArea(lat, lng)) return null;

  // Place name from ".../place/NAME/..." or the last stop of ".../dir/A/B/...".
  let label = '';
  const place = path.match(/\/place\/([^/]+)/);
  const dir = path.match(/\/dir\/(.+?)\/(?:@|data=)/);
  if (place) label = place[1];
  else if (dir) label = dir[1].split('/').filter(Boolean).at(-1) || '';
  return { lat, lng, label: label.trim() };
}
