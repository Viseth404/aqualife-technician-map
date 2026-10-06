// Admin sign-in form (shadcn "login-04" block, adapted for Aqualife).
// Left: email + password (Supabase). Right: the Aqualife logo image.
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useLanguage, LanguageSwitch } from "@/i18n"
import { config } from "@/config"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InstallButton } from "./PwaPrompts"

export function LoginForm({ className, ...props }) {
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [showForgot, setShowForgot] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError("")
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    // Success: App.jsx notices the new session and opens the dashboard.
    if (err) setError(err.message === "Invalid login credentials" ? t("wrongLogin") : err.message)
    setBusy(false)
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form onSubmit={submit} className="relative p-6 pt-12 md:p-8 md:pt-12">
            {/* Language picker in the card's top-left corner */}
            <div className="absolute top-4 left-4 md:top-5 md:left-5">
              <LanguageSwitch variant="card" />
            </div>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <img src={config.logoIcon} alt={config.businessName} className="size-12 object-contain" />
                <h1 className="text-2xl font-bold">{t("welcomeBack")}</h1>
                <p className="text-balance text-muted-foreground">{t("loginSubtitle")}</p>
              </div>

              <Field>
                <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
                  <button
                    type="button"
                    onClick={() => setShowForgot((v) => !v)}
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    {t("forgotPassword")}
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {showForgot && <FieldDescription>{t("forgotHint")}</FieldDescription>}
              </Field>

              {error && <FieldError>{error}</FieldError>}

              <Field>
                <Button type="submit" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {t("signIn")}
                </Button>
              </Field>

              <FieldDescription className="text-center">{t("adminOnly")}</FieldDescription>
              <div className="flex justify-center">
                <InstallButton variant="ghost" />
              </div>
            </FieldGroup>
          </form>

          {/* Right side: Aqualife logo (hidden on phones). File: public/login-logo.jpg */}
          <div className="relative hidden bg-white md:block">
            <img
              src={config.loginImage}
              alt={config.businessName}
              className="absolute inset-0 h-full w-full object-contain p-6"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
