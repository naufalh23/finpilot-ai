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
  Repeat2,
  Sparkles,
  Trash2,
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  deleteRecurring,
  runRecurringNow,
  setRecurringActive,
  upsertRecurring,
} from "@/lib/actions/recurring"
import { formatCurrency, toDateInputValue } from "@/lib/format"
import type { Frequency, TransactionType } from "@/lib/generated/prisma/enums"
import type { CategorySummary } from "@/lib/queries/categories"
import type { RecurringSummary } from "@/lib/queries/commitments"
import type { WalletSummary } from "@/lib/queries/wallets"
import { FIELD_LIMITS } from "@/lib/validators"
import { cn } from "@/lib/utils"

const CYCLE_LABELS: Record<Frequency, string> = {
  DAILY: "Harian",
  WEEKLY: "Mingguan",
  MONTHLY: "Bulanan",
  YEARLY: "Tahunan",
}

/** Common personal-finance recurrences, offered as one-tap presets. */
const PRESETS = [
  { name: "Gaji", type: "INCOME" as TransactionType, frequency: "MONTHLY" as Frequency },
  { name: "Sewa Kos", type: "EXPENSE" as TransactionType, frequency: "MONTHLY" as Frequency },
  { name: "Internet", type: "EXPENSE" as TransactionType, frequency: "MONTHLY" as Frequency },
  { name: "Gym", type: "EXPENSE" as TransactionType, frequency: "MONTHLY" as Frequency },
]

export function RecurringTab({
  recurrings,
  wallets,
  categories,
}: {
  recurrings: RecurringSummary[]
  wallets: WalletSummary[]
  categories: CategorySummary[]
}) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<RecurringSummary | null>(null)
  const [, startTransition] = React.useTransition()

  const active = recurrings.filter((item) => item.isActive)
  const paused = recurrings.filter((item) => !item.isActive)

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

  function openCreate() {
    setEditing(null)
    setSheetOpen(true)
  }

  function openEdit(recurring: RecurringSummary) {
    setEditing(recurring)
    setSheetOpen(true)
  }

  return (
    <div className="space-y-5">
      <div className="border-ai/25 bg-ai/6 flex items-start gap-2.5 rounded-field border px-3.5 py-3">
        <Sparkles className="text-ai mt-0.5 size-4 shrink-0" />
        <p className="text-muted-foreground text-xs leading-relaxed">
          Aktifkan <span className="text-foreground font-medium">catat otomatis</span> untuk hal
          yang jumlahnya pasti (gaji, sewa). Matikan untuk hal yang perlu Anda konfirmasi dulu.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Transaksi Berulang</h2>
        <Button variant="outline" className="h-9 rounded-field" onClick={openCreate}>
          <Plus className="size-4" />
          Tambah
        </Button>
      </div>

      {recurrings.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={Repeat2}
            title="Belum ada transaksi berulang."
            description="Catat gaji, sewa, atau tagihan rutin lain agar tercatat sendiri setiap periode."
            action={
              <Button className="h-11 rounded-field" onClick={openCreate}>
                <Plus className="size-4" />
                Tambah Transaksi Berulang
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {active.map((recurring) => (
            <RecurringCard
              key={recurring.id}
              recurring={recurring}
              onEdit={() => openEdit(recurring)}
              onPause={() => run(() => setRecurringActive(recurring.id, false), "Dijeda")}
              onDelete={() => run(() => deleteRecurring(recurring.id), "Dihapus")}
              onRunNow={() =>
                run(() => runRecurringNow(recurring.id), "Transaksi dicatat")
              }
            />
          ))}
        </ul>
      )}

      {paused.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-muted-foreground text-sm font-semibold">Dijeda</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {paused.map((recurring) => (
              <RecurringCard
                key={recurring.id}
                recurring={recurring}
                onEdit={() => openEdit(recurring)}
                onResume={() => run(() => setRecurringActive(recurring.id, true), "Diaktifkan")}
                onDelete={() => run(() => deleteRecurring(recurring.id), "Dihapus")}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <RecurringFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        recurring={editing}
        wallets={wallets}
        categories={categories}
      />
    </div>
  )
}

