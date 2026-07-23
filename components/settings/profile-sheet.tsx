"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Camera, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { updateAvatar, updatePassword, updateProfileName } from "@/lib/actions/profile"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { FIELD_LIMITS } from "@/lib/validators"

type ProfileUser = { name: string | null; email: string; image: string | null }

export function ProfileSheet({
  user,
  open,
  onOpenChange,
}: {
  user: ProfileUser
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [avatarUrl, setAvatarUrl] = React.useState(user.image)
  const [avatarPending, setAvatarPending] = React.useState(false)

  const [name, setName] = React.useState(user.name ?? "")
  const [namePending, startNameTransition] = React.useTransition()
  const [nameError, setNameError] = React.useState<string | null>(null)

  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [passwordPending, startPasswordTransition] = React.useTransition()
  const [passwordError, setPasswordError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setAvatarUrl(user.image)
      setName(user.name ?? "")
      setNameError(null)
      setPassword("")
      setConfirmPassword("")
      setPasswordError(null)
    }
  }, [open, user])

  async function handleAvatarPick(file: File | undefined) {
    if (!file) return

    setAvatarPending(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const result = await updateAvatar(formData)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      setAvatarUrl(result.data.url)
      toast.success("Foto profil diperbarui")
      router.refresh()
    } finally {
      setAvatarPending(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function handleNameSubmit(event: React.FormEvent) {
    event.preventDefault()
    setNameError(null)

    if (!name.trim()) {
      setNameError("Nama wajib diisi")
      return
    }

    startNameTransition(async () => {
      const result = await updateProfileName(name.trim())

      if (!result.ok) {
        setNameError(result.error)
        return
      }

      toast.success("Nama diperbarui")
      router.refresh()
    })
  }

  function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPasswordError(null)

    if (password.length < 8) {
      setPasswordError("Password minimal 8 karakter")
      return
    }
    if (password !== confirmPassword) {
      setPasswordError("Konfirmasi password tidak cocok")
      return
    }

    startPasswordTransition(async () => {
      const result = await updatePassword({ password })

      if (!result.ok) {
        setPasswordError(result.error)
        return
      }

      toast.success("Password diperbarui")
      setPassword("")
      setConfirmPassword("")
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-modal p-0 sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-[calc(100%-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:rounded-modal sm:border"
      >
        <SheetHeader className="px-5 pt-5 pb-0">
          <SheetTitle className="text-lg font-semibold">Edit Profil</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-5 pt-5 pb-6">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarPending}
              className="group relative"
              aria-label="Ganti foto profil"
            >
              <Avatar className="size-20">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                <AvatarFallback className="text-xl">{name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
              </Avatar>
              <span className="bg-primary text-primary-foreground ring-background absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full ring-2">
                {avatarPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => handleAvatarPick(event.target.files?.[0])}
            />
            <p className="text-muted-foreground text-xs">JPG, PNG, atau WEBP · maks 2 MB</p>
          </div>

          <Separator />

          <form onSubmit={handleNameSubmit} className="flex flex-col gap-3">
            <Label htmlFor="profile-name" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Nama
            </Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={FIELD_LIMITS.profileName}
              className="h-11 rounded-field px-3"
            />
            {nameError ? <p className="text-danger text-xs">{nameError}</p> : null}
            <Button
              type="submit"
              variant="outline"
              className="h-10 self-start rounded-field"
              disabled={namePending || name.trim() === (user.name ?? "")}
            >
              {namePending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Simpan Nama
            </Button>
          </form>

          <Separator />

          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Ubah Password
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password baru · minimal 8 karakter"
              autoComplete="new-password"
              className="h-11 rounded-field px-3"
            />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Konfirmasi password baru"
              autoComplete="new-password"
              className="h-11 rounded-field px-3"
            />
            {passwordError ? <p className="text-danger text-xs">{passwordError}</p> : null}
            <Button
              type="submit"
              variant="outline"
              className="h-10 self-start rounded-field"
              disabled={passwordPending || !password}
            >
              {passwordPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Ubah Password
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
