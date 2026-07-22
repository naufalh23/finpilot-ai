"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { CurrencyInput } from "@/components/shared/currency-input"
import { IconBadge } from "@/components/shared/icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { createWallet, updateWallet } from "@/lib/actions/wallet"
import { PICKER_COLORS, WALLET_TYPE_ICONS, WALLET_TYPE_LABELS } from "@/lib/constants"
import type { WalletType } from "@/lib/generated/prisma/enums"
import type { WalletSummary } from "@/lib/queries/wallets"
import { FIELD_LIMITS } from "@/lib/validators"
import { cn } from "@/lib/utils"

const TYPES: WalletType[] = ["CASH", "BANK", "EWALLET", "CREDIT_CARD", "INVESTMENT"]

export function WalletFormSheet({
  open,
  onOpenChange,
  wallet,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet?: WalletSummary | null
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [name, setName] = React.useState("")
  const [type, setType] = React.useState<WalletType>("CASH")
  const [openingBalance, setOpeningBalance] = React.useState(0)
  const [institution, setInstitution] = React.useState("")
  const [color, setColor] = React.useState(PICKER_COLORS[0])
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return

    setName(wallet?.name ?? "")
    setType(wallet?.type ?? "CASH")
    setOpeningBalance(wallet?.openingBalance ?? 0)
    setInstitution(wallet?.institution ?? "")
    setColor(wallet?.color ?? PICKER_COLORS[0])
    setError(null)
  }, [open, wallet])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!name.trim()) {
      setError("Nama wallet wajib diisi")
      return
    }

    const payload = {
      name: name.trim(),
      type,
      openingBalance,
      currency: "IDR",
      institution: institution.trim() || null,
      color,
      icon: WALLET_TYPE_ICONS[type],
    }

    startTransition(async () => {
      const result = wallet ? await updateWallet(wallet.id, payload) : await createWallet(payload)

      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(wallet ? "Wallet diperbarui" : "Wallet ditambahkan")
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-modal p-0 sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-[calc(100%-2rem)] sm:max-w-md sm:-translate-x-1/2 sm:rounded-modal sm:border"
      >
        <SheetHeader className="px-5 pt-5 pb-0">
          <SheetTitle className="text-lg font-semibold">
            {wallet ? "Ubah Wallet" : "Tambah Wallet"}
          </SheetTitle>
          <SheetDescription>
            Saldo wallet dihitung otomatis dari saldo awal ditambah seluruh transaksi.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 pt-5 pb-6">
          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Jenis
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TYPES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  className={cn(
                    "flex h-11 items-center gap-2 rounded-field border px-3 text-sm transition-colors",
                    type === option
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <IconBadge
                    name={WALLET_TYPE_ICONS[option]}
                    color={color}
                    size="sm"
                    className="size-6 rounded-[8px]"
                  />
                  <span className="min-w-0 truncate">{WALLET_TYPE_LABELS[option]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="wallet-name" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Nama
            </Label>
            <Input
              id="wallet-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={FIELD_LIMITS.walletName}
              placeholder="mis. BCA, Cash, GoPay"
              className="h-11 rounded-field px-3"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="wallet-institution" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Penerbit <span className="normal-case">· opsional</span>
            </Label>
            <Input
              id="wallet-institution"
              value={institution}
              onChange={(event) => setInstitution(event.target.value)}
              maxLength={FIELD_LIMITS.institution}
              placeholder="mis. Bank Central Asia"
              className="h-11 rounded-field px-3"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Saldo awal
            </Label>
            <CurrencyInput value={openingBalance} onValueChange={setOpeningBalance} />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Warna
            </Label>
            <div className="flex flex-wrap gap-2">
              {PICKER_COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={`Warna ${option}`}
                  onClick={() => setColor(option)}
                  style={{ backgroundColor: option }}
                  className={cn(
                    "size-9 rounded-full transition-transform",
                    color === option
                      ? "ring-foreground ring-2 ring-offset-2 ring-offset-[var(--popover)]"
                      : "hover:scale-105"
                  )}
                />
              ))}
            </div>
          </div>

          {error ? <p className="text-danger text-xs">{error}</p> : null}

          <Button type="submit" className="h-12 rounded-field text-base" disabled={pending}>
            {pending ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
            {wallet ? "Simpan Perubahan" : "Simpan Wallet"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
