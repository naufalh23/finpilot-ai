"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { CurrencyInput } from "@/components/shared/currency-input"
import { IconBadge } from "@/components/shared/icon"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { deleteBudget, upsertBudget } from "@/lib/actions/budget"
import { formatCurrency, formatMonth } from "@/lib/format"
import type { BudgetProgress } from "@/lib/queries/budgets"
import { cn } from "@/lib/utils"

export type BudgetCategoryOption = {
  categoryId: string
  name: string
  icon: string | null
  color: string | null
}

const ALERT_OPTIONS = [70, 80, 90, 100]

export function BudgetFormSheet({
  open,
  onOpenChange,
  period,
  budget,
  categories,
  suggestions,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  period: string
  /** Present when editing; absent when creating. */
  budget?: BudgetProgress | null
  /** Categories selectable when creating a new budget. */
  categories: BudgetCategoryOption[]
  suggestions: Record<string, number>
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [categoryId, setCategoryId] = React.useState("")
  const [amount, setAmount] = React.useState(0)
  const [alertAt, setAlertAt] = React.useState(90)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return

    setCategoryId(budget?.categoryId ?? categories[0]?.categoryId ?? "")
    setAmount(budget?.amount ?? 0)
    setAlertAt(budget?.alertAt ?? 90)
    setError(null)
  }, [open, budget, categories])

  const suggestion = categoryId ? suggestions[categoryId] : undefined
  const isEdit = Boolean(budget)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!categoryId) {
      setError("Kategori wajib dipilih")
      return
    }
    if (amount <= 0) {
      setError("Nominal harus lebih dari 0")
      return
    }

    startTransition(async () => {
      const result = await upsertBudget({ categoryId, period, amount, alertAt })

      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }

      toast.success(isEdit ? "Budget diperbarui" : "Budget ditambahkan")
      onOpenChange(false)
      router.refresh()
    })
  }

  function handleDelete() {
    if (!budget) return

    startTransition(async () => {
      const result = await deleteBudget(budget.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Budget dihapus")
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
            {isEdit ? `Budget ${budget!.categoryName}` : "Tambah Budget"}
          </SheetTitle>
          <SheetDescription>
            Berlaku untuk {formatMonth(new Date(period))}.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 pt-5 pb-6">
          {isEdit ? null : (
            <div className="flex flex-col gap-2">
              <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Kategori
              </Label>
              {categories.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Semua kategori pengeluaran sudah punya budget bulan ini.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category.categoryId}
                      type="button"
                      onClick={() => {
                        setCategoryId(category.categoryId)
                        // Pre-fill with the suggestion so the common case is one tap.
                        const suggested = suggestions[category.categoryId]
                        if (suggested && amount === 0) setAmount(suggested)
                      }}
                      className={cn(
                        "flex h-11 items-center gap-2 rounded-field border px-3 text-sm transition-colors",
                        categoryId === category.categoryId
                          ? "border-primary bg-primary/10 font-medium"
                          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
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
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Nominal per bulan
            </Label>
            <CurrencyInput value={amount} onValueChange={setAmount} />

            {suggestion ? (
              <button
                type="button"
                onClick={() => setAmount(suggestion)}
                className="border-ai/30 bg-ai/8 text-ai hover:bg-ai/12 mt-1 flex items-center gap-2 rounded-field border px-3 py-2.5 text-left text-xs transition-colors"
              >
                <Sparkles className="size-3.5 shrink-0" />
                <span className="text-muted-foreground">
                  Rata-rata 3 bulan terakhir{" "}
                  <span className="text-ai font-semibold">{formatCurrency(suggestion)}</span> —
                  ketuk untuk pakai.
                </span>
              </button>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Peringatan di
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {ALERT_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAlertAt(option)}
                  className={cn(
                    "h-11 rounded-field border text-sm transition-colors",
                    alertAt === option
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {option}%
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="text-danger text-xs">{error}</p> : null}

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
                <span className="sr-only">Hapus budget</span>
              </Button>
            ) : null}
            <Button
              type="submit"
              className="h-12 flex-1 rounded-field text-base"
              disabled={pending || (!isEdit && categories.length === 0)}
            >
              {pending ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
              Simpan Budget
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
