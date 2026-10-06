// Main page: header, the map card (left), and side panels (right).
// Holds the shared state: filter, draw mode, selected zone, customer point.
import { useEffect, useMemo, useState } from 'react';
import { CircleAlert, Info, LogOut, PanelRight, X } from 'lucide-react';
import { useLanguage, LanguageSwitch } from './i18n';
import { useMediaQuery } from './hooks/useMediaQuery';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { config } from './config';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { useMapData } from './hooks/useMapData';
import { getDrivingDistance } from './lib/routes';
import { reverseGeocode } from './lib/geocode';
import { newId } from './lib/uuid';
import MapCard from './components/MapCard';
import ServiceAreaList from './components/ServiceAreaList';
import CustomerCheck from './components/CustomerCheck';
import TechnicianManager from './components/TechnicianManager';
import DeliveryFeeCard from './components/DeliveryFeeCard';
import SavedCustomers from './components/SavedCustomers';
import { deliveryFee } from './lib/pricing';
import Login from './components/Login';

export default function App() {
  const { t } = useLanguage();
  // undefined = still checking, null = signed out, object = signed in
  const [session, setSession] = useState(isSupabaseConfigured ? undefined : { demo: true });

  // Watch Supabase login state.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Is this account on the admin list? (supabase/migrations/004_admin_allowlist.sql)
  // undefined = checking, true/false = answer
  const [isAdmin, setIsAdmin] = useState(isSupabaseConfigured ? undefined : true);
  const userId = session?.user?.id;
  useEffect(() => {
    if (!isSupabaseConfigured || !userId) return;
    setIsAdmin(undefined);
    supabase.rpc('is_admin').then(({ data, error }) => {
      // Function not created yet (migration 004 not run): keep the old behaviour.
      if (error) setIsAdmin(true);
      else setIsAdmin(data === true);
    });
  }, [userId]);

  if (session === undefined) return <CenteredMessage text={t('loading')} />;
  if (session === null) return <Login />;
  if (isAdmin === undefined) return <CenteredMessage text={t('loading')} />;
  if (isAdmin === false) return <NotAdmin email={session.user?.email} />;

  return <Dashboard />;
}

