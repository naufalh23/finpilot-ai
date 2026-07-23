"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { updatePassword } from "@/lib/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) return setError("Password minimal 8 karakter")
    if (password !== confirm) return setError("Konfirmasi password tidak cocok")

    startTransition(async () => {
      const result = await updatePassword({ password })

      if (!result.ok) {
        setError(result.error)
        return
      }

      toast.success("Password berhasil diatur")
      router.push("/dashboard")
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-password" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Password baru
        </Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimal 8 karakter"
            className="h-12 rounded-field px-3 pr-11"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm-password" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Konfirmasi password
        </Label>
        <Input
          id="confirm-password"
          type={showPassword ? "text" : "password"}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Ulangi password baru"
          className="h-12 rounded-field px-3"
        />
      </div>

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      <Button type="submit" className="h-12 w-full rounded-field text-base" disabled={pending}>
        {pending ? <Loader2 className="size-5 animate-spin" /> : <KeyRound className="size-5" />}
        Simpan Password Baru
      </Button>
    </form>
  )
}
