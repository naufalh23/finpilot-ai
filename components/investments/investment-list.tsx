"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bitcoin,
  Coins,
  Loader2,
  MoreHorizontal,
  PieChart,
  TrendingUp,
  Trash2,
  Wallet as WalletIcon,
} from "lucide-react"
import { toast } from "sonner"

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
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { deleteInvestment, upsertInvestment } from "@/lib/actions/investment"
import { formatCurrency, formatDate, formatPercent, toDateInputValue } from "@/lib/format"
import type { InvestmentType } from "@/lib/generated/prisma/enums"
import type { InvestmentSummary } from "@/lib/queries/investments"
import { FIELD_LIMITS } from "@/lib/validators"
import { cn } from "@/lib/utils"

const TYPE_LABELS: Record<InvestmentType, string> = {
  STOCK: "Saham",
  CRYPTO: "Kripto",
  GOLD: "Emas",
  MUTUAL_FUND: "Reksa Dana",
  ETF: "ETF",
  OTHER: "Lainnya",
}

const TYPE_ICONS: Record<InvestmentType, typeof TrendingUp> = {
  STOCK: TrendingUp,
  CRYPTO: Bitcoin,
  GOLD: Coins,
  MUTUAL_FUND: PieChart,
  ETF: BarChart3,
  OTHER: WalletIcon,
}

