"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Repeat,
  Trash2,
  Wallet as WalletIcon,
} from "lucide-react"
import { toast } from "sonner"

import { DueBadge } from "@/components/commitments/due-badge"
import { CurrencyInput } from "@/components/shared/currency-input"
import { EmptyState } from "@/components/shared/empty-state"
import { IconBadge } from "@/components/shared/icon"
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
  deleteSubscription,
  paySubscription,
  setSubscriptionStatus,
  upsertSubscription,
} from "@/lib/actions/subscription"
import { PICKER_COLORS } from "@/lib/constants"
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format"
import type { Frequency } from "@/lib/generated/prisma/enums"
import type { CategorySummary } from "@/lib/queries/categories"
import type { SubscriptionSummary } from "@/lib/queries/commitments"
import type { WalletSummary } from "@/lib/queries/wallets"
import { FIELD_LIMITS } from "@/lib/validators"
import { cn } from "@/lib/utils"

const CYCLE_LABELS: Record<Frequency, string> = {
  DAILY: "Harian",
  WEEKLY: "Mingguan",
  MONTHLY: "Bulanan",
  YEARLY: "Tahunan",
}

/** Services from the PRD, offered as one-tap presets. */
const PRESETS = [
  { name: "Netflix", color: "#ef4444" },
  { name: "Spotify", color: "#22c55e" },
  { name: "YouTube Premium", color: "#ef4444" },
  { name: "ChatGPT", color: "#14b8a6" },
  { name: "Claude", color: "#f59e0b" },
  { name: "Gemini", color: "#2563eb" },
  { name: "Apple", color: "#64748b" },
  { name: "Google One", color: "#2563eb" },
]

