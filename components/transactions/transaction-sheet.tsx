"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowRightLeft, Check, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { IconBadge } from "@/components/shared/icon"
import { CurrencyInput } from "@/components/shared/currency-input"
import { ReceiptBadge, ReceiptScanner } from "@/components/transactions/receipt-scanner"
import type { ReceiptDraft } from "@/lib/actions/ai"
import {
  useTransactionSheet,
  type TransactionDraft,
} from "@/components/transactions/transaction-sheet-context"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/lib/actions/transaction"
import { addDays, toDateInputValue } from "@/lib/format"
import { cn } from "@/lib/utils"

type TxType = "INCOME" | "EXPENSE" | "TRANSFER"

const TYPE_OPTIONS: { value: TxType; label: string; activeClass: string }[] = [
  { value: "EXPENSE", label: "Pengeluaran", activeClass: "bg-danger/12 text-danger" },
  { value: "INCOME", label: "Pemasukan", activeClass: "bg-success/12 text-success" },
  { value: "TRANSFER", label: "Transfer", activeClass: "bg-primary/12 text-primary" },
]

type FormState = {
  type: TxType
  date: string
  walletId: string
  toWalletId: string
  categoryId: string
  amount: number
  merchant: string
  notes: string
}

function initialState(draft: TransactionDraft | null, defaultWalletId: string): FormState {
  return {
    type: draft?.type ?? "EXPENSE",
    date: draft?.date ? toDateInputValue(new Date(draft.date)) : toDateInputValue(new Date()),
    walletId: draft?.walletId ?? defaultWalletId,
    toWalletId: draft?.toWalletId ?? "",
    categoryId: draft?.categoryId ?? "",
    amount: draft?.amount ?? 0,
    merchant: draft?.merchant ?? "",
    notes: draft?.notes ?? "",
  }
}

