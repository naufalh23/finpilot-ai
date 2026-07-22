"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Landmark, Loader2, MoreHorizontal, Plus, Trash2 } from "lucide-react"
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
import { deleteLoan, payLoanInstallment, upsertLoan } from "@/lib/actions/loan"
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format"
import type { LoanType } from "@/lib/generated/prisma/enums"
import type { LoanSummary } from "@/lib/queries/commitments"
import type { WalletSummary } from "@/lib/queries/wallets"
import { cn } from "@/lib/utils"

const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  PERSONAL: "Personal",
  BANK: "Bank",
  VEHICLE: "Kendaraan",
  MORTGAGE: "KPR",
  OTHER: "Lainnya",
}

export function LoanTab({
  loans,
  wallets,
}: {
  loans: LoanSummary[]
  wallets: WalletSummary[]
}) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<LoanSummary | null>(null)
  const [, startTransition] = React.useTransition()

  const active = loans.filter((loan) => loan.isActive)
  const totalRemaining = active.reduce((sum, loan) => sum + loan.remainingBalance, 0)
  const totalMonthly = active.reduce((sum, loan) => sum + loan.installment, 0)

  return (
    <div className="space-y-5">
      {active.length > 0 ? (
        <section className="card-surface p-5">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Sisa Pinjaman
          </p>
          <p className="tabular text-danger mt-1.5 text-2xl font-bold">
            {formatCurrency(totalRemaining)}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {active.length} pinjaman aktif · cicilan {formatCurrency(totalMonthly)} per bulan
          </p>
        </section>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Pinjaman</h2>
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

      {loans.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={Landmark}
            title="Belum ada pinjaman."
            description="Catat KPR, kredit kendaraan, atau pinjaman lain untuk memantau sisanya."
            action={
              <Button
                className="h-11 rounded-field"
                onClick={() => {
                  setEditing(null)
                  setSheetOpen(true)
                }}
              >
                <Plus className="size-4" />
                Tambah Pinjaman
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {loans.map((loan) => (
            <li key={loan.id} className={cn("card-surface p-5", !loan.isActive && "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{loan.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {LOAN_TYPE_LABELS[loan.type]}
                    {loan.lender ? ` · ${loan.lender}` : ""}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Aksi pinjaman</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditing(loan)
                        setSheetOpen(true)
                      }}
                    >
                      Ubah
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() =>
                        startTransition(async () => {
                          const result = await deleteLoan(loan.id)
                          if (!result.ok) {
                            toast.error(result.error)
                            return
                          }
                          toast.success("Pinjaman dihapus")
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

              <p className="tabular mt-4 text-2xl font-bold">
                {formatCurrency(loan.remainingBalance)}
              </p>
              <p className="text-muted-foreground text-xs">
                dari pokok {formatCurrency(loan.principal)}
                {loan.remainingInstallments !== null && loan.isActive
                  ? ` · sisa ${loan.remainingInstallments}× cicilan`
                  : ""}
              </p>

              <div className="bg-muted mt-3 h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-success h-full rounded-full transition-all"
                  style={{ width: `${loan.paidRatio * 100}%` }}
                />
              </div>
              <p className="text-muted-foreground mt-1.5 text-xs">
                Terbayar {Math.round(loan.paidRatio * 100)}%
              </p>

              {loan.isActive ? (
                <div className="mt-4 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Cicilan {formatCurrency(loan.installment)} ·{" "}
                      {formatDate(new Date(loan.nextDueDate))}
                    </p>
                    <DueBadge days={loan.daysUntilDue} reminderDays={5} className="mt-1.5" />
                  </div>
                  <Button
                    variant="outline"
                    className="h-10 rounded-field"
                    onClick={() =>
                      startTransition(async () => {
                        const result = await payLoanInstallment(loan.id)
                        if (!result.ok) {
                          toast.error(result.error)
                          return
                        }
                        toast.success(
                          result.data.closed
                            ? `${loan.name} lunas 🎉`
                            : `Cicilan dicatat · sisa ${formatCurrency(result.data.remaining)}`
                        )
                        router.refresh()
                      })
                    }
                  >
                    Bayar cicilan
                  </Button>
                </div>
              ) : (
                <p className="text-success mt-4 text-xs font-medium">Lunas</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <LoanFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        loan={editing}
        wallets={wallets}
      />
    </div>
  )
}

function LoanFormSheet({
  open,
  onOpenChange,
  loan,
  wallets,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: LoanSummary | null
  wallets: WalletSummary[]
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [name, setName] = React.useState("")
  const [type, setType] = React.useState<LoanType>("PERSONAL")
  const [lender, setLender] = React.useState("")
  const [principal, setPrincipal] = React.useState(0)
  const [remaining, setRemaining] = React.useState(0)
  const [installment, setInstallment] = React.useState(0)
  const [dueDay, setDueDay] = React.useState(1)
  const [startDate, setStartDate] = React.useState(toDateInputValue(new Date()))
  const [walletId, setWalletId] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return

    setName(loan?.name ?? "")
    setType(loan?.type ?? "PERSONAL")
    setLender(loan?.lender ?? "")
    setPrincipal(loan?.principal ?? 0)
    setRemaining(loan?.remainingBalance ?? 0)
    setInstallment(loan?.installment ?? 0)
    setDueDay(loan?.dueDay ?? 1)
    setStartDate(toDateInputValue(new Date()))
    setWalletId(loan?.walletId ?? "")
    setError(null)
  }, [open, loan])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!name.trim()) return setError("Nama pinjaman wajib diisi")
    if (principal <= 0) return setError("Pokok pinjaman harus lebih dari 0")
    if (installment <= 0) return setError("Cicilan harus lebih dari 0")
    if (remaining > principal) return setError("Sisa pinjaman tidak boleh melebihi pokok")

    const payload = {
      name: name.trim(),
      type,
      lender: lender.trim() || null,
      principal,
      remainingBalance: remaining,
      installment,
      interestRate: null,
      tenorMonths: null,
      dueDay,
      startDate: new Date(`${startDate}T12:00:00`),
      walletId: walletId || null,
    }

    startTransition(async () => {
      const result = await upsertLoan(payload, loan?.id)

      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(loan ? "Pinjaman diperbarui" : "Pinjaman ditambahkan")
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
            {loan ? "Ubah Pinjaman" : "Tambah Pinjaman"}
          </SheetTitle>
          <SheetDescription>
            Sisa pinjaman berkurang setiap kali Anda mencatat cicilan.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 pt-5 pb-6">
          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Jenis
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(LOAN_TYPE_LABELS) as LoanType[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  className={cn(
                    "h-11 rounded-field border text-xs transition-colors",
                    type === option
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {LOAN_TYPE_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="loan-name" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Nama
            </Label>
            <Input
              id="loan-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="mis. KPR Rumah"
              className="h-11 rounded-field px-3"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="loan-lender" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Pemberi pinjaman <span className="normal-case">· opsional</span>
            </Label>
            <Input
              id="loan-lender"
              value={lender}
              onChange={(event) => setLender(event.target.value)}
              placeholder="mis. Bank BTN"
              className="h-11 rounded-field px-3"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Pokok pinjaman
            </Label>
            <CurrencyInput value={principal} onValueChange={setPrincipal} />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Sisa saat ini
            </Label>
            <CurrencyInput value={remaining} onValueChange={setRemaining} />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Cicilan per bulan
            </Label>
            <CurrencyInput value={installment} onValueChange={setInstallment} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="loan-due" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Tanggal jatuh tempo
            </Label>
            <Input
              id="loan-due"
              type="number"
              min={1}
              max={31}
              value={dueDay}
              onChange={(event) => setDueDay(Number(event.target.value))}
              className="h-11 rounded-field px-3"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Wallet pembayaran <span className="normal-case">· opsional</span>
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
          </div>

          {error ? <p className="text-danger text-xs">{error}</p> : null}

          <Button type="submit" className="h-12 rounded-field text-base" disabled={pending}>
            {pending ? <Loader2 className="size-5 animate-spin" /> : <Landmark className="size-5" />}
            Simpan Pinjaman
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
