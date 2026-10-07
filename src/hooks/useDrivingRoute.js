// Driving route from the office to a point (distance, time, line on the map),
// using the delivery vehicle the super admin chose (moto or car).
// Returns null (no point) or { status: 'loading' | 'done' | 'error', km?, minutes?, line?, backup? }.
import { useEffect, useState } from 'react';
import { getRoute } from '../lib/routes';

export function useDrivingRoute(point, office, vehicle = 'moto') {
  const [route, setRoute] = useState(null);
  useEffect(() => {
    if (!point) {
      setRoute(null);
      return;
    }
    const controller = new AbortController();
    setRoute({ status: 'loading' });
    getRoute(office, point, vehicle, controller.signal)
      .then((r) => setRoute({ status: 'done', ...r }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error(err);
        setRoute({ status: 'error' });
      });
    return () => controller.abort();
    // Only re-run when the location, office, or vehicle changes (not the address label).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point?.lat, point?.lng, office.lat, office.lng, vehicle]);
  return route;
}
