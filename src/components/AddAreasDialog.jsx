// "Add areas" picker: tick the ready-made areas you want (Phnom Penh khans, Kandal districts, …)
// and each one becomes a zone with its real boundary. Areas you already have (same name) are shown as added.
// The list of areas comes from src/data/areaCatalog.js.
import { useEffect, useMemo, useState } from "react"
import { Check, ChevronDown, Loader2, Search, WandSparkles } from "lucide-react"
import { useLanguage } from "@/i18n"
import { loadAreaGroups } from "@/data/areaCatalog"
import { zoneAreaKm2, fmt } from "@/lib/geo"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const norm = (s) => s.trim().toLowerCase()

export default function AddAreasDialog({ zones, onAdd, variant = "outline" }) {
  const { t, lang } = useLanguage()
  const [open, setOpen] = useState(false)
  const [groups, setGroups] = useState(null) // null = loading
  const [loadFailed, setLoadFailed] = useState(false)
  const [picked, setPicked] = useState(() => new Set()) // area names
  const [query, setQuery] = useState("")
  const [adding, setAdding] = useState(false)
  const [expanded, setExpanded] = useState(() => new Set()) // open groups (all closed at first)
  const toggleExpanded = (id) =>
    setExpanded((cur) => {
      const next = new Set(cur)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // Load the areas the first time the picker opens.
  useEffect(() => {
    if (!open || groups) return
    loadAreaGroups()
      .then(setGroups)
      .catch(() => setLoadFailed(true))
  }, [open, groups])

  const existing = useMemo(() => new Set(zones.map((z) => norm(z.name))), [zones])
  const isAdded = (f) => existing.has(norm(f.properties.name))
  const label = (f) => (lang === "km" && f.properties.nameKm) || f.properties.name

  // Search matches English or Khmer names.
  const q = norm(query)
  const shown = (groups ?? [])
    .map((g) => ({
      ...g,
      features: g.features.filter(
        (f) => !q || norm(f.properties.name).includes(q) || (f.properties.nameKm || "").includes(query.trim())
      ),
    }))
    .filter((g) => g.features.length)

  const toggle = (name) =>
    setPicked((cur) => {
      const next = new Set(cur)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })

  // "Select all" for one group (only areas not added yet, and only those matching the search).
  const toggleGroup = (features) => {
    const names = features.filter((f) => !isAdded(f)).map((f) => f.properties.name)
    const allOn = names.every((n) => picked.has(n))
    setPicked((cur) => {
      const next = new Set(cur)
      names.forEach((n) => (allOn ? next.delete(n) : next.add(n)))
      return next
    })
  }

  const chosen = (groups ?? []).flatMap((g) => g.features).filter((f) => picked.has(f.properties.name) && !isAdded(f))

  const add = async () => {
    setAdding(true)
    await onAdd(chosen)
    setAdding(false)
    setPicked(new Set())
    setQuery("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !adding && setOpen(o)}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <WandSparkles /> {t("addAreas")}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85svh] flex-col gap-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("addAreasTitle")}</DialogTitle>
          <DialogDescription>{t("addAreasDesc")}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchAreas")} className="pl-8" />
        </div>

        <div className="-mx-1 min-h-40 flex-1 overflow-y-auto px-1">
          {loadFailed ? (
            <p className="py-6 text-center text-destructive">{t("saveFailed")}</p>
          ) : !groups ? (
            <p className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {t("loading")}
            </p>
          ) : shown.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">{t("noResults")}</p>
          ) : (
            shown.map((g) => {
              const open = g.features.filter((f) => !isAdded(f))
              const allOn = open.length > 0 && open.every((f) => picked.has(f.properties.name))
              const addedCount = g.features.length - open.length
              const pickedCount = open.filter((f) => picked.has(f.properties.name)).length
              // Searching opens every group that has a match.
              const isOpen = Boolean(q) || expanded.has(g.id)
              return (
                <section key={g.id} className="mb-2 overflow-hidden rounded-lg border">
                  {/* Group header: click to show / hide its areas */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(g.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-2 bg-muted/50 px-3 py-2.5 text-left hover:bg-muted"
                  >
                    <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{t(g.titleKey)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {t("areasCount").replace("{n}", g.features.length)}
                        {addedCount > 0 && ` · ${t("addedCount").replace("{n}", addedCount)}`}
                      </span>
                    </span>
                    {pickedCount > 0 && <Badge className="tabular-nums">{t("pickedCount").replace("{n}", pickedCount)}</Badge>}
                  </button>
                  {isOpen && (
                    <div className="space-y-1 border-t p-2">
                      {open.length > 0 && (
                        <div className="flex justify-end">
                          <Button variant="ghost" size="xs" onClick={() => toggleGroup(g.features)}>
                            {allOn ? t("selectNone") : t("selectAll")}
                          </Button>
                        </div>
                      )}
                      <ul className="space-y-1">
                        {g.features.map((f) => {
                          const { name, partOf, partOfKm } = f.properties
                          const added = isAdded(f)
                          return (
                            <li key={name}>
                              <label
                                className={`flex items-center gap-3 rounded-md border px-3 py-2 ${added ? "cursor-default bg-muted/50 text-muted-foreground" : "cursor-pointer hover:bg-muted/60"}`}
                              >
                                <input
                                  type="checkbox"
                                  className="size-4 accent-primary"
                                  checked={added || picked.has(name)}
                                  disabled={added}
                                  onChange={() => toggle(name)}
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-medium">{label(f)}</span>
                                  {partOf && (
                                    <span className="block truncate text-xs text-muted-foreground">
                                      {t("insideArea")} {lang === "km" ? partOfKm || partOf : partOf}
                                    </span>
                                  )}
                                </span>
                                {added ? (
                                  <Badge variant="secondary">
                                    <Check /> {t("added")}
                                  </Badge>
                                ) : (
                                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{fmt(zoneAreaKm2(f), 0)} km²</span>
                                )}
                              </label>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </section>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={adding}>
            {t("cancel")}
          </Button>
          <Button onClick={add} disabled={!chosen.length || adding}>
            {adding && <Loader2 className="animate-spin" />}
            {t("addSelected").replace("{n}", chosen.length)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
