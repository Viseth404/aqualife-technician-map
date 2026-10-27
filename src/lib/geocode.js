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
export async function searchAddress(query, lang, signal, office = config.office) {
  const params = new URLSearchParams({
    q: query,
    limit: '6',
    lat: String(office.lat),
    lon: String(office.lng),
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

// ---------- Street address of a point (map tap, GPS, pasted link) ----------
// Uses Nominatim (OpenStreetMap), which knows Phum / Sangkat / Khan better than Photon.
// Its fields are mixed up for Cambodia (a Sangkat can be in "village", a Phum in "hamlet"),
// so each value is sorted by the word it starts with.
const LEVELS = [
  ['khan', /^(khan|srok|krong|ខណ្ឌ|ស្រុក|ក្រុង)\s*/i],
  ['sangkat', /^(sangkat|khum|សង្កាត់|ឃុំ)\s*/i],
  ['phum', /^(phum|ភូមិ)\s*/i],
  ['place', /^(borey|បុរី)\s*/i],
];
// Fields without one of those words: which level they are, smallest first.
const FALLBACK = {
  place: ['residential'],
  phum: ['hamlet', 'neighbourhood'],
  sangkat: ['quarter', 'suburb', 'village'],
  khan: ['city_district', 'town', 'county', 'city'],
};
// Shops, schools, markets, buildings… shown on the Place row together with a Borey.
const PLACE_KINDS = ['amenity', 'shop', 'building', 'office', 'tourism', 'leisure', 'healthcare', 'craft', 'man_made', 'club'];

// Returns { label, parts } – parts: place, street, phum, sangkat, khan, city ('' when unknown).
// Label is street-first for copying:
// "Borey Honglay, Street 9, Phum Chaom Chau, Sangkat Chaom Chau 1, Khan Pou Senchey, Phnom Penh"
function toAddress(data) {
  const a = data.address || {};
  const parts = { place: '', street: '', phum: '', sangkat: '', khan: '', city: '' };
  const places = [];

  // The thing exactly at the point (school, supermarket, building) – not a road.
  if (data.name && data.category !== 'highway' && data.name !== a.road) places.push(data.name);
  for (const kind of PLACE_KINDS) if (a[kind]) places.push(a[kind]);

  // Address keys come smallest area first, so the first match per level is the most exact.
  for (const value of Object.values(a)) {
    const level = LEVELS.find(([, re]) => re.test(value))?.[0];
    if (level === 'place') places.push(value);
    else if (level && !parts[level]) parts[level] = value;
  }
  for (const [level, keys] of Object.entries(FALLBACK)) {
    const key = keys.find((k) => a[k] && !LEVELS.some(([, re]) => re.test(a[k])));
    if (level === 'place') key && places.push(a[key]);
    else if (!parts[level] && key) parts[level] = a[key];
  }

  parts.place = [...new Set(places)].join(', ');
  parts.street = [a.house_number, a.road].filter(Boolean).join(' ');
  parts.city = (a.state || a.province || '').replace(/\s*Municipality$/i, ''); // "Phnom Penh Municipality" -> "Phnom Penh"
  const label = [...new Set(Object.values(parts).filter(Boolean))].join(', ');
  return { label, parts };
}

// Returns { label, parts } or null.
export async function reverseGeocode({ lat, lng }, lang) {
  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(lat),
      lon: String(lng),
      zoom: '18',
      addressdetails: '1',
      'accept-language': lang === 'en' ? 'en' : 'km',
    });
    const [data, street] = await Promise.all([
      fetch(`${config.reverseGeocoderUrl}/reverse?${params}`).then((res) => res.json()),
      nearestStreet({ lat, lng }, lang),
    ]);
    if (!data.address) return null;
    // Nominatim sometimes has no road for a point; Photon usually knows the nearest street.
    if (!data.address.road && street) data.address.road = street;
    const address = toAddress(data);
    return address.label ? address : null;
  } catch {
    return null;
  }
}

// Nearest street name from Photon, or ''.
async function nearestStreet({ lat, lng }, lang) {
  try {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lng), limit: '5' });
    if (lang === 'en') params.set('lang', 'en');
    const res = await fetch(`${config.geocoderUrl}/reverse?${params}`);
    const found = ((await res.json()).features || []).map((f) => f.properties);
    return found.find((p) => p.street)?.street || found.find((p) => p.type === 'street')?.name || '';
  } catch {
    return '';
  }
}

// Open a short Google link (maps.app.goo.gl) on our server function
// (browsers can't follow it). Returns the long link, or '' if it failed.
export async function resolveShortLink(link) {
  try {
    const res = await fetch(`/api/resolve-link?url=${encodeURIComponent(link.trim())}`);
    if (!res.ok) return '';
    return (await res.json()).url || '';
  } catch {
    return '';
  }
}

// ---------- Google Maps links and typed coordinates ----------
// Reads a location out of text the admin pasted. Returns:
//   { lat, lng, label }  – found a place
//   { short }            – a short link (maps.app.goo.gl): open it with resolveShortLink() first
//   null                 – not a link / coordinates
const inCambodiaArea = (lat, lng) => lat > 5 && lat < 20 && lng > 98 && lng < 112;

export function parseMapsLink(text) {
  const s = text.trim();

  // Plain coordinates: "11.5537, 104.9208"
  const plain = s.match(/^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/);
  if (plain) return { lat: +plain[1], lng: +plain[2], label: '' };

  // Sharing from the Google Maps app gives "Place name\nhttps://maps.app.goo.gl/…": use the link part.
  const link = s.match(/https?:\/\/\S+/)?.[0];
  if (!link || !/google\.[a-z.]+\/maps|maps\.google\.|goo\.gl|maps\.app/i.test(link)) return null;
  if (/goo\.gl|maps\.app/i.test(link)) return { short: link };

  let url;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  const path = decodeURIComponent(url.pathname).replace(/\+/g, ' ');

  // Exact place pins look like "!3d11.55!4d104.92". In a directions link the
  // last one is the destination (usually the customer).
  const pins = [...link.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)];
  // "@11.55,104.92,15z" is the map view (less exact, used as a fallback).
  const at = link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  // "?q=11.55,104.92" or "?query=…" or "?ll=…" or "?destination=…" or "/search/11.55,+104.92"
  const search = path.match(/\/search\/(-?\d+\.\d+,\s*-?\d+\.\d+)/)?.[1];
  const param = [...['q', 'query', 'll', 'destination'].map((k) => url.searchParams.get(k)), search]
    .find((v) => v && /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(v.trim()));

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
