# Aqualife – Technician Location Map

Admin dashboard for Aqualife (Phnom Penh): technician pins, service zones drawn on the map, zone assignment (main + backup), customer coverage check with delivery fee, English / Khmer.

**Stack:** React + Vite, Tailwind CSS v4, Leaflet + react-leaflet, Leaflet-Geoman (drawing), Turf.js, Supabase.

**Free map services – no Google account, API key, or credit card needed:**
| What | Service |
|---|---|
| Map tiles | OpenStreetMap |
| Address search | Photon (komoot) |
| Driving distance | OSRM public server |

These public servers are free for light use (a few admins is fine). If Aqualife grows a lot, change the URLs in `src/config.js` to a paid provider or your own servers.

> **Why Supabase and not Firestore?** Firestore cannot store arrays inside arrays, and GeoJSON polygons are exactly that (`[[[lng, lat], …]]`). Supabase saves GeoJSON as-is in a `jsonb` column, has live updates (Realtime), and has admin login built in.

---

## Folder structure

```
Aqualife Map/
├── .env.example            ← copy to .env and add your Supabase keys
├── index.html
├── netlify.toml            ← Netlify build settings
├── package.json
├── vite.config.js
├── public/favicon.svg
├── supabase/
│   └── schema.sql          ← run once in Supabase SQL Editor
└── src/
    ├── main.jsx            ← app entry
    ├── App.jsx             ← login check, page layout, shared state
    ├── index.css           ← Tailwind + small map style fixes
    ├── config.js           ← ⭐ office location, free km, price, brand color
    ├── i18n.jsx            ← English + Khmer text and language switch
    ├── hooks/
    │   └── useMapData.js   ← load/save technicians & zones (Supabase or demo mode)
    ├── lib/
    │   ├── supabase.js     ← Supabase client
    │   ├── leaflet.js      ← loads Leaflet + Geoman in the right order
    │   ├── leaflet-global.js
    │   ├── geo.js          ← Turf: area, inside-zone check, label position
    │   ├── geocode.js      ← Photon address search + reverse lookup
    │   ├── routes.js       ← OSRM driving distance + route line
    │   └── pricing.js      ← delivery fee rule
    └── components/
        ├── MapCard.jsx           ← white card + map + everything on it
        ├── TechnicianMarker.jsx  ← teardrop photo pin + popup with Call button
        ├── ZoneDrawer.jsx        ← Geoman: draw / edit polygons, pick point
        ├── ZoneAssignPanel.jsx   ← rename, main + backup technician, delete
        ├── ServiceAreaList.jsx   ← "Service Areas" list with km²
        ├── CustomerCheck.jsx     ← address search / map click → zone, distance, fee
        ├── ViewAllFilter.jsx     ← bottom-left "View All" dropdown
        ├── TechnicianManager.jsx ← add / edit / delete technicians
        └── Login.jsx             ← admin sign in
```

---

## 1. Supabase setup (shared data for all admins)

1. Create a free project at <https://supabase.com>.
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**. This creates the tables, security rules, live updates, and your 4 starting technicians.
3. **Authentication → Users → Add user** → create a login (email + password) for each admin.
4. **Authentication → Sign In / Providers** → turn **off** "Allow new users to sign up", so only the admins you add can log in.
5. **Project Settings → API** → copy the **Project URL** and the **anon public** key.

> Skipping Supabase? The app runs in **demo mode** – data is saved only in your browser. Good for trying it out.

## 2. Run locally

