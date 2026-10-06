// =============================================================
// Aqualife settings. Change the values here – no other file needed.
// =============================================================

export const config = {
  businessName: 'Aqualife',

  // Logo files in the public/ folder.
  logoIcon: '/logo-icon.png', // water drop, transparent background (header, login, office pin)
  loginImage: '/login-logo.jpg', // full logo (right side of login page)

  // Aqualife office (from Google Maps: AquaLife (Cambodia) Co.,Ltd).
  // To change: in Google Maps right-click the office and copy the numbers.
  office: {
    name: 'AquaLife (Cambodia) Co.,Ltd',
    address: 'Phnom Penh, Cambodia',
    lat: 11.5537869,
    lng: 104.9208086,
  },

  // Where the map starts and how close it is zoomed in.
  defaultZoom: 12,

  // Free map services (OpenStreetMap). No API key needed.
  // You can replace these with your own servers later.
  tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  geocoderUrl: 'https://photon.komoot.io', // address search
  routingUrl: 'https://router.project-osrm.org', // driving distance

  // Delivery price rules.
  // Delivery fee by driving distance from the office.
  // Each row: up to this many km -> this fee. First row = free delivery.
  deliveryFees: [
    { upToKm: 20, fee: 0 }, //  0–20 km: free
    { upToKm: 25, fee: 5 }, // 21–25 km: $5
    { upToKm: 30, fee: 10 }, // 26–30 km: $10
    { upToKm: 35, fee: 15 }, // 31–35 km: $15
    { upToKm: 40, fee: 20 }, // 36–40 km: $20
  ],
  // Farther than the last row: add this fee for every extra 5 km (or part of it).
  // Example: 43 km -> $20 + $5 = $25. Set fee to 0 to stop at the last row's price.
  beyondLastRow: { everyKm: 5, fee: 5 },
  currencySymbol: '$',

  // Aqualife brand color (buttons, header, office pin).
  brandColor: '#0077C8',

  // Color used for zones that have no technician yet.
  unassignedColor: '#64748b',

  // Colors to choose from for technicians (pins and zones).
  // New technicians automatically get the first color nobody uses yet.
  // Add more lines here if you need more. Avoid gray – gray means "unassigned".
  colorPresets: {
    blue: '#2563eb',
    green: '#16a34a',
    orange: '#ea580c',
    purple: '#9333ea',
    red: '#dc2626',
    teal: '#0d9488',
    pink: '#db2777',
    navy: '#1e3a8a',
    amber: '#d97706',
    cyan: '#0891b2',
    lime: '#65a30d',
    indigo: '#4f46e5',
    rose: '#e11d48',
    brown: '#92400e',
    emerald: '#059669',
    violet: '#7c3aed',
    sky: '#0284c7',
    fuchsia: '#c026d3',
    olive: '#4d7c0f',
    maroon: '#9f1239',
    gold: '#a16207',
    forest: '#166534',
    plum: '#6b21a8',
    steel: '#0e7490',
  },
};

// Starting technicians. Used for "demo mode" (no Supabase yet).
// With Supabase, the same list is inserted by supabase/schema.sql.
// TODO: put your real phone numbers and photo links here.
export const starterTechnicians = [
  { id: '6f1c2b1e-0001-4a51-9a10-000000000001', name: 'Jenny', phone: '012 000 001', color: '#2563eb', photoUrl: '', lat: 11.575, lng: 104.92 },
  { id: '6f1c2b1e-0002-4a51-9a10-000000000002', name: 'Vuthy', phone: '012 000 002', color: '#1e3a8a', photoUrl: '', lat: 11.545, lng: 104.905 },
  { id: '6f1c2b1e-0003-4a51-9a10-000000000003', name: 'Dara', phone: '012 000 003', color: '#16a34a', photoUrl: '', lat: 11.53, lng: 104.94 },
  { id: '6f1c2b1e-0004-4a51-9a10-000000000004', name: 'Sophea', phone: '012 000 004', color: '#ea580c', photoUrl: '', lat: 11.59, lng: 104.95 },
];
