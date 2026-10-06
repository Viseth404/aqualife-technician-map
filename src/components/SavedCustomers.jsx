// "Saved Customers" card: customers saved from Customer Check.
// Search by name / phone / address, click to show on the map, delete.
import { useState } from "react"
import { Phone, Search, Trash2, Users } from "lucide-react"
import { useLanguage } from "@/i18n"
import { config } from "@/config"
import { fmt } from "@/lib/geo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { VEHICLE_ICON } from "./DeliveryFeeCard"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// "$25" for whole dollars, "$2.50" otherwise.
const money = (n) => `${config.currencySymbol}${Number.isInteger(Number(n)) ? Number(n) : fmt(n)}`

export default function SavedCustomers({ customers, technicians, onSelect, onDelete }) {
  const { t, lang } = useLanguage()
  const [search, setSearch] = useState("")
  const techById = Object.fromEntries(technicians.map((x) => [x.id, x]))

  const q = search.trim().toLowerCase()
  const list = [...customers]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")) // newest first
    .filter((c) => !q || [c.name, c.phone, c.address, c.technicianName].some((v) => v?.toLowerCase().includes(q)))

  const dateFmt = new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric" })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("savedCustomers")}</CardTitle>
        <CardAction>
          <Badge variant="secondary" className="tabular-nums">
            <Users /> {customers.length}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search only helps once the list is longer */}
        {customers.length > 3 && (
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchCustomers")} className="pl-8" />
          </div>
        )}

        {customers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            <Users className="size-6" />
            {t("noSavedCustomers")}
          </div>
        ) : (
          <ScrollArea className="-mx-2 max-h-96 [&>[data-slot=scroll-area-viewport]]:max-h-96 [&>[data-slot=scroll-area-viewport]>div]:!block">
            <ul className="divide-y px-2">
              {list.map((c) => {
                // Use the technician's current color; gray if they were deleted.
                const color = techById[c.technicianId]?.color || config.unassignedColor
                return (
                  <li key={c.id} className="group relative">
                    <button
                      onClick={() => onSelect(c)}
                      className="flex w-full gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-muted/60"
                    >
                      {/* Initial in the technician's color */}
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {c.name?.[0]?.toUpperCase() || "?"}
                      </span>

                      <span className="min-w-0 flex-1">
                        {/* Line 1: name + fee */}
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium">{c.name}</span>
                          {c.fee != null &&
                            (c.fee === 0 ? (
                              <span className="shrink-0 text-xs font-medium text-green-600">{t("free")}</span>
                            ) : (
                              <span className="shrink-0 text-sm font-semibold tabular-nums">
                                {c.vehicle && <span className="mr-1 font-normal">{VEHICLE_ICON[c.vehicle]}</span>}
                                {money(c.fee)}
                              </span>
                            ))}
                        </span>

                        {/* Line 2: phone + distance */}
                        <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex min-w-0 items-center gap-1 truncate">
                            {c.phone ? (
                              <>
                                <Phone className="size-3 shrink-0" /> {c.phone}
                              </>
                            ) : (
                              c.address || "—"
                            )}
                          </span>
                          {c.distanceKm != null && <span className="shrink-0 tabular-nums">{fmt(c.distanceKm, 1)} km</span>}
                        </span>

                        {/* Line 3: technician + date */}
                        <span className="mt-1 flex items-center gap-1.5 pr-7 text-xs text-muted-foreground">
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                          <span className="font-medium" style={{ color }}>
                            {c.technicianName}
                          </span>
                          {c.createdAt && <span>· {dateFmt.format(new Date(c.createdAt))}</span>}
                        </span>

                        {/* Optional: address (when a phone was shown above) and note */}
                        {c.phone && c.address && <span className="mt-1 line-clamp-1 pr-7 text-xs text-muted-foreground">{c.address}</span>}
                        {c.note && <span className="mt-1 line-clamp-1 pr-7 text-xs text-muted-foreground italic">“{c.note}”</span>}
                      </span>
                    </button>

                    {/* Delete: bottom-right of the row, shown on hover (always visible on touch screens) */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="absolute right-1.5 bottom-2 size-6 rounded-md text-muted-foreground transition-opacity hover:bg-destructive/10 hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                          aria-label={t("delete")}
                        >
                          <Trash2 />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("delete")} {c.name}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>{t("deleteCustomerDesc")}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction variant="destructive" onClick={() => onDelete(c.id)}>
                            {t("delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </li>
                )
              })}
              {list.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">{t("noCustomerMatch")}</li>}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
