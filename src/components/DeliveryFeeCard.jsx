// "Delivery Fees" card: the price table for the delivery vehicle the super admin
// chose in Settings > Delivery (the vehicle itself is never shown here).
// The band of the customer being checked is highlighted.
import { Truck } from "lucide-react"
import { useLanguage } from "@/i18n"
import { config } from "@/config"
import { cn } from "@/lib/utils"
import { activePricing, useSettings } from "@/lib/settings"
import { deliveryFee, feeRows } from "@/lib/pricing"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Used only in Settings (super admin).
export const VEHICLE_ICON = { moto: "🛵", car: "🚗" }

// km = driving distance of the customer being checked (or null)
export default function DeliveryFeeCard({ km }) {
  const { t } = useLanguage()
  const { delivery } = useSettings()
  const money = (n) => `${config.currencySymbol}${n}`
  const pricing = activePricing(delivery)
  const rows = feeRows(pricing)
  const last = rows[rows.length - 1]
  const { everyKm, fee: extraFee } = pricing.beyond
  const activeFee = km != null ? deliveryFee(km, pricing) : null
  const beyond = activeFee && activeFee.toKm > last.toKm

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("deliveryFees")}</CardTitle>
        <CardDescription>{t("deliveryFeesDesc")}</CardDescription>
        <CardAction>
          <Truck className="size-5 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("distance")}</TableHead>
              <TableHead className="text-right">{t("fee")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const active = activeFee && activeFee.toKm === r.toKm
              return (
                <TableRow key={r.toKm} data-state={active ? "selected" : undefined} className={cn(active && "font-medium")}>
                  <TableCell className="tabular-nums">
                    {r.fromKm}–{r.toKm} km
                  </TableCell>
                  <TableCell className="text-right">
                    {r.fee === 0 ? (
                      <Badge className="bg-green-600 text-white hover:bg-green-600">{t("free")}</Badge>
                    ) : (
                      <span className="tabular-nums">{money(r.fee)}</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {extraFee > 0 && (
              <TableRow data-state={beyond ? "selected" : undefined} className={cn(beyond && "font-medium")}>
                <TableCell>
                  {t("over")} {last.toKm} km
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  +{money(extraFee)} / {everyKm} km
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {beyond && (
          <p className="text-xs text-muted-foreground">
            {activeFee.fromKm}–{activeFee.toKm} km → <span className="font-medium text-foreground">{money(activeFee.fee)}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