// Shown to a logged-in account that is not on the admin list.
function NotAdmin({ email }) {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-6">
      <Alert variant="destructive" className="max-w-md bg-background">
        <CircleAlert />
        <AlertTitle>{t('notAdminTitle')}</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            {email} — {t('notAdminDesc')}
          </p>
          <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
            <LogOut /> {t('signOut')}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

function Dashboard() {
  const { t, lang } = useLanguage();
  const data = useMapData();
  const { technicians, zones, customers } = data;

  const [filter, setFilter] = useState('all'); // 'all' or a technician id
  const [mode, setMode] = useState('select'); // 'select' | 'draw' | 'pick'
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [newZoneId, setNewZoneId] = useState(null);
  // Zones are locked; only the zone whose "Edit" button was clicked can change.
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [customerPoint, setCustomerPoint] = useState(null);
  const [focus, setFocus] = useState(null);

  // Map lock: locked by default so a wrong click can't change zones or pins.
  // Remembered per browser.
  const [editing, setEditingState] = useState(() => {
    try {
      return localStorage.getItem('aqulife-map-editing') === '1';
    } catch {
      return false;
    }
  });
  const setEditing = (on) => {
    setEditingState(on);
    try {
      localStorage.setItem('aqulife-map-editing', on ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (!on) {
      setMode((m) => (m === 'draw' ? 'select' : m)); // stop any drawing
      setNewZoneId(null);
      setEditingZoneId(null); // lock the zone being edited too
    }
  };
  const [route, setRoute] = useState(null); // driving route office -> customer

  // Driving distance whenever the customer point moves.
  useEffect(() => {
    if (!customerPoint) {
      setRoute(null);
      return;
    }
    const controller = new AbortController();
    setRoute({ status: 'loading' });
    getDrivingDistance(config.office, customerPoint, controller.signal)
      .then((r) => setRoute({ status: 'done', ...r }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error(err);
        setRoute({ status: 'error' });
      });
    return () => controller.abort();
  }, [customerPoint?.lat, customerPoint?.lng]);

  // ---------- "View All" filter ----------
  const visibleZones = useMemo(
    () => (filter === 'all' ? zones : zones.filter((z) => z.mainTechnicianId === filter || z.backupTechnicianId === filter)),
    [zones, filter],
  );
  const visibleCustomers = useMemo(
    () => (filter === 'all' ? customers : customers.filter((c) => c.technicianId === filter)),
    [customers, filter],
  );
  const visibleTechnicians = useMemo(
    () => (filter === 'all' ? technicians : technicians.filter((x) => x.id === filter)),
    [technicians, filter],
  );

  // If the selected zone gets hidden or deleted, close its panel.
  useEffect(() => {
    if (selectedZoneId && !visibleZones.some((z) => z.id === selectedZoneId)) setSelectedZoneId(null);
  }, [visibleZones, selectedZoneId]);

  // ---------- Actions ----------
  const changeMode = (next) => {
    if (next === 'draw') {
      setFilter('all'); // a new zone has no technician yet, so show everything
      setSelectedZoneId(null);
    }
    setMode(next);
  };

  const handleZoneDrawn = (id, geojson) => {
    data.saveZone({ id, name: `${t('zone')} ${zones.length + 1}`, geojson, mainTechnicianId: null, backupTechnicianId: null });
    setNewZoneId(id);
    setEditingZoneId(id); // a brand-new zone opens ready to edit
    setMode('select');
    setSelectedZoneId(id);
  };

  // "Add Phnom Penh districts": create one zone per khan (skips names that already exist).
  // Boundaries: OpenStreetMap, simplified so they are easy to edit. File: src/data/phnom-penh-districts.json
  const addDistrictZones = async () => {
    const { default: districts } = await import('./data/phnom-penh-districts.json');
    const existing = new Set(zones.map((z) => z.name.trim().toLowerCase()));
    const toAdd = districts.features.filter((f) => !existing.has(f.properties.name.toLowerCase()));
    setFilter('all');
    setMode('select');
    setSelectedZoneId(null);
    await Promise.all(
      toAdd.map((f) =>
        data.saveZone({
          id: newId(),
          name: f.properties.name,
          geojson: { type: 'Feature', geometry: f.geometry, properties: {} },
          mainTechnicianId: null,
          backupTechnicianId: null,
        }),
      ),
    );
    setFocus({ kind: 'bounds', features: districts.features, at: Date.now() }); // zoom to all of Phnom Penh
    setPanelsOpen(false);
  };

  const handleSelectZone = (id) => {
    setSelectedZoneId(id);
    if (id !== editingZoneId) setEditingZoneId(null); // picking another zone locks the last one
    if (id !== newZoneId) setNewZoneId(null);
  };

  const handleDeleteZone = (id) => {
    setSelectedZoneId(null);
    data.deleteZone(id);
  };

  // Below laptop size, the side panels live in a Sheet (slide-in panel).
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  // Wide screens get a third column on the left for the Delivery Fees card.
  const isWide = useMediaQuery('(min-width: 1280px)');
  const feeCard = <DeliveryFeeCard activeFee={route?.status === 'done' ? deliveryFee(route.km) : null} />;
  const customersCard = (
    <SavedCustomers
      customers={visibleCustomers}
      technicians={technicians}
      onDelete={data.deleteCustomer}
      onSelect={(c) => {
        setMode('select');
        setCustomerPoint({ lat: c.lat, lng: c.lng, label: c.address || c.name });
        setFocus({ kind: 'point', position: { lat: c.lat, lng: c.lng }, at: Date.now() });
        setPanelsOpen(false);
      }}
    />
  );
  const [panelsOpen, setPanelsOpen] = useState(false);

  const focusZone = (id) => {
    setMode('select');
    setSelectedZoneId(id);
    setFocus({ kind: 'zone', id, at: Date.now() });
    setPanelsOpen(false); // show the map
  };

  const handleCustomerPoint = (p, { fromMap = false } = {}) => {
    setCustomerPoint(p);
    if (fromMap) {
      setMode('select'); // one click = one check
      if (!isDesktop) setPanelsOpen(true); // show the result
      // Look up the address of the clicked point and show it.
      reverseGeocode(p, lang).then((label) => {
        if (label) setCustomerPoint((cur) => (cur && cur.lat === p.lat && cur.lng === p.lng ? { ...cur, label } : cur));
      });
    } else if (p) setFocus({ kind: 'point', position: p, at: Date.now() });
  };

  // The three cards on the right (or inside the Sheet).
  const panels = (
    <>
      <ServiceAreaList
        zones={visibleZones}
        technicians={technicians}
        selectedZoneId={selectedZoneId}
        onZoneClick={focusZone}
        onAddDistricts={editing ? addDistrictZones : null}
      />
      <CustomerCheck
        point={customerPoint}
        onPointChange={(p) => handleCustomerPoint(p)}
        picking={mode === 'pick'}
        onTogglePicking={() => {
          const next = mode === 'pick' ? 'select' : 'pick';
          changeMode(next);
          if (next === 'pick') setPanelsOpen(false); // get out of the way so the map can be clicked
        }}
        route={route}
        zones={zones}
        technicians={technicians}
        onSaveCustomer={data.saveCustomer}
      />
      {!isWide && feeCard}
      {!isWide && customersCard}
      <TechnicianManager
        technicians={technicians}
        onSave={data.saveTechnician}
        onDelete={data.deleteTechnician}
        onFocus={(tech) => {
          setFilter('all');
          setFocus({ kind: 'tech', id: tech.id, at: Date.now() });
          setPanelsOpen(false);
        }}
      />
    </>
  );

  return (
    <div className="min-h-svh bg-muted/40">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src={config.logoIcon} alt={config.businessName} className="size-9 object-contain" />
            <div className="min-w-0">
              <div className="truncate font-semibold leading-tight">{config.businessName}</div>
              <div className="hidden truncate text-xs text-muted-foreground sm:block">{t('subtitle')}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitch />
            {!isDesktop && (
              <Button variant="outline" size="sm" onClick={() => setPanelsOpen(true)}>
                <PanelRight /> <span className="hidden sm:inline">{t('panels')}</span>
              </Button>
            )}
            {isSupabaseConfigured && (
              <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
                <LogOut /> <span className="hidden sm:inline">{t('signOut')}</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-4 p-3 sm:p-4">
        {!isSupabaseConfigured && (
          <Alert>
            <Info />
            <AlertDescription>{t('demoMode')}</AlertDescription>
          </Alert>
        )}
        {data.error && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription className="flex items-center justify-between gap-2">
              {data.error}
              <Button variant="ghost" size="icon-xs" onClick={data.clearError} aria-label={t('close')}>
                <X />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {data.loading ? (
          <CenteredMessage text={t('loading')} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[260px_minmax(0,1fr)_380px]">
            {isWide && (
              <aside className="space-y-4 xl:max-h-[calc(100svh-96px)] xl:overflow-y-auto">
                {feeCard}
                {customersCard}
              </aside>
            )}
            <MapCard
              technicians={technicians}
              visibleTechnicians={visibleTechnicians}
              zones={zones}
              visibleZones={visibleZones}
              filter={filter}
              onFilterChange={setFilter}
              mode={mode}
              onModeChange={changeMode}
              selectedZoneId={selectedZoneId}
              newZoneId={newZoneId}
              onSelectZone={handleSelectZone}
              onZoneDrawn={handleZoneDrawn}
              onSaveZone={data.saveZone}
              onDeleteZone={handleDeleteZone}
              onMoveTechnician={(tech, pos) => data.saveTechnician({ ...tech, ...pos })}
              customerPoint={customerPoint}
              savedCustomers={visibleCustomers}
              route={route}
              onPointPicked={(p) => handleCustomerPoint(p, { fromMap: true })}
              focus={focus}
              editing={editing}
              onEditingChange={setEditing}
              editingZoneId={editingZoneId}
              onEditZone={setEditingZoneId}
            />

            {isDesktop ? (
              <aside className="space-y-4 lg:max-h-[calc(100svh-96px)] lg:overflow-y-auto lg:pr-1">{panels}</aside>
            ) : (
              <Sheet open={panelsOpen} onOpenChange={setPanelsOpen}>
                <SheetContent className="w-full gap-0 bg-muted p-0 sm:max-w-md">
                  <SheetHeader className="border-b bg-background">
                    <SheetTitle>{t('panels')}</SheetTitle>
                    <SheetDescription>{t('subtitle')}</SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 space-y-4 overflow-y-auto p-4">{panels}</div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function CenteredMessage({ text, error }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <p className={`max-w-md text-center ${error ? 'text-destructive' : 'text-muted-foreground'}`}>{text}</p>
    </div>
  );
}
