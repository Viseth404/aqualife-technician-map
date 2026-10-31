// "Service Areas" card: every zone with technician, color, and area.
// Click a zone to zoom to it on the map.
import { MapPinned } from "lucide-react"
import { useLanguage } from "@/i18n"
import { zoneAreaKm2, fmt } from "@/lib/geo"
import { config } from "@/config"
import { cn } from "@/lib/utils"
import { isAvailable, zoneHandler } from "@/lib/availability"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import AddAreasDialog from "./AddAreasDialog"

export default function ServiceAreaList({ zones, technicians, selectedZoneId, onZoneClick, onAddDistricts }) {
  const { t } = useLanguage()
  const techById = Object.fromEntries(technicians.map((x) => [x.id, x]))
  const total = zones.reduce((sum, z) => sum + zoneAreaKm2(z.geojson), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("serviceAreas")}</CardTitle>
        <CardDescription>
          {t("totalArea")}: {fmt(total)} km²
        </CardDescription>
        <CardAction>
          <Badge variant="secondary" title={t("zones")}>
            <MapPinned /> {zones.length}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {zones.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            <MapPinned className="size-6" />
            {t("noZonesYet")}
            {onAddDistricts ? (
              <div className="mt-1">
                <AddAreasDialog zones={zones} onAdd={onAddDistricts} variant="default" />
              </div>
            ) : (
              <span className="text-xs">{t("unlockToAdd")}</span>
            )}
          </div>
        ) : (
          <ScrollArea className="max-h-80 [&>[data-slot=scroll-area-viewport]]:max-h-80 [&>[data-slot=scroll-area-viewport]>div]:!block">
            <ul className="space-y-2 pr-3">
              {zones.map((zone) => {
                const main = techById[zone.mainTechnicianId]
                const backup = techById[zone.backupTechnicianId]
                const handler = zoneHandler(zone, techById) // who works this zone today
                return (
                  <li key={zone.id}>
                    <button
                      onClick={() => onZoneClick(zone.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/60",
                        zone.id === selectedZoneId && "border-primary bg-primary/5"
                      )}
                    >
                      <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: handler.tech?.color || config.unassignedColor }} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{zone.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {main ? (
                            <span className={cn(!isAvailable(main) && "line-through")}>{main.name}</span>
                          ) : (
                            <span className="text-destructive">{t("unassigned")}</span>
                          )}
                          {backup && (
                            <>
                              {` · ${t("backup")}: `}
                              <span className={cn(!isAvailable(backup) && "line-through", handler.role === "backup" && "font-medium text-foreground")}>
                                {backup.name}
                              </span>
                            </>
                          )}
                          {handler.role === "cover" && (
                            <span className="font-medium text-foreground">
                              {" "}
                              · {t("cover")}: {handler.tech.name}
                            </span>
                          )}
                          {handler.role === "nobody" && <span className="text-amber-700"> · {t("noTechAvailable")}</span>}
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 tabular-nums">
                        {fmt(zoneAreaKm2(zone.geojson))} km²
                      </Badge>
                    </button>
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
        )}
        {zones.length > 0 && onAddDistricts && <div className="mt-3 flex flex-wrap justify-end gap-2"><AddAreasDialog zones={zones} onAdd={onAddDistricts} /></div>}
      </CardContent>
    </Card>
  )
}
