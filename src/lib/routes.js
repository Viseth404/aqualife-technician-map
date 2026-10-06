// Driving distance with OSRM (free, uses OpenStreetMap roads, no key needed).
// The public server is for light use. For heavy use, change config.routingUrl
// to your own OSRM server.
import { config } from '../config';

// Returns { km, minutes, line: [[lat, lng], ...] } or throws an Error.
export async function getDrivingDistance(origin, destination, signal) {
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const res = await fetch(`${config.routingUrl}/route/v1/driving/${coords}?overview=simplified&geometries=geojson`, { signal });
  const data = await res.json();
  if (!res.ok || data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(data.message || `Routing error ${res.status}`);
  }
  const route = data.routes[0];
  return {
    km: route.distance / 1000,
    minutes: Math.round(route.duration / 60),
    // GeoJSON is [lng, lat]; Leaflet wants [lat, lng].
    line: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  };
}
