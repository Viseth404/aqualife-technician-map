// Customer check: search an address or pick a point on the map.
// Shows which zone + technician covers it, the driving distance from the
// Aqualife office, and the delivery fee.
import { useEffect, useRef, useState } from 'react';
import { Check, CircleAlert, CircleCheck, Copy, Crosshair, Loader2, LocateFixed, MapPin, Search, UserPlus, X } from 'lucide-react';
import { useLanguage } from '@/i18n';
import { config } from '@/config';
import { newId } from '@/lib/uuid';
import { zonesAtPoint, fmt } from '@/lib/geo';
import { parseMapsLink, resolveShortLink, reverseGeocode, searchAddress } from '@/lib/geocode';
import { deliveryFee } from '@/lib/pricing';
import { activePricing, activeVehicle, isBlockedProvince, useSettings } from '@/lib/settings';
import { isAvailable, zoneHandler } from '@/lib/availability';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  const [linkState, setLinkState] = useState(null); // null | 'busy' (opening a short link) | 'error'
  // The point on screen right now, so a slow address lookup doesn't overwrite a newer pick.
  const current = useRef(point);
  current.current = point;

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
        setResults(await searchAddress(query.trim(), lang, controller.signal, office));
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

  // Switched English ⇄ Khmer: look up the same address again in the new language.
  useEffect(() => {
    const p = current.current;
    if (!p?.parts) return;
    reverseGeocode(p, lang).then((address) => {
      const now = current.current;
      if (!address || !now || now.lat !== p.lat || now.lng !== p.lng) return;
      // Keep a place name from a pasted link in front ("Aeon Mall, …").
      const old = [...new Set(Object.values(p.parts).filter(Boolean))].join(', ');
      const label = p.label?.endsWith(old) ? p.label.slice(0, -old.length) + address.label : address.label;
      onPointChange({ ...p, label, parts: address.parts });
      setQuery(label);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const choose = (r) => {
    onPointChange(r);
    setQuery(r.label);
    setShowResults(false);
  };

  // Pasted a Google Maps link (long or short) or "lat, lng": jump to it, then fill in the street address.
  const openLink = async (link) => {
    setShowResults(false);
    if (link.short) {
      setLinkState('busy');
      const long = await resolveShortLink(link.short);
      link = long && parseMapsLink(long);
      if (!link || link.short) return setLinkState('error');
    }
    setLinkState(null);
    const p = { lat: link.lat, lng: link.lng, label: link.label || `${fmt(link.lat, 5)}, ${fmt(link.lng, 5)}` };
    choose(p);
    const address = await reverseGeocode(p, lang);
    const same = current.current && current.current.lat === p.lat && current.current.lng === p.lng;
    if (!address || !same) return;
    // Keep the place name from the link in front: "Aeon Mall, Sothearos Blvd, Sangkat …"
    const label = link.label && !address.label.startsWith(link.label) ? `${link.label}, ${address.label}` : address.label;
    onPointChange({ ...p, label, parts: address.parts });
    setQuery(label);
  };

  // ---------- Which zone / technician ----------
  const techById = Object.fromEntries(technicians.map((x) => [x.id, x]));
  // One delivery fee, from the price table of the vehicle the super admin chose (Settings > Delivery).
  const { delivery, office } = useSettings();
  // Provinces are blocked unless the super admin accepts them (Settings > Delivery): no zone, fee, or saving.
  const outside = Boolean(point) && isBlockedProvince(point, delivery);
  const hits = point && !outside ? zonesAtPoint(zones, point) : [];
  const fee = route?.status === 'done' ? deliveryFee(route.km, activePricing(delivery)) : null;
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
              setQuery(text);
              if (link) return openLink(link);
              setLinkState(null);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 150)}
            onKeyDown={(e) => e.key === 'Enter' && results[0] && choose(results[0])}
            placeholder={t('searchAddress')}
            className="pl-8"
          />
          {(searching || linkState === 'busy') && <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {showResults && query.trim().length >= 3 && !searching && !linkState && (
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

        {linkState === 'error' && <p className="text-xs text-amber-700">{t('shortLink')}</p>}

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
                setLinkState(null);
              }}
            >
              <X /> {t('clear')}
            </Button>
          )}
        </div>

        {point && (
          <div className="space-y-3 pt-1 text-sm">
            <Separator />
            <LocationRow point={point} />

            {outside ? (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>{t('outsidePhnomPenh')}</AlertTitle>
                <AlertDescription>{t('provinceNotServed')}</AlertDescription>
              </Alert>
            ) : hits.length === 0 ? (
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
                <Row label={t('deliveryFee')}>
                  {fee.free ? (
                    <Badge className="bg-green-600 text-white hover:bg-green-600">{t('freeDelivery')}</Badge>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {fee.fromKm}–{fee.toKm} km
                      </span>
                      <Badge className="bg-amber-500 text-white tabular-nums hover:bg-amber-500">
                        {config.currencySymbol}
                        {Number.isInteger(fee.fee) ? fee.fee : fmt(fee.fee)}
                      </Badge>
                    </span>
                  )}
                </Row>
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
                    vehicle: activeVehicle(delivery), // stored for the record, never shown
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

// The customer's address, one part per row (City / Khan / Sangkat / Phum / Place / Street),
// with one Copy button for the full address (works on phones too).
// Row names follow the place: Phnom Penh has Khan + Sangkat; provinces have
// Srok (or Krong for a provincial town) + Khum (or Sangkat inside a Krong).
function addrLabel(key, parts) {
  const inPhnomPenh = /phnom penh|ភ្នំពេញ/i.test(parts.city || '');
  if (key === 'city') return inPhnomPenh ? 'addr_city' : 'addr_province';
  if (key === 'khan') {
    if (inPhnomPenh || /^(khan|ខណ្ឌ)/i.test(parts.khan)) return 'addr_khan';
    return /^(krong|ក្រុង)/i.test(parts.khan) ? 'addr_krong' : 'addr_srok';
  }
  if (key === 'sangkat') {
    if (inPhnomPenh || /^(sangkat|សង្កាត់)/i.test(parts.sangkat)) return 'addr_sangkat';
    return 'addr_khum';
  }
  return `addr_${key}`;
}

function LocationRow({ point }) {
  const { t } = useLanguage();
  const full = point.label || `${fmt(point.lat, 6)}, ${fmt(point.lng, 6)}`;
  // Every row is always shown; a part the map doesn't know (often Phum) says "Not found".
  // Place (Borey, school, supermarket…) only when there is one.
  const parts = point.parts && ['city', 'khan', 'sangkat', 'phum', 'place', 'street'].filter((key) => key !== 'place' || point.parts.place); // biggest area first
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">{t('location')}</span>
        <CopyButton text={full} />
      </div>
      <div className="space-y-1 rounded-md border bg-muted/40 px-2.5 py-2 select-text">
        {parts ? (
          parts.map((key) => (
            <Row key={key} label={t(addrLabel(key, point.parts))}>
              {point.parts[key] ? (
                <span className="break-words">{point.parts[key]}</span>
              ) : (
                <span className="text-muted-foreground italic">{t('notFound')}</span>
              )}
            </Row>
          ))
        ) : (
          <p className="break-words">{full}</p>
        )}
      </div>
    </div>
  );
}

function CopyButton({ text }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <Button type="button" variant="ghost" size="sm" onClick={copy} className="h-7 px-2 text-xs">
      {copied ? <Check className="text-green-600" /> : <Copy />}
      {copied ? t('copied') : t('copy')}
    </Button>
  );
}

// Copy to the clipboard. Older phones / non-https pages don't have navigator.clipboard,
// so fall back to selecting a hidden text box and using the old copy command.
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const box = document.createElement('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    box.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px'; // 16px: no zoom on iPhone
    document.body.appendChild(box);
    box.select();
    box.setSelectionRange(0, text.length); // iPhone needs this
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      /* not supported */
    }
    box.remove();
    return ok;
  }
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
