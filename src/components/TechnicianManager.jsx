// "Technicians" card: list with Add / Edit / Delete.
// Add and Edit open a Sheet (slide-in panel) with the form.
// New technicians are placed next to the office; drag their pin later.
import { useState } from "react"
import { Check, Pencil, Plus, Trash2 } from "lucide-react"
import { useLanguage } from "@/i18n"
import { config } from "@/config"
import { newId } from "@/lib/uuid"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { isAvailable, todayInPhnomPenh } from "@/lib/availability"
import { useSettings } from "@/lib/settings"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
import TechAvatar from "./TechAvatar"

const emptyForm = { name: "", phone: "", color: config.colorPresets.blue, photoUrl: "" }

export default function TechnicianManager({ technicians, onSave, onDelete, onFocus }) {
  const { t } = useLanguage()
  const { office } = useSettings()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  // Who already uses each color (so we can fade those and pick a free one).
  const colorOwners = (exceptId) =>
    Object.fromEntries(technicians.filter((x) => x.id !== exceptId).map((x) => [x.color.toLowerCase(), x.name]))

  const openNew = () => {
    const used = colorOwners()
    const free = Object.values(config.colorPresets).find((hex) => !used[hex.toLowerCase()])
    setForm({ ...emptyForm, color: free || emptyForm.color })
    setSheetOpen(true)
  }
  const openEdit = (tech) => {
    setForm({ ...tech })
    setSheetOpen(true)
  }
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const usedBy = colorOwners(form.id)
  const sameColorAs = usedBy[(form.color || "").toLowerCase()]

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const isNew = !form.id
    onSave({
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim(),
      photoUrl: form.photoUrl.trim(),
      id: form.id || newId(),
      // New technician: small random offset so pins don't sit on top of each other.
      lat: isNew ? office.lat + (Math.random() - 0.5) * 0.01 : form.lat,
      lng: isNew ? office.lng + (Math.random() - 0.5) * 0.01 : form.lng,
    })
    setSheetOpen(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("technicians")}</CardTitle>
        <CardDescription>
          {technicians.filter(isAvailable).length}/{technicians.length} {t("availableToday").toLowerCase()}
        </CardDescription>
        <CardAction>
          <Button size="sm" onClick={openNew}>
            <Plus /> {t("addTechnician")}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        <ul className="-mx-2 space-y-1">
          {technicians.map((tech) => (
            <li key={tech.id} className="flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-muted/60">
              <button onClick={() => onFocus(tech)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <TechAvatar tech={tech} className={cn(!isAvailable(tech) && "opacity-40 grayscale")} />
                <span className="min-w-0">
                  <span className={cn("block truncate text-sm font-medium", !isAvailable(tech) && "text-muted-foreground")}>
                    {tech.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {isAvailable(tech) ? tech.phone || "—" : <span className="font-medium text-amber-700">{t("offToday")}</span>}
                  </span>
                </span>
              </button>
              {/* Available today: off = this technician is off until midnight */}
              <Switch
                checked={isAvailable(tech)}
                onCheckedChange={(on) => onSave({ ...tech, unavailableOn: on ? null : todayInPhnomPenh() })}
                aria-label={`${t("availableToday")}: ${tech.name}`}
                title={t("availableToday")}
                className="mr-1"
              />
              <Button variant="ghost" size="icon-sm" onClick={() => openEdit(tech)} aria-label={t("editTechnician")}>
                <Pencil />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" aria-label={t("delete")}>
                    <Trash2 />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("delete")} {tech.name}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>{t("deleteTechDesc")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={() => onDelete(tech.id)}>
                      {t("delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
        </ul>
      </CardContent>

      {/* Add / edit form in a Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{form.id ? t("editTechnician") : t("addTechnician")}</SheetTitle>
            <SheetDescription>{t("techFormDesc")}</SheetDescription>
          </SheetHeader>

          <form id="tech-form" onSubmit={submit} className="flex-1 overflow-y-auto px-4">
            {/* Live preview of the avatar */}
            <div className="mb-6 flex items-center gap-3 rounded-lg border p-3">
              <TechAvatar tech={{ ...form, name: form.name || "?" }} className="size-12" />
              <div className="min-w-0">
                <div className="truncate font-medium">{form.name || t("name")}</div>
                <div className="truncate text-sm text-muted-foreground">{form.phone || "—"}</div>
              </div>
            </div>

            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel htmlFor="tech-name">{t("name")}</FieldLabel>
                <Input id="tech-name" value={form.name} onChange={set("name")} required autoFocus />
              </Field>
              <Field>
                <FieldLabel htmlFor="tech-phone">{t("phone")}</FieldLabel>
                <Input id="tech-phone" type="tel" placeholder="012 345 678" value={form.phone} onChange={set("phone")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="tech-photo">{t("photoUrl")}</FieldLabel>
                <Input id="tech-photo" type="url" placeholder="https://…" value={form.photoUrl} onChange={set("photoUrl")} />
                <FieldDescription>{t("photoHint")}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel>{t("color")}</FieldLabel>
                <div className="flex flex-wrap items-center gap-2">
                  {Object.entries(config.colorPresets).map(([name, hex]) => {
                    const owner = usedBy[hex.toLowerCase()]
                    return (
                      <button
                        type="button"
                        key={name}
                        title={owner ? `${name} – ${t("usedBy")} ${owner}` : name}
                        onClick={() => setForm({ ...form, color: hex })}
                        className={cn(
                          "flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition hover:scale-110",
                          form.color === hex && "ring-2 ring-foreground",
                          owner && form.color !== hex && "opacity-30"
                        )}
                        style={{ backgroundColor: hex }}
                      >
                        {form.color === hex && <Check className="size-4 text-white" />}
                      </button>
                    )
                  })}
                  {/* Any custom color */}
                  <Input type="color" value={form.color} onChange={set("color")} className="h-7 w-10 cursor-pointer p-0.5" title={t("customColor")} />
                </div>
                {sameColorAs ? (
                  <FieldDescription className="text-amber-700">
                    {t("colorTaken")} {sameColorAs}
                  </FieldDescription>
                ) : (
                  <FieldDescription>{t("colorHint")}</FieldDescription>
                )}
              </Field>
              {!form.id && <FieldDescription>{t("placeHint")}</FieldDescription>}
            </FieldGroup>
          </form>

          <SheetFooter>
            <Button type="submit" form="tech-form">
              {t("save")}
            </Button>
            <SheetClose asChild>
              <Button variant="outline">{t("cancel")}</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Card>
  )
}
