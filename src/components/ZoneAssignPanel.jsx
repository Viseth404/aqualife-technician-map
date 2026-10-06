// Panel shown on the map when a zone is selected (or just drawn).
// Rename the zone, choose main + backup technician, or delete it.
import { useEffect, useState } from "react"
import { Check, Lock, Pencil, Trash2, X } from "lucide-react"
import { isAvailable } from "@/lib/availability"
import { useLanguage } from "@/i18n"
import { zoneAreaKm2, fmt } from "@/lib/geo"
import { config } from "@/config"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import TechSelect from "./TechSelect"

export default function ZoneAssignPanel({ zone, technicians, isNew, onSave, onDelete, onClose, onEdit, readOnly = false }) {
  const { t } = useLanguage()
  const [name, setName] = useState(zone.name)
  const [mainId, setMainId] = useState(zone.mainTechnicianId || "")
  const [backupId, setBackupId] = useState(zone.backupTechnicianId || "")

  // When a different zone is selected (or another admin edits it), reload the form.
  useEffect(() => {
    setName(zone.name)
    setMainId(zone.mainTechnicianId || "")
    setBackupId(zone.backupTechnicianId || "")
  }, [zone.id, zone.name, zone.mainTechnicianId, zone.backupTechnicianId])

  const mainTech = technicians.find((x) => x.id === mainId)

  const save = (e) => {
    e?.preventDefault()
    onSave({
      ...zone,
      name: name.trim() || zone.name,
      mainTechnicianId: mainId || null,
      // Backup cannot be the same person as main.
      backupTechnicianId: backupId && backupId !== mainId ? backupId : null,
    })
    onClose() // done: close the panel
  }

  // Map locked: show the zone's info only, no inputs or delete.
  if (readOnly) {
    const backupTech = technicians.find((x) => x.id === zone.backupTechnicianId)
    const techLine = (tech) =>
      tech ? (
        <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: tech.color }}>
          <span className="size-2 rounded-full" style={{ backgroundColor: tech.color }} />
          {tech.name}
          {!isAvailable(tech) && <span className="text-xs font-normal text-amber-700">· {t("offToday")}</span>}
        </span>
      ) : (
        <span className="text-muted-foreground">{t("none")}</span>
      )
    return (
      <Card className="absolute top-3 right-3 z-[1001] w-72 max-w-[calc(100%-1.5rem)] shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="size-3 rounded-sm" style={{ backgroundColor: mainTech?.color || config.unassignedColor }} />
            {zone.name}
          </CardTitle>
          <CardDescription>{fmt(zoneAreaKm2(zone.geojson))} km²</CardDescription>
          <CardAction>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t("close")}>
              <X />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{t("mainTech")}</span>
            {techLine(mainTech)}
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{t("backupTech")}</span>
            {techLine(backupTech)}
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" /> {t("locked")}
          </span>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil /> {t("edit")}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="absolute top-3 right-3 z-[1001] w-80 max-w-[calc(100%-1.5rem)] shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="size-3 rounded-sm" style={{ backgroundColor: mainTech?.color || config.unassignedColor }} />
          {t("zone")}
        </CardTitle>
        <CardDescription>{fmt(zoneAreaKm2(zone.geojson))} km²</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t("close")}>
            <X />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        {isNew && (
          <Alert className="mb-4">
            <AlertDescription>{t("newZoneHint")}</AlertDescription>
          </Alert>
        )}
        <form id="zone-form" onSubmit={save}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="zone-name">{t("zoneName")}</FieldLabel>
              <Input id="zone-name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="zone-main">{t("mainTech")}</FieldLabel>
              <TechSelect id="zone-main" value={mainId} onChange={setMainId} technicians={technicians} />
            </Field>
            <Field>
              <FieldLabel htmlFor="zone-backup">{t("backupTech")}</FieldLabel>
              <TechSelect id="zone-backup" value={backupId} onChange={setBackupId} technicians={technicians} excludeId={mainId} />
            </Field>
          </FieldGroup>
        </form>
      </CardContent>

      <CardFooter className="gap-2">
        <Button type="submit" form="zone-form" className="flex-1">
          <Check /> {t("save")}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon" aria-label={t("delete")}>
              <Trash2 />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("confirmDeleteZone")}</AlertDialogTitle>
              <AlertDialogDescription>
                “{zone.name}” — {t("deleteZoneDesc")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => onDelete(zone.id)}>
                {t("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}
