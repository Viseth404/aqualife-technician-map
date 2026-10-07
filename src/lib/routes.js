// Driving route from the office to a customer: distance, time, and the line on the map.
//
// Main: Valhalla (free, OpenStreetMap roads, run by FOSSGIS) – it knows vehicle types:
//   moto -> "motor_scooter": smaller streets/shortcuts allowed, scooter speeds
//   car  -> "auto":          only roads cars may use, car speeds
// Backup: OSRM (car only) – used if Valhalla doesn't answer, so a price still shows.
import { config } from '../config';

const COSTING = { moto: 'motor_scooter', car: 'auto' };

// Valhalla sends the route line as an "encoded polyline" (6 decimals). Turn it into [[lat, lng], ...].
function decodePolyline(str, precision = 6) {
  const factor = 10 ** precision;
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < str.length) {
    for (const axis of [0, 1]) {
      let result = 0, shift = 0, byte;
      do {
        byte = str.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    points.push([lat / factor, lng / factor]);
  }
  return points;
}

async function valhallaRoute(origin, destination, vehicle, signal) {
  const res = await fetch(`${config.valhallaUrl}/route`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    signal,
    body: JSON.stringify({
      locations: [
        { lat: origin.lat, lon: origin.lng },
        { lat: destination.lat, lon: destination.lng },
      ],
      costing: COSTING[vehicle] || 'motor_scooter',
      units: 'kilometers',
    }),
  });
  const data = await res.json();
  const trip = data.trip;
  if (!res.ok || !trip?.legs?.length) throw new Error(data.error || `Valhalla error ${res.status}`);
  return {
    km: trip.summary.length,
    minutes: Math.round(trip.summary.time / 60),
    line: trip.legs.flatMap((leg) => decodePolyline(leg.shape)),
  };
}

async function osrmRoute(origin, destination, signal) {
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const res = await fetch(`${config.routingUrl}/route/v1/driving/${coords}?overview=simplified&geometries=geojson`, { signal });
  const data = await res.json();
  if (!res.ok || data.code !== 'Ok' || !data.routes?.length) throw new Error(data.message || `Routing error ${res.status}`);
  const route = data.routes[0];
  return {
    km: route.distance / 1000,
    minutes: Math.round(route.duration / 60),
    line: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]), // GeoJSON is [lng, lat]
  };
}

// Returns { km, minutes, line, backup } or throws an Error.
// backup = true when Valhalla failed and the OSRM car route was used instead.
export async function getRoute(origin, destination, vehicle, signal) {
  try {
    return { ...(await valhallaRoute(origin, destination, vehicle, signal)), backup: false };
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn('[route] Valhalla failed, using OSRM backup:', err.message);
    return { ...(await osrmRoute(origin, destination, signal)), backup: true };
  }
}
