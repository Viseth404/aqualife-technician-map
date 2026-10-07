// Settings for SUPER ADMINS: Team (staff accounts), Delivery (prices per vehicle), Office.
// Opens as a centered pop-up (Dialog) from the dashboard header.
import { useCallback, useEffect, useState } from "react"
import { Check, Eye, EyeOff, KeyRound, Loader2, Mail, Plus, RefreshCw, RotateCcw, Shuffle, Trash2, UserPlus, UserX } from "lucide-react"
import { useLanguage } from "@/i18n"
import { config } from "@/config"
import { isSupabaseConfigured } from "@/lib/supabase"
import { activeVehicle, useSettings, VEHICLES } from "@/lib/settings"
import { adminApi, generatePassword } from "@/lib/adminApi"
import { parseMapsLink } from "@/lib/geocode"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { VEHICLE_ICON } from "./DeliveryFeeCard"

const ROLES = ["superadmin", "admin", "sales", "technician"]

export default function SettingsSheet({ open, onOpenChange }) {
  const { t } = useLanguage()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Centered pop-up; on phones it fills most of the screen. */}
      <DialogContent className="flex h-[90svh] max-h-[780px] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b p-4 pr-12">
          <DialogTitle className="text-base">{t("settings")}</DialogTitle>
          <DialogDescription>{t("settingsDesc")}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="team" className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="border-b px-4 py-3">
            <TabsList className="w-full">
              <TabsTrigger value="team" className="flex-1">{t("team")}</TabsTrigger>
              <TabsTrigger value="delivery" className="flex-1">{t("delivery")}</TabsTrigger>
              <TabsTrigger value="office" className="flex-1">{t("office")}</TabsTrigger>
            </TabsList>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-4">
            <TabsContent value="team"><TeamSettings /></TabsContent>
            <TabsContent value="delivery"><DeliverySettings /></TabsContent>
            <TabsContent value="office"><OfficeSettings /></TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// Small "✓ Saved" / error line under a form.
function Status({ status }) {
  if (!status) return null
  return status.ok ? (
    <p className="flex items-center gap-1 text-sm text-green-700"><Check className="size-4" /> {status.text}</p>
  ) : (
    <p className="text-sm text-destructive">{status.text}</p>
  )
}

// Password box with show/hide and "generate".
function PasswordInput({ id, value, onChange }) {
  const { t } = useLanguage()
  const [show, setShow] = useState(true)
  return (
    <div className="flex gap-2">
      <Input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} minLength={8} required autoComplete="new-password" className="font-mono" />
      <Button type="button" variant="outline" size="icon" onClick={() => setShow((s) => !s)} aria-label={show ? t("hide") : t("show")}>
        {show ? <EyeOff /> : <Eye />}
      </Button>
      <Button type="button" variant="outline" onClick={() => onChange(generatePassword())}>
        <Shuffle /> {t("generate")}
      </Button>
    </div>
  )
}