export function TransactionSheet() {
  const router = useRouter()
  const { open, close, draft, wallets, categories } = useTransactionSheet()

  const defaultWalletId = wallets[0]?.id ?? ""
  const isEdit = Boolean(draft?.id)

  const [form, setForm] = React.useState<FormState>(() => initialState(draft, defaultWalletId))
  const [pending, startTransition] = React.useTransition()
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [scanned, setScanned] = React.useState<ReceiptDraft | null>(null)

  // Reset the form each time the sheet is opened, not on every render.
  React.useEffect(() => {
    if (open) {
      setForm(initialState(draft, defaultWalletId))
      setErrors({})
      setScanned(null)
    }
  }, [open, draft, defaultWalletId])

  /** Fills the form from a scanned receipt, leaving anything unread untouched. */
  function applyReceipt(receipt: ReceiptDraft) {
    setScanned(receipt)
    setErrors({})
    setForm((current) => ({
      ...current,
      type: "EXPENSE",
      amount: receipt.total ?? current.amount,
      date: receipt.date ?? current.date,
      merchant: receipt.merchant ?? current.merchant,
      categoryId: receipt.categoryId ?? current.categoryId,
      notes:
        current.notes ||
        (receipt.items.length > 0
          ? receipt.items.map((item) => item.name).slice(0, 5).join(", ")
          : ""),
    }))
  }

  const visibleCategories = React.useMemo(
    () =>
      categories.filter((category) =>
        form.type === "INCOME" ? category.type === "INCOME" : category.type === "EXPENSE"
      ),
    [categories, form.type]
  )

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key as string]) return current
      const next = { ...current }
      delete next[key as string]
      return next
    })
  }

  function validate() {
    const next: Record<string, string> = {}

    if (!form.amount || form.amount <= 0) next.amount = "Jumlah harus lebih dari 0"
    if (!form.walletId) next.walletId = "Wallet wajib dipilih"

    if (form.type === "TRANSFER") {
      if (!form.toWalletId) next.toWalletId = "Wallet tujuan wajib dipilih"
      else if (form.toWalletId === form.walletId) next.toWalletId = "Wallet tujuan harus berbeda"
    } else if (!form.categoryId) {
      next.categoryId = "Kategori wajib dipilih"
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!validate()) return

    const payload = {
      type: form.type,
      status: "COMPLETED" as const,
      // Store at local noon so a timezone shift can't move it to another day.
      date: new Date(`${form.date}T12:00:00`),
      amount: form.amount,
      walletId: form.walletId,
      toWalletId: form.type === "TRANSFER" ? form.toWalletId : null,
      categoryId: form.type === "TRANSFER" ? null : form.categoryId,
      merchant: form.merchant.trim() || null,
      notes: form.notes.trim() || null,
      aiGenerated: scanned !== null,
    }

    startTransition(async () => {
      const result = draft?.id
        ? await updateTransaction(draft.id, payload)
        : await createTransaction(payload)

      if (!result.ok) {
        toast.error(result.error)
        if (result.fieldErrors) {
          setErrors(
            Object.fromEntries(
              Object.entries(result.fieldErrors).map(([key, messages]) => [key, messages[0]])
            )
          )
        }
        return
      }

      toast.success(isEdit ? "Transaksi diperbarui" : "Transaksi tersimpan")
      close()
      router.refresh()
    })
  }

  function handleDelete() {
    if (!draft?.id) return

    startTransition(async () => {
      const result = await deleteTransaction(draft.id!)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Transaksi dihapus")
      close()
      router.refresh()
    })
  }

  const today = toDateInputValue(new Date())
  const yesterday = toDateInputValue(addDays(new Date(), -1))

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : close())}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-modal p-0 sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:rounded-modal sm:border"
      >
        <SheetHeader className="px-5 pt-5 pb-0">
          <SheetTitle className="text-lg font-semibold">
            {isEdit ? "Ubah Transaksi" : "Tambah Transaksi"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Perbarui detail transaksi ini."
              : "Catat pemasukan, pengeluaran, atau transfer antar wallet."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 pt-5 pb-6">
          {/* Less input beats more input: offer the scanner before the form. */}
          {isEdit ? null : scanned ? (
            <ReceiptBadge confidence={scanned.confidence} />
          ) : (
            <ReceiptScanner onExtracted={applyReceipt} />
          )}

          {/* Jenis — first because it decides which fields below apply. */}
          <div className="bg-muted flex gap-1 rounded-field p-1">
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  set("type", option.value)
                  set("categoryId", "")
                }}
                className={cn(
                  "h-9 flex-1 rounded-[9px] text-sm font-medium transition-colors",
                  form.type === option.value
                    ? cn("bg-background shadow-sm", option.activeClass)
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Field label="Tanggal" error={errors.date}>
            <div className="flex gap-2">
              <Input
                type="date"
                value={form.date}
                onChange={(event) => set("date", event.target.value)}
                className="h-11 flex-1 rounded-field px-3"
              />
              <Button
                type="button"
                variant={form.date === today ? "secondary" : "outline"}
                className="h-11 rounded-field px-3"
                onClick={() => set("date", today)}
              >
                Hari ini
              </Button>
              <Button
                type="button"
                variant={form.date === yesterday ? "secondary" : "outline"}
                className="h-11 rounded-field px-3"
                onClick={() => set("date", yesterday)}
              >
                Kemarin
              </Button>
            </div>
          </Field>

          <Field
            label={form.type === "TRANSFER" ? "Dari wallet" : "Wallet"}
            error={errors.walletId}
          >
            <WalletSelect
              value={form.walletId}
              onChange={(value) => set("walletId", value)}
              wallets={wallets}
              placeholder="Pilih wallet"
            />
          </Field>

          {form.type === "TRANSFER" ? (
            <Field label="Ke wallet" error={errors.toWalletId}>
              <WalletSelect
                value={form.toWalletId}
                onChange={(value) => set("toWalletId", value)}
                wallets={wallets.filter((wallet) => wallet.id !== form.walletId)}
                placeholder="Pilih wallet tujuan"
                icon={<ArrowRightLeft className="text-muted-foreground size-4" />}
              />
            </Field>
          ) : (
            <Field label="Kategori" error={errors.categoryId}>
              {visibleCategories.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Belum ada kategori. Tambahkan lewat Pengaturan → Kategori.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {visibleCategories.map((category) => {
                    const active = form.categoryId === category.id
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => set("categoryId", category.id)}
                        className={cn(
                          "flex h-11 items-center gap-2 rounded-field border px-3 text-sm transition-colors",
                          active
                            ? "border-primary bg-primary/10 text-foreground font-medium"
                            : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <IconBadge
                          name={category.icon}
                          color={category.color}
                          size="sm"
                          className="size-6 rounded-[8px]"
                        />
                        {category.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </Field>
          )}

          <Field label="Jumlah" error={errors.amount}>
            <CurrencyInput value={form.amount} onValueChange={(value) => set("amount", value)} />
          </Field>

          {form.type !== "TRANSFER" ? (
            <Field label="Merchant" hint="opsional">
              <Input
                value={form.merchant}
                onChange={(event) => set("merchant", event.target.value)}
                placeholder="mis. Indomaret, Gojek, Tokopedia"
                className="h-11 rounded-field px-3"
              />
            </Field>
          ) : null}

          <Field label="Catatan" hint="opsional">
            <Textarea
              value={form.notes}
              onChange={(event) => set("notes", event.target.value)}
              placeholder="Detail tambahan"
              rows={2}
              className="rounded-field px-3 py-2.5"
            />
          </Field>

          <div className="flex gap-2 pt-1">
            {isEdit ? (
              <Button
                type="button"
                variant="destructive"
                className="h-12 rounded-field px-4"
                disabled={pending}
                onClick={handleDelete}
              >
                <Trash2 className="size-4" />
                <span className="sr-only">Hapus transaksi</span>
              </Button>
            ) : null}
            <Button type="submit" className="h-12 flex-1 rounded-field text-base" disabled={pending}>
              {pending ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
              {isEdit ? "Simpan Perubahan" : "Simpan"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
        {hint ? <span className="text-muted-foreground/70 normal-case">· {hint}</span> : null}
      </Label>
      {children}
      {error ? <p className="text-danger text-xs">{error}</p> : null}
    </div>
  )
}

function WalletSelect({
  value,
  onChange,
  wallets,
  placeholder,
  icon,
}: {
  value: string
  onChange: (value: string) => void
  wallets: { id: string; name: string; color: string | null; icon: string | null }[]
  placeholder: string
  icon?: React.ReactNode
}) {
  const byId = React.useMemo(
    () => new Map(wallets.map((wallet) => [wallet.id, wallet])),
    [wallets]
  )

  return (
    <Select value={value || null} onValueChange={(next) => onChange((next as string) ?? "")}>
      <SelectTrigger className="h-11 w-full rounded-field px-3">
        {icon}
        <SelectValue placeholder={placeholder}>
          {(selected: string | null) => {
            const wallet = selected ? byId.get(selected) : undefined
            if (!wallet) return placeholder
            return (
              <span className="flex items-center gap-2">
                <IconBadge
                  name={wallet.icon}
                  color={wallet.color}
                  size="sm"
                  className="size-6 rounded-[8px]"
                />
                {wallet.name}
              </span>
            )
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {wallets.map((wallet) => (
          <SelectItem key={wallet.id} value={wallet.id} className="h-10">
            <IconBadge
              name={wallet.icon}
              color={wallet.color}
              size="sm"
              className="size-6 rounded-[8px]"
            />
            {wallet.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
