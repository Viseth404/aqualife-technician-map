// "Delivery Fees" card: the price table from src/config.js.
// The band of the customer being checked is highlighted.
import { Truck } from "lucide-react"
import { useLanguage } from "@/i18n"
import { config } from "@/config"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Build table rows: [{ fromKm, toKm, fee }] from the config.
function feeRows() {
  let fromKm = 0
  return config.deliveryFees.map((row) => {
    const r = { fromKm, toKm: row.upToKm, fee: row.fee }
    fromKm = row.upToKm + 1
    return r
  })
}

export default function DeliveryFeeCard({ activeFee }) {
  const { t } = useLanguage()
  const rows = feeRows()
  const last = rows[rows.length - 1]
  const { everyKm, fee: extraFee } = config.beyondLastRow
  const money = (n) => `${config.currencySymbol}${n}`
  // Is the checked customer farther than the last row?
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
      <CardContent>
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
          <p className="mt-2 text-xs text-muted-foreground">
            {activeFee.fromKm}–{activeFee.toKm} km → <span className="font-medium text-foreground">{money(activeFee.fee)}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
