"use client"

import * as React from "react"
import { CheckCircle2, Eye, EyeOff, Loader2, Mail } from "lucide-react"
import { toast } from "sonner"

import {
  requestPasswordReset,
  signInWithPassword,
  signUpWithPassword,
} from "@/app/login/actions"
import { GoogleSignInButton } from "@/app/login/google-sign-in-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Mode = "signin" | "signup" | "forgot" | "check-email" | "reset-sent"

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="h-12 rounded-field px-3 pr-11"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
          aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="bg-border h-px flex-1" />
      <span className="text-muted-foreground text-xs">atau</span>
      <div className="bg-border h-px flex-1" />
    </div>
  )
}

export function AuthForms({ next, origin }: { next: string; origin: string }) {
  const [mode, setMode] = React.useState<Mode>("signin")
  const [pending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  // Sign in
  const [signInEmail, setSignInEmail] = React.useState("")
  const [signInPassword, setSignInPassword] = React.useState("")

  // Sign up
  const [name, setName] = React.useState("")
  const [signUpEmail, setSignUpEmail] = React.useState("")
  const [signUpPassword, setSignUpPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [sentToEmail, setSentToEmail] = React.useState("")

  // Forgot password
  const [forgotEmail, setForgotEmail] = React.useState("")

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
  }

  function handleSignIn(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await signInWithPassword({ email: signInEmail, password: signInPassword })
      // A successful sign-in redirects server-side and never returns here.
      if (!result.ok) setError(result.error)
    })
  }

  function handleSignUp(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (signUpPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok")
      return
    }

    startTransition(async () => {
      const result = await signUpWithPassword(
        { name, email: signUpEmail, password: signUpPassword },
        origin
      )

      if (!result.ok) {
        setError(result.error)
        return
      }

      setSentToEmail(result.data.email)
      setMode("check-email")
    })
  }

  function handleForgot(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      await requestPasswordReset({ email: forgotEmail }, origin)
      setMode("reset-sent")
    })
  }

  if (mode === "check-email") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="bg-success/12 text-success flex size-12 items-center justify-center rounded-full">
          <Mail className="size-6" />
        </span>
        <p className="text-sm font-medium">Cek email kamu</p>
        <p className="text-muted-foreground text-sm leading-relaxed text-balance">
          Kami mengirim link verifikasi ke <span className="text-foreground font-medium">{sentToEmail}</span>.
          Buka email itu untuk mengaktifkan akunmu.
        </p>
        <Button variant="outline" className="mt-2 h-11 rounded-field" onClick={() => switchMode("signin")}>
          Kembali ke Masuk
        </Button>
      </div>
    )
  }

  if (mode === "reset-sent") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="bg-success/12 text-success flex size-12 items-center justify-center rounded-full">
          <CheckCircle2 className="size-6" />
        </span>
        <p className="text-sm font-medium">Link terkirim</p>
        <p className="text-muted-foreground text-sm leading-relaxed text-balance">
          Kalau <span className="text-foreground font-medium">{forgotEmail}</span> terdaftar, kami sudah
          kirim link reset password ke sana.
        </p>
        <Button variant="outline" className="mt-2 h-11 rounded-field" onClick={() => switchMode("signin")}>
          Kembali ke Masuk
        </Button>
      </div>
    )
  }

  if (mode === "forgot") {
    return (
      <form onSubmit={handleForgot} className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="forgot-email" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Email
          </Label>
          <Input
            id="forgot-email"
            type="email"
            value={forgotEmail}
            onChange={(event) => setForgotEmail(event.target.value)}
            placeholder="nama@email.com"
            className="h-12 rounded-field px-3"
            required
            autoFocus
          />
        </div>

        {error ? <p className="text-danger text-sm">{error}</p> : null}

        <Button type="submit" className="h-12 w-full rounded-field text-base" disabled={pending}>
          {pending ? <Loader2 className="size-5 animate-spin" /> : null}
          Kirim Link Reset
        </Button>

        <button
          type="button"
          onClick={() => switchMode("signin")}
          className="text-muted-foreground hover:text-foreground block w-full text-center text-sm"
        >
          Kembali ke Masuk
        </button>
      </form>
    )
  }

  return (
    <div className="space-y-5">
      {mode === "signin" ? (
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="signin-email" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Email
            </Label>
            <Input
              id="signin-email"
              type="email"
              value={signInEmail}
              onChange={(event) => setSignInEmail(event.target.value)}
              placeholder="nama@email.com"
              autoComplete="email"
              className="h-12 rounded-field px-3"
              required
              autoFocus
            />
          </div>

          <PasswordField
            id="signin-password"
            label="Password"
            value={signInPassword}
            onChange={setSignInPassword}
            placeholder="Password kamu"
            autoComplete="current-password"
          />

          <button
            type="button"
            onClick={() => switchMode("forgot")}
            className="text-muted-foreground hover:text-foreground -mt-2 block text-right text-xs"
          >
            Lupa password?
          </button>

          {error ? <p className="text-danger text-sm">{error}</p> : null}

          <Button type="submit" className="h-12 w-full rounded-field text-base" disabled={pending}>
            {pending ? <Loader2 className="size-5 animate-spin" /> : null}
            Masuk
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="signup-name" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Nama
            </Label>
            <Input
              id="signup-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nama kamu"
              autoComplete="name"
              className="h-12 rounded-field px-3"
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="signup-email" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Email
            </Label>
            <Input
              id="signup-email"
              type="email"
              value={signUpEmail}
              onChange={(event) => setSignUpEmail(event.target.value)}
              placeholder="nama@email.com"
              autoComplete="email"
              className="h-12 rounded-field px-3"
              required
            />
          </div>

          <PasswordField
            id="signup-password"
            label="Password"
            value={signUpPassword}
            onChange={setSignUpPassword}
            placeholder="Minimal 8 karakter"
            autoComplete="new-password"
          />

          <PasswordField
            id="signup-confirm"
            label="Konfirmasi password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Ulangi password"
            autoComplete="new-password"
          />

          {error ? <p className="text-danger text-sm">{error}</p> : null}

          <Button type="submit" className="h-12 w-full rounded-field text-base" disabled={pending}>
            {pending ? <Loader2 className="size-5 animate-spin" /> : null}
            Daftar
          </Button>
        </form>
      )}

      <Divider />

      <GoogleSignInButton next={next} origin={origin} />

      <p className="text-muted-foreground text-center text-sm">
        {mode === "signin" ? (
          <>
            Belum punya akun?{" "}
            <button type="button" onClick={() => switchMode("signup")} className="text-primary font-medium">
              Daftar
            </button>
          </>
        ) : (
          <>
            Sudah punya akun?{" "}
            <button type="button" onClick={() => switchMode("signin")} className="text-primary font-medium">
              Masuk
            </button>
          </>
        )}
      </p>
    </div>
  )
}