function RecurringCard({
  recurring,
  onEdit,
  onPause,
  onResume,
  onDelete,
  onRunNow,
}: {
  recurring: RecurringSummary
  onEdit: () => void
  onPause?: () => void
  onResume?: () => void
  onDelete: () => void
  onRunNow?: () => void
}) {
  const isIncome = recurring.type === "INCOME"

  return (
    <li className={cn("card-surface p-4", !recurring.isActive && "opacity-60")}>
      <div className="flex items-center gap-3">
        <IconBadge
          name={recurring.categoryIcon ?? (isIncome ? "TrendingUp" : "ReceiptText")}
          color={recurring.categoryColor ?? (isIncome ? "#22c55e" : undefined)}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{recurring.name}</p>
          <p className="text-muted-foreground truncate text-xs">
            {CYCLE_LABELS[recurring.frequency]}
            {recurring.interval > 1 ? ` · setiap ${recurring.interval}x` : ""} · {recurring.walletName}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Aksi</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Ubah</DropdownMenuItem>
            {onPause ? (
              <DropdownMenuItem onClick={onPause}>
                <Pause />
                Jeda
              </DropdownMenuItem>
            ) : null}
            {onResume ? (
              <DropdownMenuItem onClick={onResume}>
                <Play />
                Aktifkan
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 />
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className={cn("tabular text-lg font-semibold", isIncome && "text-success")}>
            {isIncome ? "+" : "-"}
            {formatCurrency(recurring.amount)}
          </p>
          <p className="text-muted-foreground text-xs">
            {recurring.autoCreate ? "Catat otomatis" : "Konfirmasi manual"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {recurring.isActive ? (
            <DueBadge days={recurring.daysUntil} reminderDays={3} />
          ) : (
            <span className="bg-muted text-muted-foreground inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium">
              Dijeda
            </span>
          )}
          {recurring.isActive && !recurring.autoCreate && onRunNow ? (
            <Button variant="ghost" size="sm" className="rounded-field" onClick={onRunNow}>
              <Check className="size-3.5" />
              Catat sekarang
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  )
}

function RecurringFormSheet({
  open,
  onOpenChange,
  recurring,
  wallets,
  categories,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  recurring: RecurringSummary | null
  wallets: WalletSummary[]
  categories: CategorySummary[]
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [name, setName] = React.useState("")
  const [type, setType] = React.useState<TransactionType>("EXPENSE")
  const [amount, setAmount] = React.useState(0)
  const [walletId, setWalletId] = React.useState("")
  const [categoryId, setCategoryId] = React.useState("")
  const [frequency, setFrequency] = React.useState<Frequency>("MONTHLY")
  const [interval, setInterval_] = React.useState(1)
  const [startDate, setStartDate] = React.useState(toDateInputValue(new Date()))
  const [hasEndDate, setHasEndDate] = React.useState(false)
  const [endDate, setEndDate] = React.useState(toDateInputValue(new Date()))
  const [autoCreate, setAutoCreate] = React.useState(true)
  const [notes, setNotes] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const visibleCategories = categories.filter((category) => category.type === type)
  const isEdit = Boolean(recurring)

  React.useEffect(() => {
    if (!open) return

    setName(recurring?.name ?? "")
    setType(recurring?.type === "INCOME" ? "INCOME" : "EXPENSE")
    setAmount(recurring?.amount ?? 0)
    setWalletId(recurring?.walletId ?? wallets[0]?.id ?? "")
    setCategoryId(recurring?.categoryId ?? "")
    setFrequency(recurring?.frequency ?? "MONTHLY")
    setInterval_(recurring?.interval ?? 1)
    setStartDate(
      recurring ? toDateInputValue(new Date(recurring.startDate)) : toDateInputValue(new Date())
    )
    setHasEndDate(Boolean(recurring?.endDate))
    setEndDate(
      recurring?.endDate ? toDateInputValue(new Date(recurring.endDate)) : toDateInputValue(new Date())
    )
    setAutoCreate(recurring?.autoCreate ?? true)
    setNotes(recurring?.notes ?? "")
    setError(null)
  }, [open, recurring, wallets])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!name.trim()) return setError("Nama wajib diisi")
    if (amount <= 0) return setError("Jumlah harus lebih dari 0")
    if (!walletId) return setError("Wallet wajib dipilih")

    const payload = {
      name: name.trim(),
      type,
      amount,
      walletId,
      categoryId: categoryId || null,
      frequency,
      interval,
      startDate: new Date(`${startDate}T12:00:00`),
      endDate: hasEndDate ? new Date(`${endDate}T12:00:00`) : null,
      autoCreate,
      notes: notes.trim() || null,
    }

    startTransition(async () => {
      const result = await upsertRecurring(payload, recurring?.id)

      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(isEdit ? "Data berulang diperbarui" : "Data berulang ditambahkan")
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
            {isEdit ? "Ubah Transaksi Berulang" : "Tambah Transaksi Berulang"}
          </SheetTitle>
          <SheetDescription>
            Untuk hal yang berulang di tanggal tetap — gaji, sewa, tagihan rutin.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 pt-5 pb-6">
          {isEdit ? null : (
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setName(preset.name)
                    setType(preset.type)
                    setFrequency(preset.frequency)
                  }}
                  className="border-border text-muted-foreground hover:bg-muted hover:text-foreground rounded-field border px-3 py-1.5 text-xs transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          )}

          <div className="bg-muted flex gap-1 rounded-field p-1">
            {(["EXPENSE", "INCOME"] as TransactionType[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setType(option)
                  setCategoryId("")
                }}
                className={cn(
                  "h-9 flex-1 rounded-[9px] text-sm font-medium transition-colors",
                  type === option
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option === "EXPENSE" ? "Pengeluaran" : "Pemasukan"}
              </button>
            ))}
          </div>

          <Field label="Nama">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={FIELD_LIMITS.subscriptionName}
              placeholder="mis. Gaji, Sewa Kos, Internet"
              className="h-11 rounded-field px-3"
            />
          </Field>

          <Field label="Jumlah">
            <CurrencyInput value={amount} onValueChange={setAmount} />
          </Field>

          <Field label="Wallet">
            <Select value={walletId || null} onValueChange={(value) => setWalletId((value as string) ?? "")}>
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
                    {wallet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Kategori" hint="opsional">
            <Select
              value={categoryId || null}
              onValueChange={(value) => setCategoryId((value as string) ?? "")}
            >
              <SelectTrigger className="h-11 w-full rounded-field px-3">
                <SelectValue placeholder="Tanpa kategori">
                  {(value: string | null) =>
                    visibleCategories.find((category) => category.id === value)?.name ??
                    "Tanpa kategori"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {visibleCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Siklus">
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(CYCLE_LABELS) as Frequency[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFrequency(option)}
                  className={cn(
                    "h-11 rounded-field border text-xs transition-colors",
                    frequency === option
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {CYCLE_LABELS[option]}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Setiap" hint={`${interval}x periode`}>
            <Input
              type="number"
              min={1}
              max={365}
              value={interval}
              onChange={(event) => setInterval_(Math.max(1, Number(event.target.value) || 1))}
              className="h-11 rounded-field px-3"
            />
          </Field>

          <Field label="Tanggal mulai">
            <Input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="h-11 rounded-field px-3"
            />
          </Field>

          <div className="flex items-center justify-between rounded-field border px-3.5 py-3">
            <div className="min-w-0">
              <Label htmlFor="recurring-end-toggle" className="text-sm font-medium">
                Tanggal berakhir
              </Label>
              <p className="text-muted-foreground text-xs">Kosongkan jika berlangsung terus</p>
            </div>
            <Switch
              id="recurring-end-toggle"
              checked={hasEndDate}
              onCheckedChange={setHasEndDate}
            />
          </div>

          {hasEndDate ? (
            <Field label="Berakhir pada">
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-11 rounded-field px-3"
              />
            </Field>
          ) : null}

          <div className="flex items-center justify-between rounded-field border px-3.5 py-3">
            <div className="min-w-0">
              <Label htmlFor="recurring-auto-toggle" className="text-sm font-medium">
                Catat otomatis
              </Label>
              <p className="text-muted-foreground text-xs">
                {autoCreate
                  ? "Transaksi tercatat sendiri tiap jatuh tempo"
                  : "Anda menekan “Catat sekarang” tiap jatuh tempo"}
              </p>
            </div>
            <Switch
              id="recurring-auto-toggle"
              checked={autoCreate}
              onCheckedChange={setAutoCreate}
            />
          </div>

          <Field label="Catatan" hint="opsional">
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={FIELD_LIMITS.notes}
              placeholder="Detail tambahan"
              rows={2}
              className="rounded-field px-3 py-2.5"
            />
          </Field>

          {error ? <p className="text-danger text-xs">{error}</p> : null}

          <Button type="submit" className="h-12 rounded-field text-base" disabled={pending}>
            {pending ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
            {isEdit ? "Simpan Perubahan" : "Simpan"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
        {hint ? <span className="text-muted-foreground/70 normal-case">· {hint}</span> : null}
      </Label>
      {children}
    </div>
  )
}
