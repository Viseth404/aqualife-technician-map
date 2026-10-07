// The white card with the title, toolbar, and the map inside.
// Everything drawn on the map lives here: office, technicians, zones,
// zone labels, the customer point + route, the filter, and the zone panel.
import { useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from '../lib/leaflet';
import { Lock, LockOpen, PenLine, X } from 'lucide-react';
import { useLanguage } from '../i18n';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { config } from '../config';
import { zoneBounds, zoneLabelPosition } from '../lib/geo';
import { isAvailable, zoneHandler } from '@/lib/availability';
import { useSettings } from '@/lib/settings';
import ZoneDrawer from './ZoneDrawer';
import TechnicianMarker from './TechnicianMarker';
import ViewAllFilter from './ViewAllFilter';
import ZoneAssignPanel from './ZoneAssignPanel';
import { centeredIcon, customerIcon, officeIcon } from './mapIcons';

export default function MapCard({
  technicians, // all technicians
  visibleTechnicians, // after the "View All" filter
  zones, // all zones
  visibleZones, // after the filter
  filter,
  onFilterChange,
  mode,
  onModeChange,
  selectedZoneId,
  newZoneId,
  onSelectZone,
  onZoneDrawn,
  onSaveZone,
  onDeleteZone,
  onMoveTechnician,
  customerPoint,
  savedCustomers = [], // saved customers to show as small dots
  route, // driving route to the customer: { line: [[lat, lng], ...] }
  onPointPicked,
  focus, // { kind: 'zone' | 'tech' | 'point', id?, at } – zoom request
  editing, // true = map unlocked (draw new zones, move pins)
  onEditingChange,
  editingZoneId, // the one zone unlocked with its "Edit" button
  onEditZone, // (id | null)
}) {
  const { t, lang } = useLanguage();
  const { office } = useSettings();
  const [openTechId, setOpenTechId] = useState(null);

  const techById = useMemo(() => Object.fromEntries(technicians.map((x) => [x.id, x])), [technicians]);

  // Give each zone its main technician's color (gray if unassigned).
  const coloredZones = useMemo(
    () =>
      visibleZones.map((z) => {
        // Color = whoever handles the zone today (main, or backup if main is off).
        const handler = zoneHandler(z, techById);
        return {
          ...z,
          handler,
          color: handler.tech?.color || config.unassignedColor,
          labelAt: zoneLabelPosition(z.geojson),
        };
      }),
    [visibleZones, techById],
  );

  // Label icons, rebuilt only when zones, names, or language change.
  const labelIcons = useMemo(
    () =>
      Object.fromEntries(
        coloredZones.map((z) => [
          z.id,
          centeredIcon(
            <div className="whitespace-nowrap rounded-lg bg-white/90 px-2 py-1 text-center shadow ring-1 ring-black/5">
              <div className="text-[11px] font-medium text-slate-500">{z.name}</div>
              <div className="text-xs font-bold" style={{ color: z.color }}>
                {z.handler.tech ? z.handler.tech.name : z.handler.role === 'nobody' ? t('noTechAvailable') : t('unassigned')}
                {(z.handler.role === 'backup' || z.handler.role === 'cover') && (
                  <span className="font-medium"> · {t(z.handler.role)}</span>
                )}
              </div>
            </div>,
          ),
        ]),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coloredZones, techById, lang],
  );

  const selectedZone = zones.find((z) => z.id === selectedZoneId);
  const hint =
    mode === 'draw' ? t('drawHint') : mode === 'pick' ? t('pickHint') : editing ? t('editHint') : t('lockedHint');

  return (
    <Card className="gap-0 overflow-hidden py-0">
      {/* Title + toolbar */}
      <CardHeader className="border-b py-4">
        <CardTitle className="text-lg">{t('title')}</CardTitle>
        <CardDescription className={mode === 'select' ? '' : 'font-medium text-amber-700'}>{hint}</CardDescription>
        <CardAction className="flex gap-2">
          {editing ? (
            <>
              <Button
                variant={mode === 'draw' ? 'secondary' : 'outline'}
                onClick={() => onModeChange(mode === 'draw' ? 'select' : 'draw')}
              >
                {mode === 'draw' ? <X /> : <PenLine />}
                {mode === 'draw' ? t('stopDrawing') : t('drawZone')}
              </Button>
              {/* Lock again */}
              <Button onClick={() => onEditingChange(false)}>
                <Lock /> {t('doneEditing')}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onEditingChange(true)}>
              <LockOpen /> {t('editMap')}
            </Button>
          )}
        </CardAction>
      </CardHeader>

      {/* The map ("isolate" keeps map layers under the page header) */}
      <div className={`relative isolate h-[calc(100svh-190px)] min-h-[420px] ${editing ? 'ring-2 ring-amber-400 ring-inset' : ''}`}>
        <MapContainer
          center={[office.lat, office.lng]}
          zoom={config.defaultZoom}
          className="h-full w-full"
        >
          <TileLayer url={config.tileUrl} attribution={config.tileAttribution} maxZoom={19} />

          <ZoneDrawer
            zones={coloredZones}
            mode={mode}
            selectedZoneId={selectedZoneId}
            editable={editingZoneId === selectedZoneId}
            onSelectZone={onSelectZone}
            onZoneDrawn={onZoneDrawn}
            onZoneReshaped={(id, geojson) => {
              const zone = zones.find((z) => z.id === id);
              if (zone) onSaveZone({ ...zone, geojson });
            }}
            onPointPicked={onPointPicked}
            onCancelDraw={() => onModeChange('select')}
          />

          {/* Zone name + technician in the middle of each zone.
              "key" includes the mode so labels stop catching clicks while drawing. */}
          {coloredZones.map((z) => (
            <Marker
              key={`label-${z.id}-${mode}`}
              position={[z.labelAt.lat, z.labelAt.lng]}
              interactive={mode === 'select'}
              zIndexOffset={-1000}
              eventHandlers={{ click: () => onSelectZone(z.id) }}
              icon={labelIcons[z.id]}
            />
          ))}

          {/* Aqualife office */}
          <Marker position={[office.lat, office.lng]} icon={officeIcon} title={office.name} interactive={false} />

          {/* Technicians */}
          {visibleTechnicians
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
                draggable={editing}
                onMoved={(pos) => onMoveTechnician(tech, pos)}
              />
            ))}

          {/* Saved customers: small dots in their technician's color.
              Not clickable while drawing or picking, so they don't block the map. */}
          {savedCustomers.map((c) => {
            const color = techById[c.technicianId]?.color || config.unassignedColor;
            return (
              <CircleMarker
                key={`cust-${c.id}-${mode}`}
                center={[c.lat, c.lng]}
                radius={6}
                interactive={mode === 'select'}
                pathOptions={{ color: '#ffffff', weight: 2, fillColor: color, fillOpacity: 1 }}
              >
                <Popup>
                  <div className="space-y-1 font-sans text-sm text-foreground">
                    <div className="font-semibold">{c.name}</div>
                    {c.phone && (
                      <a href={`tel:${c.phone.replace(/\s+/g, '')}`} className="block">
                        📞 {c.phone}
                      </a>
                    )}
                    {c.address && <div className="text-xs text-muted-foreground">{c.address}</div>}
                    <div className="text-xs" style={{ color }}>
                      {t('handledBy')}: <b>{c.technicianName}</b>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Customer location + driving route from the office */}
          {route?.line && <Polyline positions={route.line} pathOptions={{ color: config.brandColor, weight: 4, opacity: 0.7, dashArray: '6 8' }} interactive={false} />}
          {customerPoint && <Marker position={[customerPoint.lat, customerPoint.lng]} icon={customerIcon} zIndexOffset={2000} interactive={false} />}

          <MapFocus focus={focus} zones={zones} technicians={technicians} onOpenTech={setOpenTechId} />
        </MapContainer>

        <ViewAllFilter technicians={technicians} value={filter} onChange={onFilterChange} />

        {selectedZone && mode === 'select' && (
          <ZoneAssignPanel
            zone={selectedZone}
            technicians={technicians}
            isNew={selectedZone.id === newZoneId}
            readOnly={editingZoneId !== selectedZone.id}
            onEdit={() => onEditZone(selectedZone.id)}
            onSave={onSaveZone}
            onDelete={onDeleteZone}
            onClose={() => {
              onEditZone(null);
              onSelectZone(null);
            }}
          />
        )}
      </div>
    </Card>
  );
}

// Moves the map when the side panel asks for it (click a zone / technician / search result).
function MapFocus({ focus, zones, technicians, onOpenTech }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    if (focus.kind === 'zone') {
      const zone = zones.find((z) => z.id === focus.id);
      if (zone) {
        const { west, south, east, north } = zoneBounds(zone.geojson);
        map.fitBounds([[south, west], [north, east]], { padding: [60, 60] });
      }
    } else if (focus.kind === 'tech') {
      const tech = technicians.find((x) => x.id === focus.id);
      if (tech) {
        map.setView([tech.lat, tech.lng], Math.max(map.getZoom(), 14));
        onOpenTech(tech.id);
      }
    } else if (focus.kind === 'bounds') {
      // Zoom to fit several shapes (e.g. all districts).
      const box = focus.features.map((f) => zoneBounds(f));
      map.fitBounds(
        [
          [Math.min(...box.map((b) => b.south)), Math.min(...box.map((b) => b.west))],
          [Math.max(...box.map((b) => b.north)), Math.max(...box.map((b) => b.east))],
        ],
        { padding: [30, 30] },
      );
    } else if (focus.kind === 'point') {
      map.setView([focus.position.lat, focus.position.lng], Math.max(map.getZoom(), 14));
    }
    // Only react to a new focus request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focus]);
  return null;
}
