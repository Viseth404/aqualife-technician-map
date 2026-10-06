// Driving route from the office to a point (distance, time, line on the map).
// Returns null (no point) or { status: 'loading' | 'done' | 'error', km?, minutes?, line? }.
import { useEffect, useState } from 'react';
import { getDrivingDistance } from '../lib/routes';

export function useDrivingRoute(point, office) {
  const [route, setRoute] = useState(null);
  useEffect(() => {
    if (!point) {
      setRoute(null);
      return;
    }
    const controller = new AbortController();
    setRoute({ status: 'loading' });
    getDrivingDistance(office, point, controller.signal)
      .then((r) => setRoute({ status: 'done', ...r }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error(err);
        setRoute({ status: 'error' });
      });
    return () => controller.abort();
    // Only re-run when the location itself changes (not its label).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point?.lat, point?.lng, office.lat, office.lng]);
  return route;
}
