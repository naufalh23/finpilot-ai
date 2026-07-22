"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CreditCard, Loader2, MoreHorizontal, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { DueBadge } from "@/components/commitments/due-badge"
import { CurrencyInput } from "@/components/shared/currency-input"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  createCreditCard,
  deleteCreditCard,
  payCreditCard,
  updateCreditCard,
} from "@/lib/actions/credit-card"
import { PICKER_COLORS } from "@/lib/constants"
import { formatCurrency, formatDate } from "@/lib/format"
import type { CreditCardSummary } from "@/lib/queries/commitments"
import type { WalletSummary } from "@/lib/queries/wallets"
import { cn } from "@/lib/utils"

export function CreditCardTab({
  cards,
  wallets,
}: {
  cards: CreditCardSummary[]
  wallets: WalletSummary[]
}) {
  const router = useRouter()
  const [formOpen, setFormOpen] = React.useState(false)
  const [payOpen, setPayOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<CreditCardSummary | null>(null)
  const [, startTransition] = React.useTransition()

  const totalOutstanding = cards.reduce((sum, card) => sum + card.outstanding, 0)
  const totalLimit = cards.reduce((sum, card) => sum + card.creditLimit, 0)

  // A card can't pay its own bill; only non-card wallets can fund it.
  const fundingWallets = wallets.filter((wallet) => wallet.type !== "CREDIT_CARD")

  return (
    <div className="space-y-5">
      {cards.length > 0 ? (
        <section className="card-surface p-5">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Total Tagihan
          </p>
          <p className="tabular text-danger mt-1.5 text-2xl font-bold">
            {formatCurrency(totalOutstanding)}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            dari total limit {formatCurrency(totalLimit)}
          </p>
        </section>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Kartu Kredit</h2>
        <Button
          variant="outline"
          className="h-9 rounded-field"
          onClick={() => {
            setSelected(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" />
          Tambah
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={CreditCard}
            title="Belum ada kartu kredit."
            description="Tambahkan kartu untuk memantau tagihan, limit, dan tanggal jatuh tempo."
            action={
              <Button
                className="h-11 rounded-field"
                onClick={() => {
                  setSelected(null)
                  setFormOpen(true)
                }}
              >
                <Plus className="size-4" />
                Tambah Kartu
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {cards.map((card) => (
            <li key={card.id} className="card-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{card.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {card.issuer}
                    {card.last4 ? ` ···· ${card.last4}` : ""}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Aksi kartu</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelected(card)
                        setFormOpen(true)
                      }}
                    >
                      Ubah
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() =>
                        startTransition(async () => {
                          const result = await deleteCreditCard(card.id)
                          if (!result.ok) {
                            toast.error(result.error)
                            return
                          }
                          toast.success("Kartu dihapus")
                          router.refresh()
                        })
                      }
                    >
                      <Trash2 />
                      Hapus
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="tabular mt-4 text-2xl font-bold">{formatCurrency(card.outstanding)}</p>
              <p className="text-muted-foreground text-xs">
                Sisa limit {formatCurrency(card.available)} dari{" "}
                {formatCurrency(card.creditLimit)}
              </p>

              <div className="bg-muted mt-3 h-2 w-full overflow-hidden rounded-full">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    card.utilisation >= 0.9
                      ? "bg-danger"
                      : card.utilisation >= 0.7
                        ? "bg-warning"
                        : "bg-primary"
                  )}
                  style={{ width: `${Math.min(card.utilisation, 1) * 100}%` }}
                />
              </div>
              <p className="text-muted-foreground mt-1.5 text-xs">
                Pemakaian {Math.round(card.utilisation * 100)}%
              </p>

              <div className="mt-4 flex items-center justify-between gap-2">
                <div>
                  <p className="text-muted-foreground text-xs">
                    Jatuh tempo {formatDate(new Date(card.nextDueDate))}
                  </p>
                  <DueBadge
                    days={card.daysUntilDue}
                    reminderDays={card.reminderDays}
                    className="mt-1.5"
                  />
                </div>
                {card.outstanding > 0 ? (
                  <Button
                    variant="outline"
                    className="h-10 rounded-field"
                    onClick={() => {
                      setSelected(card)
                      setPayOpen(true)
                    }}
                  >
                    Bayar
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <CreditCardFormSheet open={formOpen} onOpenChange={setFormOpen} card={selected} />
      <PayCardSheet
        open={payOpen}
        onOpenChange={setPayOpen}
        card={selected}
        wallets={fundingWallets}
      />
    </div>
  )
}

function CreditCardFormSheet({
  open,
  onOpenChange,
  card,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: CreditCardSummary | null
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [name, setName] = React.useState("")
  const [issuer, setIssuer] = React.useState("")
  const [last4, setLast4] = React.useState("")
  const [creditLimit, setCreditLimit] = React.useState(0)
  const [outstanding, setOutstanding] = React.useState(0)
  const [billingDay, setBillingDay] = React.useState(1)
  const [dueDay, setDueDay] = React.useState(20)
  const [reminderDays, setReminderDays] = React.useState(5)
  const [color, setColor] = React.useState(PICKER_COLORS[0])
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return

    setName(card?.name ?? "")
    setIssuer(card?.issuer ?? "")
    setLast4(card?.last4 ?? "")
    setCreditLimit(card?.creditLimit ?? 0)
    setOutstanding(card?.outstanding ?? 0)
    setBillingDay(card?.billingDay ?? 1)
    setDueDay(card?.dueDay ?? 20)
    setReminderDays(card?.reminderDays ?? 5)
    setColor(card?.color ?? PICKER_COLORS[0])
    setError(null)
  }, [open, card])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!name.trim()) return setError("Nama kartu wajib diisi")
    if (!issuer.trim()) return setError("Penerbit wajib diisi")
    if (creditLimit <= 0) return setError("Limit harus lebih dari 0")
    if (last4 && !/^\d{4}$/.test(last4)) return setError("4 digit terakhir harus 4 angka")

    const payload = {
      name: name.trim(),
      issuer: issuer.trim(),
      last4: last4 || null,
      creditLimit,
      currentOutstanding: outstanding,
      billingDay,
      dueDay,
      reminderDays,
      color,
    }

    startTransition(async () => {
      const result = card
        ? await updateCreditCard(card.id, payload)
        : await createCreditCard(payload)

      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(card ? "Kartu diperbarui" : "Kartu ditambahkan")
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
            {card ? "Ubah Kartu" : "Tambah Kartu Kredit"}
          </SheetTitle>
          <SheetDescription>
            Kartu dibuat sebagai wallet tersendiri, sehingga belanja dan pembayarannya tercatat
            seperti transaksi biasa.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 pt-5 pb-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="card-name" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Nama kartu
            </Label>
            <Input
              id="card-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="mis. BCA Visa"
              className="h-11 rounded-field px-3"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="card-issuer" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Penerbit
              </Label>
              <Input
                id="card-issuer"
                value={issuer}
                onChange={(event) => setIssuer(event.target.value)}
                placeholder="mis. BCA"
                className="h-11 rounded-field px-3"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="card-last4" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                4 digit akhir
              </Label>
              <Input
                id="card-last4"
                inputMode="numeric"
                maxLength={4}
                value={last4}
                onChange={(event) => setLast4(event.target.value.replace(/\D/g, ""))}
                placeholder="1234"
                className="h-11 rounded-field px-3"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Limit kredit
            </Label>
            <CurrencyInput value={creditLimit} onValueChange={setCreditLimit} />
          </div>

          {card ? null : (
            <div className="flex flex-col gap-2">
              <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Tagihan saat ini
              </Label>
              <CurrencyInput value={outstanding} onValueChange={setOutstanding} />
              <p className="text-muted-foreground text-xs">
                Hanya saldo awal. Setelah ini, tagihan bergerak mengikuti transaksi.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Tgl cetak
              </Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={billingDay}
                onChange={(event) => setBillingDay(Number(event.target.value))}
                className="h-11 rounded-field px-3"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Tgl jatuh tempo
              </Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(event) => setDueDay(Number(event.target.value))}
                className="h-11 rounded-field px-3"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Ingatkan
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 5, 7].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setReminderDays(option)}
                  className={cn(
                    "h-11 rounded-field border text-xs transition-colors",
                    reminderDays === option
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  H-{option}
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="text-danger text-xs">{error}</p> : null}

          <Button type="submit" className="h-12 rounded-field text-base" disabled={pending}>
            {pending ? <Loader2 className="size-5 animate-spin" /> : <CreditCard className="size-5" />}
            Simpan Kartu
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function PayCardSheet({
  open,
  onOpenChange,
  card,
  wallets,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: CreditCardSummary | null
  wallets: WalletSummary[]
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [walletId, setWalletId] = React.useState("")
  const [amount, setAmount] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open || !card) return

    setWalletId(wallets[0]?.id ?? "")
    // Paying in full is the common case, so it is the default.
    setAmount(card.outstanding)
    setError(null)
  }, [open, card, wallets])

  if (!card) return null

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!walletId) return setError("Pilih wallet sumber dana")
    if (amount <= 0) return setError("Nominal harus lebih dari 0")

    startTransition(async () => {
      const result = await payCreditCard(card!.id, walletId, amount)

      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success("Pembayaran tercatat")
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
          <SheetTitle className="text-lg font-semibold">Bayar {card.name}</SheetTitle>
          <SheetDescription>
            Dicatat sebagai transfer dari wallet sumber ke kartu.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 pt-5 pb-6">
          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Dari wallet
            </Label>
            <Select
              value={walletId || null}
              onValueChange={(value) => setWalletId((value as string) ?? "")}
            >
              <SelectTrigger className="h-11 w-full rounded-field px-3">
                <SelectValue placeholder="Pilih wallet">
                  {(value: string | null) =>
                    wallets.find((wallet) => wallet.id === value)?.name ?? "Pilih wallet"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    {wallet.name} · {formatCurrency(wallet.balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Nominal
            </Label>
            <CurrencyInput value={amount} onValueChange={setAmount} />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-field"
                onClick={() => setAmount(card.outstanding)}
              >
                Bayar penuh
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-field"
                onClick={() => setAmount(Math.round(card.outstanding * 0.1))}
              >
                Minimum 10%
              </Button>
            </div>
          </div>

          {error ? <p className="text-danger text-xs">{error}</p> : null}

          <Button type="submit" className="h-12 rounded-field text-base" disabled={pending}>
            {pending ? <Loader2 className="size-5 animate-spin" /> : null}
            Catat Pembayaran
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
