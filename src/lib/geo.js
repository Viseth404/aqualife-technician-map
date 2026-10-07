// Map math helpers built on Turf.js.
import { area, bbox, booleanPointInPolygon, buffer, point, pointOnFeature } from '@turf/turf';
import districts from '../data/phnom-penh-districts.json';

// Area of a zone in square kilometres.
export function zoneAreaKm2(feature) {
  if (!feature?.geometry) return 0;
  return area(feature) / 1_000_000;
}

// A point inside the zone, used for the name label.
// (pointOnFeature is always inside, even for odd shapes.)
export function zoneLabelPosition(feature) {
  const [lng, lat] = pointOnFeature(feature).geometry.coordinates;
  return { lat, lng };
}

// Google Maps bounds object for "zoom to zone".
export function zoneBounds(feature) {
  const [west, south, east, north] = bbox(feature);
  return { west, south, east, north };
}

// All zones that contain the point { lat, lng }.
export function zonesAtPoint(zones, { lat, lng }) {
  const p = point([lng, lat]);
  return zones.filter((z) => z.geojson?.geometry && booleanPointInPolygon(p, z.geojson));
}

// Is { lat, lng } inside Phnom Penh (one of the 14 khans)? The outlines are simplified,
// so they get a 300 m margin: addresses right on the city edge or between two khans still count.
let phnomPenh = null;
export function isInPhnomPenh({ lat, lng }) {
  phnomPenh ??= buffer(districts, 0.3, { units: 'kilometers' }).features;
  const p = point([lng, lat]);
  return phnomPenh.some((f) => booleanPointInPolygon(p, f));
}

// Format numbers nicely: 12.3456 -> "12.35"
export const fmt = (n, digits = 2) => Number(n).toFixed(digits);
