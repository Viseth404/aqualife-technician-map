// View-only map for the Sales/Technician phone screen.
// Shows zones (today's colors), technician pins, the office, saved-customer dots,
// and the red pin + driving route of the customer being checked.
// Tap anywhere on the map to check that spot. Nothing can be dragged or edited.
import { useEffect, useMemo, useState } from "react"
import { CircleMarker, MapContainer, Marker, Polygon, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet"
import L from "@/lib/leaflet"
import { useLanguage } from "@/i18n"
import { config } from "@/config"
import { useSettings } from "@/lib/settings"
import { zoneLabelPosition } from "@/lib/geo"
import { isAvailable, zoneHandler } from "@/lib/availability"
import TechnicianMarker from "./TechnicianMarker"
import { centeredIcon, customerIcon, officeIcon } from "./mapIcons"

const toLatLngs = (geometry) => L.GeoJSON.coordsToLatLngs(geometry.coordinates, 1)

export default function FieldMap({ zones, technicians, customers = [], point, route, onPick }) {
  const { t } = useLanguage()
  const { office } = useSettings()
  const [openTechId, setOpenTechId] = useState(null)
  const techById = useMemo(() => Object.fromEntries(technicians.map((x) => [x.id, x])), [technicians])

  // Zones in today's colors (main, or backup/cover when someone is off).
  const coloredZones = useMemo(
    () =>
      zones.map((z) => {
        const handler = zoneHandler(z, techById)
        return {
          ...z,
          handler,
          color: handler.tech?.color || config.unassignedColor,
          latlngs: toLatLngs(z.geojson.geometry),
          labelIcon: centeredIcon(
            <div className="whitespace-nowrap rounded-md bg-white/90 px-1.5 py-0.5 text-center shadow ring-1 ring-black/5">
              <div className="text-[10px] font-medium text-slate-500">{z.name}</div>
              <div className="text-[11px] font-bold" style={{ color: handler.tech?.color || config.unassignedColor }}>
                {handler.tech?.name || t("unassigned")}
              </div>
            </div>,
          ),
          labelAt: zoneLabelPosition(z.geojson),
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zones, techById, t("unassigned")],
  )

  const pick = (latlng) => onPick({ lat: latlng.lat, lng: latlng.lng })

  return (
    <div className="relative isolate h-[45svh] min-h-72 overflow-hidden rounded-xl border">
      <MapContainer center={[office.lat, office.lng]} zoom={config.defaultZoom} className="h-full w-full" zoomControl={false}>
        <TileLayer url={config.tileUrl} attribution={config.tileAttribution} maxZoom={19} />
        <TapToPick onPick={pick} />

        {/* Zones: tapping inside a zone also checks that spot */}
        {coloredZones.map((z) => (
          <Polygon
            key={`${z.id}-${z.color}`}
            positions={z.latlngs}
            pathOptions={{ color: z.color, weight: 2, fillColor: z.color, fillOpacity: 0.22 }}
            eventHandlers={{ click: (e) => pick(e.latlng) }}
          />
        ))}
        {coloredZones.map((z) => (
          <Marker key={`label-${z.id}`} position={[z.labelAt.lat, z.labelAt.lng]} icon={z.labelIcon} interactive={false} zIndexOffset={-1000} />
        ))}

        <Marker position={[office.lat, office.lng]} icon={officeIcon} title={office.name} interactive={false} />

        {/* Technicians (tap for phone + Call) */}
        {technicians
          .filter((tech) => Number.isFinite(tech.lat) && Number.isFinite(tech.lng))
          .map((tech) => (
            <TechnicianMarker
              key={tech.id}
              tech={tech}
              zones={zones}
              isOpen={openTechId === tech.id}
              onOpen={() => setOpenTechId(tech.id)}
              onClose={() => setOpenTechId((id) => (id === tech.id ? null : id))}
              available={isAvailable(tech)}
              draggable={false}
              onMoved={() => {}}
            />
          ))}

        {/* Saved customers (tap for name, phone, address) */}
        {customers.map((c) => {
          const color = techById[c.technicianId]?.color || config.unassignedColor
          return (
            <CircleMarker key={c.id} center={[c.lat, c.lng]} radius={6} pathOptions={{ color: "#ffffff", weight: 2, fillColor: color, fillOpacity: 1 }}>
              <Popup>
                <div className="space-y-1 font-sans text-sm text-foreground">
                  <div className="font-semibold">{c.name}</div>
                  {c.phone && (
                    <a href={`tel:${c.phone.replace(/\s+/g, "")}`} className="block">
                      📞 {c.phone}
                    </a>
                  )}
                  {c.address && <div className="text-xs text-muted-foreground">{c.address}</div>}
                  <div className="text-xs" style={{ color }}>
                    {t("handledBy")}: <b>{c.technicianName}</b>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}

        {/* Customer being checked: red pin + driving route from the office */}
        {route?.line && <Polyline positions={route.line} pathOptions={{ color: config.brandColor, weight: 4, opacity: 0.75, dashArray: "6 8" }} interactive={false} />}
        {point && <Marker position={[point.lat, point.lng]} icon={customerIcon} zIndexOffset={2000} interactive={false} />}

        <FollowPoint point={point} line={route?.line} />
      </MapContainer>

      <div className="pointer-events-none absolute top-2 left-1/2 z-[1001] -translate-x-1/2 whitespace-nowrap rounded-full bg-background/90 px-3 py-1 text-xs text-muted-foreground shadow">
        {t("tapMapHint")}
      </div>
    </div>
  )
}

// Tap on an empty part of the map = check that spot.
function TapToPick({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng) })
  return null
}

// When a spot is checked, show the whole route (or zoom to the pin).
function FollowPoint({ point, line }) {
  const map = useMap()
  useEffect(() => {
    if (line?.length > 1) map.fitBounds(L.latLngBounds(line), { padding: [40, 40] })
    else if (point) map.setView([point.lat, point.lng], Math.max(map.getZoom(), 14))
  }, [map, point?.lat, point?.lng, line]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