export function InvestmentList({ investments }: { investments: InvestmentSummary[] }) {
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<InvestmentSummary | null>(null)

  const totalCostBasis = investments.reduce((sum, item) => sum + item.costBasis, 0)
  const totalCurrentValue = investments.reduce((sum, item) => sum + item.currentValue, 0)
  const totalProfitLoss = totalCurrentValue - totalCostBasis
  const totalProfitLossRatio = totalCostBasis > 0 ? totalProfitLoss / totalCostBasis : 0
  const isProfit = totalProfitLoss >= 0

  function openCreate() {
    setEditing(null)
    setSheetOpen(true)
  }

  return (
    <div className="space-y-5">
      {investments.length > 0 ? (
        <section className="card-surface p-5">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Nilai Portofolio
          </p>
          <p className="tabular mt-1.5 text-2xl font-bold">{formatCurrency(totalCurrentValue)}</p>
          <p
            className={cn(
              "mt-1 flex items-center gap-1 text-sm font-medium",
              isProfit ? "text-success" : "text-danger"
            )}
          >
            {isProfit ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
            {formatCurrency(totalProfitLoss, { signed: true })} ({formatPercent(totalProfitLossRatio)})
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Modal {formatCurrency(totalCostBasis)} · {investments.length} posisi
          </p>
        </section>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Portofolio</h2>
        <Button variant="outline" className="h-9 rounded-field" onClick={openCreate}>
          <TrendingUp className="size-4" />
          Tambah
        </Button>
      </div>

      {investments.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={TrendingUp}
            title="Belum ada investasi tercatat."
            description="Catat saham, kripto, emas, reksa dana, atau ETF untuk memantau nilai dan untung-ruginya."
            action={
              <Button className="h-11 rounded-field" onClick={openCreate}>
                <TrendingUp className="size-4" />
                Tambah Investasi
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {investments.map((investment) => (
            <InvestmentCard
              key={investment.id}
              investment={investment}
              onEdit={() => {
                setEditing(investment)
                setSheetOpen(true)
              }}
            />
          ))}
        </ul>
      )}

      <InvestmentFormSheet open={sheetOpen} onOpenChange={setSheetOpen} investment={editing} />
    </div>
  )
}

function InvestmentCard({
  investment,
  onEdit,
}: {
  investment: InvestmentSummary
  onEdit: () => void
}) {
  const router = useRouter()
  const [, startTransition] = React.useTransition()
  const Icon = TYPE_ICONS[investment.type]
  const isProfit = investment.profitLoss >= 0

  return (
    <li className="card-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-[11px]">
            <Icon className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{investment.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {TYPE_LABELS[investment.type]}
              {investment.symbol ? ` · ${investment.symbol}` : ""}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Aksi investasi</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Ubah</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteInvestment(investment.id)
                  if (!result.ok) {
                    toast.error(result.error)
                    return
                  }
                  toast.success("Investasi dihapus")
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

      <p className="tabular mt-4 text-2xl font-bold">{formatCurrency(investment.currentValue)}</p>
      <p
        className={cn(
          "mt-1 flex items-center gap-1 text-xs font-medium",
          isProfit ? "text-success" : "text-danger"
        )}
      >
        {isProfit ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
        {formatCurrency(investment.profitLoss, { signed: true })} ({formatPercent(investment.profitLossRatio)})
      </p>

      <div className="text-muted-foreground mt-3 space-y-0.5 text-xs">
        <p>
          {investment.quantity} unit × {formatCurrency(investment.currentPrice)}
        </p>
        <p>
          Modal {formatCurrency(investment.costBasis)} · dibeli {formatDate(new Date(investment.buyDate))}
        </p>
      </div>
    </li>
  )
}

function InvestmentFormSheet({
  open,
  onOpenChange,
  investment,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  investment: InvestmentSummary | null
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [name, setName] = React.useState("")
  const [symbol, setSymbol] = React.useState("")
  const [type, setType] = React.useState<InvestmentType>("STOCK")
  const [quantity, setQuantity] = React.useState(0)
  const [buyPrice, setBuyPrice] = React.useState(0)
  const [currentPrice, setCurrentPrice] = React.useState(0)
  const [buyDate, setBuyDate] = React.useState(toDateInputValue(new Date()))
  const [notes, setNotes] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return

    setName(investment?.name ?? "")
    setSymbol(investment?.symbol ?? "")
    setType(investment?.type ?? "STOCK")
    setQuantity(investment?.quantity ?? 0)
    setBuyPrice(investment?.buyPrice ?? 0)
    setCurrentPrice(investment?.currentPrice ?? investment?.buyPrice ?? 0)
    setBuyDate(toDateInputValue(investment ? new Date(investment.buyDate) : new Date()))
    setNotes(investment?.notes ?? "")
    setError(null)
  }, [open, investment])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!name.trim()) return setError("Nama investasi wajib diisi")
    if (quantity <= 0) return setError("Jumlah harus lebih dari 0")
    if (buyPrice <= 0) return setError("Harga beli harus lebih dari 0")
    if (currentPrice <= 0) return setError("Harga saat ini harus lebih dari 0")

    const payload = {
      name: name.trim(),
      symbol: symbol.trim() || null,
      type,
      quantity,
      buyPrice,
      currentPrice,
      buyDate: new Date(`${buyDate}T12:00:00`),
      notes: notes.trim() || null,
    }

    startTransition(async () => {
      const result = await upsertInvestment(payload, investment?.id)

      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(investment ? "Investasi diperbarui" : "Investasi ditambahkan")
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
            {investment ? "Ubah Investasi" : "Tambah Investasi"}
          </SheetTitle>
          <SheetDescription>
            Harga saat ini diperbarui manual — belum ada sinkronisasi harga otomatis.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 pt-5 pb-6">
          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Jenis
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TYPE_LABELS) as InvestmentType[]).map((option) => (
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
                  {TYPE_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="investment-name" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Nama
            </Label>
            <Input
              id="investment-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={FIELD_LIMITS.investmentName}
              placeholder="mis. BBCA, Bitcoin, Emas Antam"
              className="h-11 rounded-field px-3"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="investment-symbol" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Kode/Ticker <span className="normal-case">· opsional</span>
            </Label>
            <Input
              id="investment-symbol"
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              maxLength={FIELD_LIMITS.symbol}
              placeholder="mis. BBCA, BTC"
              className="h-11 rounded-field px-3"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="investment-quantity" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Jumlah unit
            </Label>
            <Input
              id="investment-quantity"
              type="number"
              step="any"
              min={0}
              value={quantity || ""}
              onChange={(event) => setQuantity(event.target.valueAsNumber || 0)}
              placeholder="mis. 100 lembar, 0.05 BTC, 2.5 gram"
              className="h-11 rounded-field px-3"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Harga beli <span className="normal-case">· per unit</span>
            </Label>
            <CurrencyInput value={buyPrice} onValueChange={setBuyPrice} />
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Harga saat ini <span className="normal-case">· per unit</span>
            </Label>
            <CurrencyInput value={currentPrice} onValueChange={setCurrentPrice} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="investment-date" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Tanggal beli
            </Label>
            <Input
              id="investment-date"
              type="date"
              value={buyDate}
              onChange={(event) => setBuyDate(event.target.value)}
              className="h-11 rounded-field px-3"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="investment-notes" className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Catatan <span className="normal-case">· opsional</span>
            </Label>
            <Textarea
              id="investment-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={FIELD_LIMITS.notes}
              placeholder="mis. broker, akun, dll"
              className="rounded-field px-3 py-2.5"
              rows={2}
            />
          </div>

          {error ? <p className="text-danger text-xs">{error}</p> : null}

          <Button type="submit" className="h-12 rounded-field text-base" disabled={pending}>
            {pending ? <Loader2 className="size-5 animate-spin" /> : <TrendingUp className="size-5" />}
            Simpan Investasi
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
