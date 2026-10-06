// Customer check: search an address or pick a point on the map.
// Shows which zone + technician covers it, the driving distance from the
// Aqualife office, and the delivery fee.
import { useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, Crosshair, Loader2, LocateFixed, MapPin, Search, UserPlus, X } from 'lucide-react';
import { useLanguage } from '@/i18n';
import { config } from '@/config';
import { newId } from '@/lib/uuid';
import { zonesAtPoint, fmt } from '@/lib/geo';
import { parseMapsLink, searchAddress } from '@/lib/geocode';
import { deliveryFee } from '@/lib/pricing';
import { isAvailable, zoneHandler } from '@/lib/availability';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';

// Optional props (the phone screen for sales/technicians leaves them out):
//   onTogglePicking – shows "Pick on map"
//   onSaveCustomer  – shows "Save customer"
//   onUseMyLocation – shows "My location" (uses the phone's GPS)
export default function CustomerCheck({
  point,
  onPointChange,
  picking,
  onTogglePicking,
  onUseMyLocation,
  route,
  zones,
  technicians,
  onSaveCustomer,
}) {
  const { t, lang } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [linkHint, setLinkHint] = useState(false); // short Google link pasted

  // ---------- Address search (waits until you stop typing) ----------
  useEffect(() => {
    if (query.trim().length < 3 || parseMapsLink(query) !== null) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchAddress(query.trim(), lang, controller.signal));
      } catch (err) {
        if (err.name !== 'AbortError') setResults([]);
      }
      setSearching(false);
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, lang]);

  // "My location": ask the phone for its GPS position (needs https and permission).
  const [locating, setLocating] = useState(null); // null | 'busy' | 'error'
  const useMyLocation = () => {
    if (!navigator.geolocation) return setLocating('error');
    setLocating('busy');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(null);
        setQuery('');
        onUseMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setLocating('error'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  const choose = (r) => {
    onPointChange(r);
    setQuery(r.label);
    setShowResults(false);
  };

  // ---------- Which zone / technician ----------
  const techById = Object.fromEntries(technicians.map((x) => [x.id, x]));
  const hits = point ? zonesAtPoint(zones, point) : [];
  const fee = route?.status === 'done' ? deliveryFee(route.km) : null;
  // The zone that has a main technician (only then can the customer be saved).
  // Zone with a technician working today (main, or backup if main is off).
  // If everyone in the zone is off, fall back to the main technician so the customer can still be saved.
  const assignedZone =
    hits.find((z) => zoneHandler(z, techById).tech) || hits.find((z) => techById[z.mainTechnicianId]);
  const assignedTech = assignedZone && (zoneHandler(assignedZone, techById).tech || techById[assignedZone.mainTechnicianId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('customerCheck')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search box + results list */}
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              const text = e.target.value;
              // Pasted a Google Maps link or "lat, lng"? Jump straight to it.
              const link = parseMapsLink(text);
              setLinkHint(link === 'short');
              if (link && link !== 'short') {
                const label = link.label || `${fmt(link.lat, 5)}, ${fmt(link.lng, 5)}`;
                choose({ ...link, label });
                return;
              }
              setQuery(text);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 150)}
            onKeyDown={(e) => e.key === 'Enter' && results[0] && choose(results[0])}
            placeholder={t('searchAddress')}
            className="pl-8"
          />
          {searching && <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {showResults && query.trim().length >= 3 && !searching && !linkHint && (
            <ul className="absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
              {results.length === 0 && <li className="px-2 py-1.5 text-sm text-muted-foreground">{t('noResults')}</li>}
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(r)}
                    className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {linkHint && <p className="text-xs text-amber-700">{t('shortLink')}</p>}

        {locating === 'error' && <p className="text-xs text-destructive">{t('locationError')}</p>}

        <div className="flex gap-2">
          {onTogglePicking && (
            <Button variant={picking ? 'default' : 'outline'} className="flex-1" onClick={onTogglePicking}>
              <Crosshair /> {picking ? t('picking') : t('pickOnMap')}
            </Button>
          )}
          {onUseMyLocation && (
            <Button variant="outline" className="flex-1" onClick={useMyLocation} disabled={locating === 'busy'}>
              {locating === 'busy' ? <Loader2 className="animate-spin" /> : <LocateFixed />} {t('myLocation')}
            </Button>
          )}
          {point && (
            <Button
              variant="ghost"
              onClick={() => {
                onPointChange(null);
                setQuery('');
              }}
            >
              <X /> {t('clear')}
            </Button>
          )}
        </div>

        {point && (
          <div className="space-y-3 pt-1 text-sm">
            <Separator />
            <Row label={t('location')}>{point.label || `${fmt(point.lat, 5)}, ${fmt(point.lng, 5)}`}</Row>

            {hits.length === 0 ? (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>{t('noTechnician')}</AlertTitle>
              </Alert>
            ) : (
              hits.map((zone) => {
                const { tech, role, main, backup } = zoneHandler(zone, techById);
                return (
                  <div key={zone.id} className="space-y-1.5 rounded-lg border bg-muted/40 p-3">
                    <Row label={t('insideZone')}>
                      <span className="font-medium">{zone.name}</span>
                    </Row>
                    <Row label={t('handledBy')}>
                      {tech ? (
                        <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: tech.color }}>
                          <span className="size-2 rounded-full" style={{ backgroundColor: tech.color }} />
                          {tech.name}
                          {(role === 'backup' || role === 'cover') && <Badge variant="outline">{t(role)}</Badge>}
                          {tech.phone && <span className="font-normal text-muted-foreground">({tech.phone})</span>}
                        </span>
                      ) : role === 'nobody' ? (
                        <span className="font-medium text-amber-700">{t('noTechAvailable')}</span>
                      ) : (
                        <span className="font-medium text-destructive">{t('noTechnician')}</span>
                      )}
                    </Row>
                    {/* Show the other technician and whether they are off today */}
                    {(role === 'backup' || role === 'cover') && main && (
                      <Row label={t('main')}>
                        <span className="text-muted-foreground line-through">{main.name}</span>{' '}
                        <span className="text-xs text-amber-700">{t('offToday')}</span>
                      </Row>
                    )}
                    {role === 'cover' && backup && (
                      <Row label={t('backup')}>
                        <span className="text-muted-foreground line-through">{backup.name}</span>{' '}
                        <span className="text-xs text-amber-700">{t('offToday')}</span>
                      </Row>
                    )}
                    {role === 'main' && backup && (
                      <Row label={t('backup')}>
                        {backup.name}
                        {!isAvailable(backup) && <span className="text-xs text-amber-700"> · {t('offToday')}</span>}
                      </Row>
                    )}
                    {role === 'nobody' && (
                      <Row label={t('offToday')}>
                        <span className="text-muted-foreground">{[main?.name, backup?.name].filter(Boolean).join(', ')}</span>
                      </Row>
                    )}
                  </div>
                );
              })
            )}

            {route?.status === 'loading' && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> {t('calculating')}
              </p>
            )}
            {route?.status === 'error' && <p className="text-destructive">{t('routeError')}</p>}
            {route?.status === 'done' && (
              <div className="space-y-1.5 rounded-lg border p-3">
                <Row label={t('distance')}>
                  <span className="font-semibold tabular-nums">{fmt(route.km, 1)} km</span>
                </Row>
                <Row label={t('driveTime')}>
                  <span className="tabular-nums">
                    {route.minutes} {t('min')}
                  </span>
                </Row>
                <Separator className="my-2" />
                {fee.free ? (
                  <Badge className="bg-green-600 text-white hover:bg-green-600">{t('freeDelivery')}</Badge>
                ) : (
                  <Row label={t('deliveryFee')}>
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {fee.fromKm}–{fee.toKm} km
                      </span>
                      <Badge className="bg-amber-500 text-white tabular-nums hover:bg-amber-500">
                        {config.currencySymbol}
                        {fmt(fee.fee)}
                      </Badge>
                    </span>
                  </Row>
                )}
              </div>
            )}

            {assignedTech && onSaveCustomer && (
              <SaveCustomerForm
                key={`${point.lat},${point.lng}`}
                busy={route?.status === 'loading'}
                onSave={(form) =>
                  onSaveCustomer({
                    id: newId(),
                    ...form,
                    address: point.label || '',
                    lat: point.lat,
                    lng: point.lng,
                    zoneId: assignedZone.id,
                    zoneName: assignedZone.name,
                    technicianId: assignedTech.id,
                    technicianName: assignedTech.name,
                    distanceKm: route?.status === 'done' ? Math.round(route.km * 10) / 10 : null,
                    fee: fee ? fee.fee : null,
                  })
                }
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// "Save customer" button that opens a small name / phone / note form.
// Only shown when the location has an assigned technician.
function SaveCustomerForm({ onSave, busy }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', note: '' });
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  if (saved) {
    return (
      <Alert className="border-green-200 bg-green-50 text-green-800">
        <CircleCheck />
        <AlertTitle>{t('customerSaved')}</AlertTitle>
      </Alert>
    );
  }
  if (!open) {
    return (
      <Button className="w-full" onClick={() => setOpen(true)} disabled={busy}>
        <UserPlus /> {t('saveCustomer')}
      </Button>
    );
  }
  return (
    <form
      className="space-y-3 rounded-lg border p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!form.name.trim() || saving) return;
        setSaving(true);
        setFailed(false);
        const ok = await onSave({ name: form.name.trim(), phone: form.phone.trim(), note: form.note.trim() });
        setSaving(false);
        if (ok) setSaved(true);
        else setFailed(true); // the exact error is shown at the top of the page
      }}
    >
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel htmlFor="cust-name">{t('customerName')}</FieldLabel>
          <Input id="cust-name" value={form.name} onChange={set('name')} required autoFocus />
        </Field>
        <Field>
          <FieldLabel htmlFor="cust-phone">{t('phone')}</FieldLabel>
          <Input id="cust-phone" type="tel" placeholder="012 345 678" value={form.phone} onChange={set('phone')} />
        </Field>
        <Field>
          <FieldLabel htmlFor="cust-note">{t('note')}</FieldLabel>
          <Input id="cust-note" value={form.note} onChange={set('note')} placeholder={t('notePlaceholder')} />
        </Field>
      </FieldGroup>
      {failed && <p className="text-sm text-destructive">{t('saveFailed')}</p>}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          {t('save')}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}

// Label on the left, value on the right.
function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