export function SubscriptionTab({
  subscriptions,
  wallets,
  categories,
}: {
  subscriptions: SubscriptionSummary[]
  wallets: WalletSummary[]
  categories: CategorySummary[]
}) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<SubscriptionSummary | null>(null)
  const [, startTransition] = React.useTransition()

  const active = subscriptions.filter((item) => item.status === "ACTIVE")
  const inactive = subscriptions.filter((item) => item.status !== "ACTIVE")
  const monthlyTotal = active.reduce((sum, item) => sum + item.monthlyEquivalent, 0)

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.error ?? "Terjadi kesalahan")
        return
      }
      toast.success(success)
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {active.length > 0 ? (
        <section className="card-surface p-5">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Total per Bulan
          </p>
          <p className="tabular mt-1.5 text-2xl font-bold">{formatCurrency(monthlyTotal)}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {active.length} langganan aktif · setara {formatCurrency(monthlyTotal * 12)} per tahun
          </p>
        </section>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Langganan</h2>
        <Button
          variant="outline"
          className="h-9 rounded-field"
          onClick={() => {
            setEditing(null)
            setSheetOpen(true)
          }}
        >
          <Plus className="size-4" />
          Tambah
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={Repeat}
            title="Belum ada langganan."
            description="Catat Netflix, Spotify, atau layanan lain agar tagihannya tidak mengejutkan."
            action={
              <Button
                className="h-11 rounded-field"
                onClick={() => {
                  setEditing(null)
                  setSheetOpen(true)
                }}
              >
                <Plus className="size-4" />
                Tambah Langganan
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {[...active, ...inactive].map((subscription) => (
            <li
              key={subscription.id}
              className={cn(
                "card-surface p-4",
                subscription.status !== "ACTIVE" && "opacity-60"
              )}
            >
              <div className="flex items-center gap-3">
                <IconBadge name={subscription.icon ?? "Repeat"} color={subscription.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{subscription.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {CYCLE_LABELS[subscription.billingCycle]}
                    {subscription.walletName ? ` · ${subscription.walletName}` : ""}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Aksi langganan</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditing(subscription)
                        setSheetOpen(true)
                      }}
                    >
                      Ubah
                    </DropdownMenuItem>
                    {subscription.status === "ACTIVE" ? (
                      <DropdownMenuItem
                        onClick={() =>
                          run(
                            () => setSubscriptionStatus(subscription.id, "PAUSED"),
                            "Langganan dijeda"
                          )
                        }
                      >
                        <Pause />
                        Jeda
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() =>
                          run(
                            () => setSubscriptionStatus(subscription.id, "ACTIVE"),
                            "Langganan diaktifkan"
                          )
                        }
                      >
                        <Play />
                        Aktifkan
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() =>
                        run(() => deleteSubscription(subscription.id), "Langganan dihapus")
                      }
                    >
                      <Trash2 />
                      Hapus
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="tabular text-lg font-semibold">
                    {formatCurrency(subscription.price)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(new Date(subscription.nextBillingDate))}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {subscription.status === "ACTIVE" ? (
                    <DueBadge
                      days={subscription.daysUntil}
                      reminderDays={subscription.reminderDays}
                    />
                  ) : (
                    <span className="bg-muted text-muted-foreground inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium">
                      {subscription.status === "PAUSED" ? "Dijeda" : "Dibatalkan"}
                    </span>
                  )}
                  {subscription.status === "ACTIVE" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-field"
                      onClick={() =>
                        run(async () => {
                          const result = await paySubscription(subscription.id)
                          return result
                        }, "Pembayaran dicatat")
                      }
                    >
                      <Check className="size-3.5" />
                      Tandai bayar
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SubscriptionFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        subscription={editing}
        wallets={wallets}
        categories={categories}
      />
    </div>
  )
}

function SubscriptionFormSheet({
  open,
  onOpenChange,
  subscription,
  wallets,
  categories,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription: SubscriptionSummary | null
  wallets: WalletSummary[]
  categories: CategorySummary[]
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [name, setName] = React.useState("")
  const [price, setPrice] = React.useState(0)
  const [cycle, setCycle] = React.useState<Frequency>("MONTHLY")
  const [nextDate, setNextDate] = React.useState(toDateInputValue(new Date()))
  const [walletId, setWalletId] = React.useState("")
  const [categoryId, setCategoryId] = React.useState("")
  const [reminderDays, setReminderDays] = React.useState(3)
  const [color, setColor] = React.useState(PICKER_COLORS[0])
  const [error, setError] = React.useState<string | null>(null)

  const expenseCategories = categories.filter((category) => category.type === "EXPENSE")

  React.useEffect(() => {
    if (!open) return

    setName(subscription?.name ?? "")
    setPrice(subscription?.price ?? 0)
    setCycle(subscription?.billingCycle ?? "MONTHLY")
    setNextDate(
      subscription
        ? toDateInputValue(new Date(subscription.nextBillingDate))
        : toDateInputValue(new Date())
    )
    setWalletId(subscription?.walletId ?? "")
    setCategoryId(subscription?.categoryId ?? "")
    setReminderDays(subscription?.reminderDays ?? 3)
    setColor(subscription?.color ?? PICKER_COLORS[0])
    setError(null)
  }, [open, subscription])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!name.trim()) return setError("Nama langganan wajib diisi")
    if (price <= 0) return setError("Harga harus lebih dari 0")

    const payload = {
      name: name.trim(),
      price,
      billingCycle: cycle,
      nextBillingDate: new Date(`${nextDate}T12:00:00`),
      autoRenew: true,
      reminderDays,
      walletId: walletId || null,
      categoryId: categoryId || null,
      icon: "Repeat",
      color,
      notes: null,
    }

    startTransition(async () => {
      const result = await upsertSubscription(payload, subscription?.id)

      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(subscription ? "Langganan diperbarui" : "Langganan ditambahkan")
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
            {subscription ? "Ubah Langganan" : "Tambah Langganan"}
          </SheetTitle>
          <SheetDescription>
            Tandai bayar setiap siklus untuk mencatatnya sebagai transaksi otomatis.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 pt-5 pb-6">
          {subscription ? null : (
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setName(preset.name)
                    setColor(preset.color)
                  }}
                  className="border-border text-muted-foreground hover:bg-muted hover:text-foreground rounded-field border px-3 py-1.5 text-xs transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="sub-name" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Nama
            </Label>
            <Input
              id="sub-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={FIELD_LIMITS.subscriptionName}
              placeholder="mis. Netflix"
              className="h-11 rounded-field px-3"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Harga
            </Label>
            <CurrencyInput value={price} onValueChange={setPrice} />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Siklus
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(CYCLE_LABELS) as Frequency[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCycle(option)}
                  className={cn(
                    "h-11 rounded-field border text-xs transition-colors",
                    cycle === option
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {CYCLE_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sub-date" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Tagihan berikutnya
            </Label>
            <Input
              id="sub-date"
              type="date"
              value={nextDate}
              onChange={(event) => setNextDate(event.target.value)}
              className="h-11 rounded-field px-3"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Wallet <span className="normal-case">· opsional</span>
            </Label>
            <Select
              value={walletId || null}
              onValueChange={(value) => setWalletId((value as string) ?? "")}
            >
              <SelectTrigger className="h-11 w-full rounded-field px-3">
                <SelectValue placeholder="Tanpa wallet">
                  {(value: string | null) =>
                    wallets.find((wallet) => wallet.id === value)?.name ?? "Tanpa wallet"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    {wallet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Tanpa wallet, &ldquo;tandai bayar&rdquo; hanya memajukan tanggal tanpa mencatat
              transaksi.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Kategori <span className="normal-case">· opsional</span>
            </Label>
            <Select
              value={categoryId || null}
              onValueChange={(value) => setCategoryId((value as string) ?? "")}
            >
              <SelectTrigger className="h-11 w-full rounded-field px-3">
                <SelectValue placeholder="Tanpa kategori">
                  {(value: string | null) =>
                    expenseCategories.find((category) => category.id === value)?.name ??
                    "Tanpa kategori"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Ingatkan
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 3, 7].map((option) => (
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
                  {option === 0 ? "Hari H" : `H-${option}`}
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="text-danger text-xs">{error}</p> : null}

          <Button type="submit" className="h-12 rounded-field text-base" disabled={pending}>
            {pending ? <Loader2 className="size-5 animate-spin" /> : <WalletIcon className="size-5" />}
            Simpan Langganan
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
