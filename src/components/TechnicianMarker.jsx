// One technician on the map: a teardrop pin in their color,
// with their round photo (or first letter) inside and name below.
// Click the pin to open a popup with phone, zones and a Call button.
import { useEffect, useMemo, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Marker, Popup } from 'react-leaflet';
import L from '../lib/leaflet';
import { Phone } from 'lucide-react';
import { useLanguage } from '@/i18n';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import TechAvatar from './TechAvatar';

// Photo inside a circle, or the first letter if there is no photo.
export function Avatar({ tech, size = 32 }) {
  const style = { width: size, height: size, fontSize: size * 0.45 };
  return tech.photoUrl ? (
    <img src={tech.photoUrl} alt={tech.name} style={style} className="rounded-full bg-white object-cover" />
  ) : (
    <span style={{ ...style, color: tech.color }} className="flex items-center justify-center rounded-full bg-white font-bold">
      {tech.name?.[0]?.toUpperCase() || '?'}
    </span>
  );
}

// The pin drawing. Turned into HTML for Leaflet's divIcon.
function Pin({ tech, available, offLabel }) {
  return (
    // Technicians who are off today are shown grey and faded.
    <div className="relative flex flex-col items-center" style={available ? undefined : { filter: 'grayscale(1)', opacity: 0.55 }}>
      {/* Teardrop: a square with 3 round corners, turned 45° so the sharp corner points down. */}
      <div
        className="flex h-11 w-11 items-center justify-center rounded-[50%_50%_50%_0] shadow-lg ring-2 ring-white"
        style={{ backgroundColor: tech.color, transform: 'rotate(-45deg)' }}
      >
        <div style={{ transform: 'rotate(45deg)' }}>
          <Avatar tech={tech} size={34} />
        </div>
      </div>
      <span
        className="mt-3 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold text-white shadow"
        style={{ backgroundColor: tech.color }}
      >
        {tech.name}
        {!available && ` · ${offLabel}`}
      </span>
    </div>
  );
}

export default function TechnicianMarker({ tech, zones, isOpen, onOpen, onClose, draggable, onMoved, available = true }) {
  const { t } = useLanguage();
  const markerRef = useRef(null);

  // Build the pin icon only when the look changes.
  const icon = useMemo(
    () =>
      L.divIcon({
        className: 'tech-pin', // no default white box
        html: renderToStaticMarkup(<Pin tech={tech} available={available} offLabel={t('offToday')} />),
        iconSize: [80, 80],
        iconAnchor: [40, 52], // the pin tip
        popupAnchor: [0, -52],
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tech.name, tech.color, tech.photoUrl, available, t('offToday')],
  );

  // Open the popup when asked from outside (e.g. click in the technician list).
  useEffect(() => {
    if (isOpen) markerRef.current?.openPopup();
  }, [isOpen]);

  // Zones where this technician is main or backup.
  const myZones = zones.filter((z) => z.mainTechnicianId === tech.id || z.backupTechnicianId === tech.id);

  return (
    <Marker
      ref={markerRef}
      position={[tech.lat, tech.lng]}
      icon={icon}
      draggable={draggable}
      zIndexOffset={isOpen ? 1000 : 100}
      eventHandlers={{
        popupopen: onOpen,
        popupclose: onClose,
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng();
          onMoved({ lat, lng });
        },
      }}
    >
      <Popup minWidth={240}>
        <div className="space-y-3 font-sans text-foreground">
          <div className="flex items-center gap-3">
            <TechAvatar tech={tech} className="size-10" />
            <div>
              <div className="flex items-center gap-2 text-base font-semibold">
                {tech.name}
                {!available && (
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    {t('offToday')}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="size-3.5" /> {tech.phone || '—'}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">{t('zones')}</div>
            {myZones.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t('noZones')}</div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {myZones.map((z) => (
                  <Badge key={z.id} variant={z.mainTechnicianId === tech.id ? 'secondary' : 'outline'}>
                    {z.name} · {z.mainTechnicianId === tech.id ? t('main') : t('backup')}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {tech.phone && (
            <Button asChild className="w-full bg-green-600 hover:bg-green-700">
              <a href={`tel:${tech.phone.replace(/\s+/g, '')}`} style={{ color: '#fff' }}>
                <Phone /> {t('call')}
              </a>
            </Button>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
