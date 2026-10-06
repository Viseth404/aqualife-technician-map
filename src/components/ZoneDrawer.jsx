// Draws and edits zone polygons on the map with Leaflet-Geoman.
// Modes:
//   "select" – click a zone to select it; drag its corners to reshape
//   "draw"   – click points to draw a new zone
//   "pick"   – a map click picks a customer location
// This component renders nothing itself – it controls the map directly.
import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from '../lib/leaflet';
import { config } from '../config';
import { newId } from '@/lib/uuid';

// GeoJSON uses [lng, lat]; Leaflet uses [lat, lng].
const toLatLngs = (geometry) => L.GeoJSON.coordsToLatLngs(geometry.coordinates, 1);
const toFeature = (layer) => ({ type: 'Feature', geometry: layer.toGeoJSON(7).geometry, properties: {} });

// Turn clicking on a zone on/off (off while drawing, so clicks reach the map).
function setInteractive(layer, on) {
  layer.options.interactive = on;
  if (layer._path) layer._path.classList.toggle('leaflet-interactive', on);
}

export default function ZoneDrawer({
  zones, // zones to show: [{ id, geojson, color }]
  mode,
  selectedZoneId,
  editable = true, // false = map locked: zones can be clicked but not reshaped
  onSelectZone, // (id | null)
  onZoneDrawn, // (id, geojsonFeature) – a new polygon was finished
  onZoneReshaped, // (id, geojsonFeature) – corners were moved
  onPointPicked, // ({ lat, lng }) – map clicked in "pick" mode
  onCancelDraw, // Esc pressed while drawing
}) {
  const map = useMap();
  const layers = useRef(new Map()); // zone id -> { layer, geojson, color }

  // Keep the latest props in a ref so map event handlers always see fresh values.
  const latest = useRef({});
  latest.current = { mode, selectedZoneId, onSelectZone, onZoneDrawn, onZoneReshaped, onPointPicked, onCancelDraw };

  // ---------- 1. Map events: new shape finished, map clicked ----------
  useEffect(() => {
    map.pm.setGlobalOptions({
      allowSelfIntersection: false, // no "figure 8" shapes
      snappable: true, // snap to corners of nearby zones
      snapDistance: 15,
      finishOnEnter: true,
    });

    const onCreate = (e) => {
      const feature = toFeature(e.layer);
      map.removeLayer(e.layer); // we redraw it ourselves from the saved zone
      latest.current.onZoneDrawn(newId(), feature);
    };

    const onClick = (e) => {
      const { mode: m, selectedZoneId: sel } = latest.current;
      // Clicking a corner handle should not close the zone panel.
      if (e.originalEvent?.target?.classList?.contains('marker-icon')) return;
      if (m === 'pick') latest.current.onPointPicked({ lat: e.latlng.lat, lng: e.latlng.lng });
      else if (m === 'select' && sel) latest.current.onSelectZone(null); // click empty map = deselect
    };

    map.on('pm:create', onCreate);
    map.on('click', onClick);
    return () => {
      map.off('pm:create', onCreate);
      map.off('click', onClick);
    };
  }, [map]);

  // Remove all zone shapes when the map goes away.
  useEffect(() => {
    const all = layers.current;
    return () => {
      all.forEach(({ layer }) => {
        layer.pm.disable();
        layer.remove();
      });
      all.clear();
    };
  }, [map]);

  // ---------- 2. Keep the shapes on the map in sync with our zone list ----------
  useEffect(() => {
    const wanted = new Map(zones.map((z) => [z.id, z]));

    // Remove shapes that are gone (deleted or hidden by the filter).
    for (const [id, entry] of layers.current) {
      if (!wanted.has(id)) {
        entry.layer.pm.disable();
        entry.layer.remove();
        layers.current.delete(id);
      }
    }

    for (const zone of zones) {
      const entry = layers.current.get(zone.id);
      if (!entry) {
        // New zone: create its polygon.
        const layer = L.polygon(toLatLngs(zone.geojson.geometry));
        layer.on('click', (e) => {
          const { mode: m } = latest.current;
          if (m === 'select') latest.current.onSelectZone(zone.id);
          else if (m === 'pick') latest.current.onPointPicked({ lat: e.latlng.lat, lng: e.latlng.lng });
        });
        // Fired after a corner is dragged, added, or removed.
        layer.on('pm:edit', () => latest.current.onZoneReshaped(zone.id, toFeature(layer)));
        layer.addTo(map);
        layers.current.set(zone.id, { layer, geojson: zone.geojson, color: zone.color });
        continue;
      }
      entry.color = zone.color;
      // Shape changed (e.g. by another admin). Don't touch the one being edited right now.
      if (entry.geojson !== zone.geojson && zone.id !== selectedZoneId) {
        entry.layer.setLatLngs(toLatLngs(zone.geojson.geometry));
        entry.geojson = zone.geojson;
      }
    }
  }, [map, zones, selectedZoneId]);

  // ---------- 3. Colors, selection, and corner editing ----------
  useEffect(() => {
    for (const [id, { layer, color }] of layers.current) {
      const selected = mode === 'select' && id === selectedZoneId;
      layer.setStyle({
        color: selected ? '#0f172a' : color,
        weight: selected ? 3 : 2,
        fillColor: color,
        fillOpacity: selected ? 0.4 : 0.28,
      });
      setInteractive(layer, mode !== 'draw');

      // Corner handles only for the selected zone, and only when the map is unlocked.
      const canEdit = selected && editable;
      if (canEdit && !layer.pm.enabled()) {
        layer.pm.enable({ allowSelfIntersection: false, draggable: false, snappable: true });
      } else if (!canEdit && layer.pm.enabled()) {
        layer.pm.disable();
      }
      if (selected) layer.bringToFront();
    }
  }, [zones, mode, selectedZoneId, editable]);

  // ---------- 4. Drawing mode ----------
  useEffect(() => {
    if (mode !== 'draw') return;
    map.pm.enableDraw('Polygon', {
      pathOptions: { color: config.brandColor, fillColor: config.brandColor, fillOpacity: 0.2 },
      templineStyle: { color: config.brandColor },
      hintlineStyle: { color: config.brandColor, dashArray: [5, 5] },
    });
    map.doubleClickZoom.disable(); // double-click should not zoom while drawing
    const onKey = (e) => e.key === 'Escape' && latest.current.onCancelDraw();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      map.pm.disableDraw();
      map.doubleClickZoom.enable();
    };
  }, [map, mode]);

  // ---------- 5. Crosshair cursor while picking a customer point ----------
  useEffect(() => {
    const el = map.getContainer();
    el.classList.toggle('pick-mode', mode === 'pick');
    return () => el.classList.remove('pick-mode');
  }, [map, mode]);

  return null;
}