Needs **Node.js 20.19+ or 22.12+** (<https://nodejs.org>).

```bash
cd "Aqualife Map"
npm install
npm run dev
```

Open <http://localhost:5173>. It works right away in **demo mode**.

To share data with all admins, add Supabase:
```bash
cp .env.example .env      # then open .env and paste your Supabase keys
```
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
Restart `npm run dev` after changing `.env`.

## 3. Settings to change (`src/config.js`)

- `office.lat / office.lng` – **put your real Aqualife office here** (Google Maps → right-click your office → click the numbers to copy).
- `deliveryFees` / `beyondLastRow` – starting prices only. After migration 006, a super admin changes prices (separately for moto and car) and the office in **Settings**.
- `brandColor`, `colorPresets`, `starterTechnicians`.
- `tileUrl`, `geocoderUrl`, `routingUrl` – the free map services (swap if you outgrow them).

## 4. Deploy free (Netlify)

First put the code on GitHub:
```bash
git init && git add . && git commit -m "Aqualife technician map"
# create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/aqulife-map.git
git push -u origin main
```
(`.env` is in `.gitignore` – your keys are **not** uploaded. You add them in the hosting dashboard instead.)

**Netlify (recommended – the free plan allows business use)**
1. <https://app.netlify.com> → *Add new site → Import from Git* → pick the repo (build settings come from `netlify.toml`).
2. *Site configuration → Environment variables* → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. *Deploy*. You get `https://<name>.netlify.app`.

> Vercel also works, but its free "Hobby" plan is for personal, non-commercial use only; a business needs Vercel Pro.

If you change env variables later, redeploy – Vite puts them in the build.

---

## How distance and price are calculated

- **Route:** [Valhalla](https://valhalla.github.io/valhalla/) on the free OpenStreetMap server run by FOSSGIS
  (`config.valhallaUrl`). It knows vehicle types:
  - **Moto** (`motor_scooter`): may use smaller streets and shortcuts, scooter speeds.
  - **Car** (`auto`): only roads cars may use (one-ways, turn rules, wide enough streets), car speeds.
- **Which one:** the super admin chooses in **Settings → Delivery → Calculate delivery by**. That vehicle's
  route **and** price table are used everywhere. Admins, sales and technicians never see moto/car –
  just one distance, time and fee.
- **Backup:** if Valhalla doesn't answer, the OSRM car route is used so a price still shows.
- Distance is measured from the office (Settings → Office) along roads, not in a straight line.

## Security checklist & staff roles

1. **Turn off public sign-up:** Supabase → Authentication → Sign In / Providers → switch off **Allow new users to sign up**.
2. **Run the SQL migrations in order** (SQL Editor): `004_admin_allowlist.sql`, `005_staff_roles.sql`, `006_superadmin_settings.sql`, `007_staff_read_customers.sql`.
3. **Server key for team management:** Netlify → Site configuration → Environment variables → add
   `SUPABASE_SECRET_KEY` = Supabase → Project Settings → API Keys → **Secret key** (mark it *secret*, scope *Functions*), then redeploy.
   This key is only used by `netlify/functions/admin-users.mjs` on Netlify's servers – never put it in `.env` or a `VITE_` variable.
4. **Roles**

   | Role | Screen | Can change |
   |---|---|---|
   | `superadmin` | Full dashboard + **Settings** | Everything, plus staff accounts, delivery prices (moto/car), office location |
   | `admin` | Full dashboard | Map, zones, technicians, customers |
   | `sales` | Phone screen: map (zones, technicians, customer dots) + Customer Check + Delivery Fees | Nothing |
   | `technician` | Phone screen: map (zones, technicians, customer dots) + Customer Check + Delivery Fees | Nothing |

5. **Manage staff in the app:** Settings → Team (super admin): create accounts, change roles, reset passwords, revoke access, delete.
   You can't remove your own access, and there is always at least one super admin.
6. **Use the HTTPS link** (Netlify) – "My location" and team management only work there.

---|---|---|
   | `admin` | Full dashboard | Everything |
   | `sales` | Phone screen: map (zones, technicians, customer dots) + Customer Check + Delivery Fees | Nothing |
   | `technician` | Phone screen: map (zones, technicians, customer dots) + Customer Check + Delivery Fees | Nothing |

   Saved customers can be seen by all staff on the map (migration 007) but only admins can add, edit, or delete them. Admins can preview the phone screen with **Field view**.
4. **Add a staff member:** Authentication → Users → Add user (tick Auto Confirm), then in SQL Editor:
   `insert into public.staff (user_id, email, role) select id, email, 'sales' from auth.users where email = 'new@example.com';`
   (use `'admin'`, `'sales'` or `'technician'`)
5. **Change a role:** `update public.staff set role = 'technician' where email = 'someone@example.com';`
6. **Remove access:** `delete from public.staff where email = 'someone@example.com';` (and delete the user in Authentication → Users).
7. **Use the HTTPS link** (Netlify) – "My location" only works on https.
8. Never put the Supabase **service_role / secret** key in `.env` or the app – only the publishable/anon key.

---

## How to use

| Task | How |
|---|---|
| Add all 14 Phnom Penh districts | **Service Areas → Add Phnom Penh districts** (real khan boundaries from OpenStreetMap; skips names you already have) |
| Draw a zone | **Draw zone** → click points around the area → click the first point (or Enter). Esc cancels |
| Assign technician | After drawing, the panel opens: name it, pick main + backup → **Save** |
| Reassign / rename / delete | Click the zone (or its label, or it in Service Areas) |
| Reshape | Select the zone → drag the corners; drag a small middle dot to add a corner; right-click a corner to remove it |
| Move technician pins | **Move pins** → drag → **Lock pins** |
| Show one technician | Bottom-left **View All** dropdown |
| Check a customer | Type an address in Customer Check, or **Pick on map** then click the map |

**Ideas for later:** live GPS from technicians' phones (update `lat`/`lng` from a small mobile page), photo upload with Supabase Storage.
