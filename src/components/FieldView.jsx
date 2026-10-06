// Phone screen for Sales and Technicians: check a customer's address and see the price.
// Read-only: no map editing, no saved customers.
// Admins can open it too ("Field view") to see what their team sees.
import { useState } from "react"
import { ArrowLeft, LogOut } from "lucide-react"
import { useLanguage, LanguageSwitch } from "@/i18n"
import { config } from "@/config"
import { isSupabaseConfigured, supabase } from "@/lib/supabase"
import { useMapData } from "@/hooks/useMapData"
import { useDrivingRoute } from "@/hooks/useDrivingRoute"
import { useSettings } from "@/lib/settings"
import { reverseGeocode } from "@/lib/geocode"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import CustomerCheck from "./CustomerCheck"
import DeliveryFeeCard from "./DeliveryFeeCard"

export default function FieldView({ role, onExit }) {
  const { t, lang } = useLanguage()
  const { technicians, zones, loading } = useMapData()
  const [point, setPoint] = useState(null)
  const { office } = useSettings()
  const route = useDrivingRoute(point, office)

  // GPS position: show it right away, then fill in the street address.
  const useMyLocation = (p) => {
    setPoint(p)
    reverseGeocode(p, lang).then((label) => {
      if (label) setPoint((cur) => (cur && cur.lat === p.lat && cur.lng === p.lng ? { ...cur, label } : cur))
    })
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between gap-2 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <img src={config.logoIcon} alt={config.businessName} className="size-8 object-contain" />
            <span className="truncate font-semibold">{config.businessName}</span>
            <Badge variant="secondary">{t(`role_${role}`)}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <LanguageSwitch variant="card" />
            {onExit ? (
              <Button variant="ghost" size="icon-sm" onClick={onExit} aria-label={t("backToDashboard")} title={t("backToDashboard")}>
                <ArrowLeft />
              </Button>
            ) : (
              isSupabaseConfigured && (
                <Button variant="ghost" size="icon-sm" onClick={() => supabase.auth.signOut()} aria-label={t("signOut")} title={t("signOut")}>
                  <LogOut />
                </Button>
              )
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 p-3 pb-10">
        {onExit && (
          <p className="rounded-lg border border-dashed bg-background px-3 py-2 text-center text-xs text-muted-foreground">
            {t("fieldPreviewNote")}
          </p>
        )}
        {loading ? (
          <p className="py-10 text-center text-muted-foreground">{t("loading")}</p>
        ) : (
          <>
            <CustomerCheck
              point={point}
              onPointChange={setPoint}
              onUseMyLocation={useMyLocation}
              route={route}
              zones={zones}
              technicians={technicians}
            />
            <DeliveryFeeCard km={route?.status === "done" ? route.km : null} />
          </>
        )}
      </main>
    </div>
  )
}
