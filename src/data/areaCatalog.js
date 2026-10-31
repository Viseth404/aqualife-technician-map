// Ready-made areas admins can add as zones ("Add areas" in Service Areas).
//
// TO ADD MORE AREAS LATER (e.g. another province):
//   1. Put a GeoJSON file in this folder: a FeatureCollection of Polygons, each with
//      properties { name, nameKm } (optional: partOf, partOfKm when it lies inside another area).
//      Boundaries: OpenStreetMap (nominatim.openstreetmap.org, polygon_geojson=1), simplified.
//   2. Add one line below, and the group's title in src/i18n.jsx (English + Khmer).
// Files load only when the picker opens, so big files don't slow down the app.
export const AREA_GROUPS = [
  { id: 'phnomPenh', titleKey: 'groupPhnomPenh', load: () => import('./phnom-penh-districts.json') },
  { id: 'kandal', titleKey: 'groupKandal', load: () => import('./kandal-areas.json') },
];

// All groups with their areas: [{ id, titleKey, features }]
export async function loadAreaGroups() {
  return Promise.all(AREA_GROUPS.map(async (g) => ({ ...g, features: (await g.load()).default.features })));
}
