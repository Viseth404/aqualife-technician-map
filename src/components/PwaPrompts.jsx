// PWA bits on screen:
//   <UpdatePrompt />  – "New version available · Reload" after a new deploy
//   <InstallButton /> – "Install app" (or the iPhone steps)
import { useRegisterSW } from "virtual:pwa-register/react"
import { Download, RefreshCw, Share, SquarePlus, X } from "lucide-react"
import { useLanguage } from "@/i18n"
import { useInstall } from "@/lib/install"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function UpdatePrompt() {
  const { t } = useLanguage()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Check for a new version every hour while the app stays open.
    onRegisteredSW(_url, reg) {
      if (reg) setInterval(() => reg.update(), 60 * 60 * 1000)
    },
  })
  if (!needRefresh) return null
  return (
    <div className="fixed inset-x-3 bottom-3 z-[2000] mx-auto flex max-w-md items-center gap-3 rounded-xl border bg-background p-3 shadow-lg" role="status">
      <RefreshCw className="size-4 shrink-0 text-primary" />
      <span className="flex-1 text-sm">{t("updateAvailable")}</span>
      <Button size="sm" onClick={() => updateServiceWorker(true)}>{t("reload")}</Button>
      <Button variant="ghost" size="icon-sm" onClick={() => setNeedRefresh(false)} aria-label={t("close")}>
        <X />
      </Button>
    </div>
  )
}

// compact = icon-only button (phone header)
export function InstallButton({ compact = false, variant = "outline", className }) {
  const { t } = useLanguage()
  const { installed, canInstall, iosHowTo, install } = useInstall()
  if (installed || (!canInstall && !iosHowTo)) return null

  const button = (props) => (
    <Button variant={variant} size={compact ? "icon-sm" : "sm"} title={t("installApp")} aria-label={t("installApp")} className={className} {...props}>
      <Download /> {!compact && t("installApp")}
    </Button>
  )
  if (canInstall) return button({ onClick: install })

  // iPhone / iPad: show how to add it to the home screen.
  return (
    <Dialog>
      <DialogTrigger asChild>{button({})}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("installApp")}</DialogTitle>
          <DialogDescription>{t("iosInstallDesc")}</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 text-sm">
          <li className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted"><Share className="size-4" /></span>
            {t("iosStep1")}
          </li>
          <li className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted"><SquarePlus className="size-4" /></span>
            {t("iosStep2")}
          </li>
        </ol>
      </DialogContent>
    </Dialog>
  )
}