// =============================== TEAM ===============================
function TeamSettings() {
  const { t, lang } = useLanguage()
  const [data, setData] = useState({ loading: true, users: [], me: null, error: null })
  const [busyId, setBusyId] = useState(null)
  const [status, setStatus] = useState(null)

  const load = useCallback(async () => {
    setData((d) => ({ ...d, loading: true, error: null }))
    try {
      const r = await adminApi("list")
      setData({ loading: false, users: r.users, me: r.me, error: null })
    } catch (e) {
      setData((d) => ({ ...d, loading: false, error: e.message }))
    }
  }, [])
  useEffect(() => {
    if (isSupabaseConfigured) load()
  }, [load])

  // Run an action, show the result, then refresh the list.
  const run = async (id, action, payload, okText) => {
    setBusyId(id)
    setStatus(null)
    try {
      await adminApi(action, payload)
      setStatus({ ok: true, text: okText })
      await load()
      return true
    } catch (e) {
      setStatus({ ok: false, text: e.message })
      return false
    } finally {
      setBusyId(null)
    }
  }

  if (!isSupabaseConfigured) {
    return <Alert><AlertDescription>{t("teamNeedsSupabase")}</AlertDescription></Alert>
  }

  const dateFmt = new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric" })

  return (
    <div className="space-y-4">
      <AddStaffCard onCreate={(form) => run("new", "create", form, `${t("created")}: ${form.email}`)} />

      <Card>
        <CardHeader>
          <CardTitle>{t("staffAccounts")}</CardTitle>
          <CardDescription>{t("staffAccountsDesc")}</CardDescription>
          <CardAction>
            <Button variant="ghost" size="icon-sm" onClick={load} disabled={data.loading} aria-label={t("refresh")}>
              <RefreshCw className={cn(data.loading && "animate-spin")} />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
          <Status status={status} />
          {data.error && <Alert variant="destructive"><AlertDescription>{data.error}</AlertDescription></Alert>}
          {data.loading && !data.users.length ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> {t("loading")}</p>
          ) : (
            <ul className="divide-y">
              {data.users.map((u) => {
                const isMe = u.id === data.me
                const busy = busyId === u.id
                return (
                  <li key={u.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{u.email}</span>
                        {isMe && <Badge variant="secondary">{t("you")}</Badge>}
                        {!u.role && <Badge variant="outline" className="border-destructive/40 text-destructive">{t("noAccess")}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("lastSignIn")}: {u.lastSignInAt ? dateFmt.format(new Date(u.lastSignInAt)) : t("never")}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Role (also how you give access back after revoking) */}
                      <Select
                        value={u.role || ""}
                        onValueChange={(role) => run(u.id, "setRole", { userId: u.id, role }, `${u.email} → ${t(`role_${role}`)}`)}
                        disabled={isMe || busy}
                      >
                        <SelectTrigger size="sm" className="w-36">
                          <SelectValue placeholder={t("giveAccess")} />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => <SelectItem key={r} value={r}>{t(`role_${r}`)}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      {/* Change login email (also for your own account) */}
                      <ChangeEmailButton
                        email={u.email}
                        disabled={busy}
                        onChange={(email) => run(u.id, "changeEmail", { userId: u.id, email }, `${t("emailChanged")}: ${email}`)}
                      />

                      <ResetPasswordButton email={u.email} disabled={busy} onReset={(password) => run(u.id, "resetPassword", { userId: u.id, password }, `${t("passwordChanged")}: ${u.email}`)} />

                      {u.role && (
                        <Confirm
                          title={`${t("revoke")} ${u.email}?`}
                          desc={t("revokeDesc")}
                          action={t("revoke")}
                          onConfirm={() => run(u.id, "revoke", { userId: u.id }, `${t("revoked")}: ${u.email}`)}
                        >
                          <Button variant="ghost" size="icon-sm" disabled={isMe || busy} title={t("revoke")} aria-label={t("revoke")}>
                            <UserX />
                          </Button>
                        </Confirm>
                      )}

                      <Confirm
                        title={`${t("delete")} ${u.email}?`}
                        desc={t("deleteUserDesc")}
                        action={t("delete")}
                        onConfirm={() => run(u.id, "delete", { userId: u.id }, `${t("deleted")}: ${u.email}`)}
                      >
                        <Button variant="ghost" size="icon-sm" className="hover:text-destructive" disabled={isMe || busy} title={t("delete")} aria-label={t("delete")}>
                          {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}
                        </Button>
                      </Confirm>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">{t("roleHelp")}</p>
        </CardContent>
      </Card>
    </div>
  )
}

function AddStaffCard({ onCreate }) {
  const { t } = useLanguage()
  const [form, setForm] = useState({ email: "", password: generatePassword(), role: "sales" })
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null) // show the login once, to give to the new person

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const ok = await onCreate(form)
    setBusy(false)
    if (ok) {
      setCreated({ email: form.email.trim().toLowerCase(), password: form.password })
      setForm({ email: "", password: generatePassword(), role: form.role })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserPlus className="size-4" /> {t("addStaff")}</CardTitle>
        <CardDescription>{t("addStaffDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {created && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="space-y-1 text-green-900">
              <p className="font-medium">{t("giveTheseDetails")}</p>
              <p className="font-mono text-sm">{created.email}</p>
              <p className="font-mono text-sm">{created.password}</p>
            </AlertDescription>
          </Alert>
        )}
        <form onSubmit={submit}>
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor="new-email">{t("email")}</FieldLabel>
              <Input id="new-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-password">{t("password")}</FieldLabel>
              <PasswordInput id="new-password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
              <FieldDescription>{t("passwordHint")}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="new-role">{t("role")}</FieldLabel>
              <Select value={form.role} onValueChange={(role) => setForm({ ...form, role })}>
                <SelectTrigger id="new-role" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{t(`role_${r}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Plus />} {t("createAccount")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

function ChangeEmailButton({ email, onChange, disabled }) {
  const { t } = useLanguage()
  const [value, setValue] = useState(email)
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.trim().toLowerCase() !== (email || "").toLowerCase()
  return (
    <AlertDialog onOpenChange={(o) => o && setValue(email)}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" disabled={disabled} title={t("changeEmail")} aria-label={t("changeEmail")}>
          <Mail />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("changeEmail")}</AlertDialogTitle>
          <AlertDialogDescription>{t("changeEmailDesc")}</AlertDialogDescription>
        </AlertDialogHeader>
        <Input type="email" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={!valid} onClick={() => onChange(value.trim().toLowerCase())}>{t("save")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function ResetPasswordButton({ email, onReset, disabled }) {
  const { t } = useLanguage()
  const [password, setPassword] = useState(generatePassword())
  return (
    <AlertDialog onOpenChange={(o) => o && setPassword(generatePassword())}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" disabled={disabled} title={t("resetPassword")} aria-label={t("resetPassword")}>
          <KeyRound />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("resetPassword")}</AlertDialogTitle>
          <AlertDialogDescription>{email} – {t("resetPasswordDesc")}</AlertDialogDescription>
        </AlertDialogHeader>
        <PasswordInput id="reset-password" value={password} onChange={setPassword} />
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={password.length < 8} onClick={() => onReset(password)}>{t("save")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function Confirm({ title, desc, action, onConfirm, children }) {
  const { t } = useLanguage()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{desc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>{action}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ============================= DELIVERY =============================
// Check a price table; returns an error message or null.
function checkPricing(p, t) {
  if (!p.rows.length) return t("errNoRows")
  let prev = 0
  for (const r of p.rows) {
    if (!Number.isInteger(r.upToKm) || r.upToKm <= prev) return t("errKmOrder")
    if (!(r.fee >= 0)) return t("errFee")
    prev = r.upToKm
  }
  if (!Number.isInteger(p.beyond.everyKm) || p.beyond.everyKm < 1) return t("errEveryKm")
  if (!(p.beyond.fee >= 0)) return t("errFee")
  return null
}

function DeliverySettings() {
  const { t } = useLanguage()
  const { delivery, saveSetting } = useSettings()
  const withVehicle = (d) => ({ ...d, vehicle: activeVehicle(d) })
  const [draft, setDraft] = useState(() => withVehicle(delivery))
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => setDraft(withVehicle(delivery)), [delivery])

  const setVehicle = (v, patch) => setDraft((d) => ({ ...d, vehicles: { ...d.vehicles, [v]: { ...d.vehicles[v], ...patch } } }))
  const num = (s) => (s === "" ? NaN : Number(s))

  const save = async () => {
    setStatus(null)
    for (const v of VEHICLES) {
      const err = checkPricing(draft.vehicles[v], t)
      if (err) return setStatus({ ok: false, text: `${t(`vehicle_${v}`)}: ${err}` })
    }
    setBusy(true)
    const r = await saveSetting("delivery", draft)
    setBusy(false)
    setStatus(r.ok ? { ok: true, text: t("savedForEveryone") } : { ok: false, text: r.error })
  }

  return (
    <div className="space-y-4">
      {/* Which vehicle delivery is calculated by (route + price table). Only super admins see this. */}
      <Card>
        <CardHeader>
          <CardTitle>{t("calcBy")}</CardTitle>
          <CardDescription>{t("calcByDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Tabs value={draft.vehicle} onValueChange={(vehicle) => setDraft((d) => ({ ...d, vehicle }))}>
            <TabsList className="w-full">
              {VEHICLES.map((v) => (
                <TabsTrigger key={v} value={v} className="flex-1">
                  {VEHICLE_ICON[v]} {t(`vehicle_${v}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="text-xs text-muted-foreground">{t(`calcBy_${draft.vehicle}`)}</p>
        </CardContent>
      </Card>

      {VEHICLES.map((v) => {
        const p = draft.vehicles[v]
        return (
          <Card key={v} className={cn(draft.vehicle !== v && "opacity-70")}>
            <CardHeader>
              <CardTitle>{VEHICLE_ICON[v]} {t(`vehicle_${v}`)}</CardTitle>
              <CardDescription>{draft.vehicle === v ? t("priceInUse") : t("priceNotInUse")}</CardDescription>
              {draft.vehicle === v && (
                <CardAction>
                  <Badge>{t("inUse")}</Badge>
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground">
                <span>{t("upToKm")}</span>
                <span>{t("fee")} ({config.currencySymbol})</span>
                <span className="w-8" />
              </div>
              {p.rows.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                  <Input type="number" inputMode="numeric" min={1} step={1} value={Number.isNaN(row.upToKm) ? "" : row.upToKm}
                    onChange={(e) => setVehicle(v, { rows: p.rows.map((r, j) => (j === i ? { ...r, upToKm: num(e.target.value) } : r)) })} />
                  <Input type="number" inputMode="decimal" min={0} step={0.5} value={Number.isNaN(row.fee) ? "" : row.fee}
                    onChange={(e) => setVehicle(v, { rows: p.rows.map((r, j) => (j === i ? { ...r, fee: num(e.target.value) } : r)) })} />
                  <Button variant="ghost" size="icon-sm" disabled={p.rows.length <= 1} aria-label={t("delete")}
                    onClick={() => setVehicle(v, { rows: p.rows.filter((_, j) => j !== i) })}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => {
                const last = p.rows[p.rows.length - 1]
                setVehicle(v, { rows: [...p.rows, { upToKm: (last?.upToKm || 0) + 5, fee: (last?.fee || 0) + 5 }] })
              }}>
                <Plus /> {t("addRow")}
              </Button>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
                <span>{t("beyondLast")}</span>
                <span>+{config.currencySymbol}</span>
                <Input type="number" min={0} step={0.5} className="h-8 w-20" value={Number.isNaN(p.beyond.fee) ? "" : p.beyond.fee}
                  onChange={(e) => setVehicle(v, { beyond: { ...p.beyond, fee: num(e.target.value) } })} />
                <span>{t("every")}</span>
                <Input type="number" min={1} step={1} className="h-8 w-20" value={Number.isNaN(p.beyond.everyKm) ? "" : p.beyond.everyKm}
                  onChange={(e) => setVehicle(v, { beyond: { ...p.beyond, everyKm: num(e.target.value) } })} />
                <span>km</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Check />} {t("save")}</Button>
        <Button variant="outline" onClick={() => { setDraft(delivery); setStatus(null) }}><RotateCcw /> {t("undoChanges")}</Button>
      </div>
      <Status status={status} />
    </div>
  )
}

// ============================== OFFICE ==============================
function OfficeSettings() {
  const { t } = useLanguage()
  const { office, saveSetting } = useSettings()
  const [draft, setDraft] = useState(office)
  const [link, setLink] = useState("")
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => setDraft(office), [office])

  const usePasted = (text) => {
    setLink(text)
    const p = parseMapsLink(text)
    if (p && p !== "short") setDraft((d) => ({ ...d, lat: p.lat, lng: p.lng, name: d.name || p.label }))
    setStatus(p === "short" ? { ok: false, text: t("shortLink") } : null)
  }

  const save = async () => {
    const lat = Number(draft.lat), lng = Number(draft.lng)
    if (!draft.name?.trim() || !(lat > 9 && lat < 15.5) || !(lng > 102 && lng < 108)) return setStatus({ ok: false, text: t("errOffice") })
    setBusy(true)
    const r = await saveSetting("office", { name: draft.name.trim(), lat, lng })
    setBusy(false)
    setStatus(r.ok ? { ok: true, text: t("savedForEveryone") } : { ok: false, text: r.error })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("officeLocation")}</CardTitle>
        <CardDescription>{t("officeLocationDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-3">
          <Field>
            <FieldLabel htmlFor="office-link">{t("pasteLink")}</FieldLabel>
            <Input id="office-link" value={link} onChange={(e) => usePasted(e.target.value)} placeholder="https://www.google.com/maps/… or 11.55, 104.92" />
          </Field>
          <Field>
            <FieldLabel htmlFor="office-name">{t("name")}</FieldLabel>
            <Input id="office-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="office-lat">Latitude</FieldLabel>
              <Input id="office-lat" type="number" step="any" value={draft.lat} onChange={(e) => setDraft({ ...draft, lat: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel htmlFor="office-lng">Longitude</FieldLabel>
              <Input id="office-lng" type="number" step="any" value={draft.lng} onChange={(e) => setDraft({ ...draft, lng: e.target.value })} />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Check />} {t("save")}</Button>
            <Button variant="outline" onClick={() => { setDraft(office); setLink(""); setStatus(null) }}><RotateCcw /> {t("undoChanges")}</Button>
          </div>
          <Status status={status} />
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
