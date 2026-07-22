"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, CopyPlus, PiggyBank, Plus } from "lucide-react"
import { toast } from "sonner"

import { BUDGET_TEXT_COLORS, BudgetBar } from "@/components/budget/budget-bar"
import {
  BudgetFormSheet,
  type BudgetCategoryOption,
} from "@/components/budget/budget-form-sheet"
import { EmptyState } from "@/components/shared/empty-state"
import { IconBadge } from "@/components/shared/icon"
import { Button } from "@/components/ui/button"
import { copyBudgetsFromPreviousMonth } from "@/lib/actions/budget"
import { formatCurrency, formatMonth } from "@/lib/format"
import type { BudgetOverview, BudgetProgress } from "@/lib/queries/budgets"
import { cn } from "@/lib/utils"

function monthParam(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`
}

export function BudgetManager({
  overview,
  month,
  suggestions,
}: {
  overview: BudgetOverview
  /** ISO string of the first day of the displayed month, in local time. */
  month: string
  suggestions: Record<string, number>
}) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<BudgetProgress | null>(null)
  const [pending, startTransition] = React.useTransition()

  const current = new Date(month)
  const previous = new Date(current.getFullYear(), current.getMonth() - 1, 1)
  const next = new Date(current.getFullYear(), current.getMonth() + 1, 1)

  const availableCategories: BudgetCategoryOption[] = overview.unbudgeted.map((row) => ({
    categoryId: row.categoryId,
    name: row.name,
    icon: row.icon,
    color: row.color,
  }))

  const totalRatio = overview.totalBudget > 0 ? overview.totalSpent / overview.totalBudget : 0
  const overCount = overview.budgets.filter((budget) => budget.status === "over").length
  const warningCount = overview.budgets.filter((budget) => budget.status === "warning").length

  function openCreate() {
    setEditing(null)
    setSheetOpen(true)
  }

  function handleCopy() {
    startTransition(async () => {
      const result = await copyBudgetsFromPreviousMonth(overview.period)

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success(`${result.data.copied} budget disalin dari bulan lalu`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="icon"
          className="rounded-field"
          aria-label="Bulan sebelumnya"
          render={<Link href={`/budget?month=${monthParam(previous)}`} />}
        >
          <ChevronLeft className="size-4" />
        </Button>

        <p className="text-sm font-semibold">{formatMonth(current)}</p>

        <Button
          variant="outline"
          size="icon"
          className="rounded-field"
          aria-label="Bulan berikutnya"
          render={<Link href={`/budget?month=${monthParam(next)}`} />}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {overview.budgets.length > 0 ? (
        <section className="card-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Total Terpakai
              </p>
              <p className="tabular mt-1.5 text-2xl font-bold">
                {formatCurrency(overview.totalSpent)}
              </p>
            </div>
            <p className="text-muted-foreground tabular text-sm">
              dari {formatCurrency(overview.totalBudget)}
            </p>
          </div>

          <BudgetBar
            ratio={totalRatio}
            status={totalRatio >= 1 ? "over" : totalRatio >= 0.9 ? "warning" : "ok"}
            className="mt-4"
          />

          <p className="text-muted-foreground mt-3 text-xs">
            {overCount > 0 ? (
              <span className="text-danger font-medium">{overCount} kategori melewati budget</span>
            ) : warningCount > 0 ? (
              <span className="text-warning font-medium">
                {warningCount} kategori mendekati batas
              </span>
            ) : (
              <span className="text-success font-medium">Semua kategori masih aman</span>
            )}
            {" · "}
            Sisa {formatCurrency(Math.max(overview.totalBudget - overview.totalSpent, 0))}
          </p>
        </section>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Budget per Kategori</h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-field"
            disabled={pending}
            onClick={handleCopy}
          >
            <CopyPlus className="size-3.5" />
            Salin bulan lalu
          </Button>
          <Button
            variant="outline"
            className="h-9 rounded-field"
            onClick={openCreate}
            disabled={availableCategories.length === 0}
          >
            <Plus className="size-4" />
            Tambah
          </Button>
        </div>
      </div>

      {overview.budgets.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={PiggyBank}
            title="Belum ada budget bulan ini."
            description="Tetapkan batas pengeluaran per kategori, dan FinPilot akan memperingatkan sebelum Anda melewatinya."
            action={
              <Button
                className="h-11 rounded-field"
                onClick={openCreate}
                disabled={availableCategories.length === 0}
              >
                <Plus className="size-4" />
                Buat Budget Pertama
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {overview.budgets.map((budget) => (
            <li key={budget.id}>
              <button
                type="button"
                onClick={() => {
                  setEditing(budget)
                  setSheetOpen(true)
                }}
                className="card-surface hover:bg-muted/30 w-full p-4 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <IconBadge name={budget.categoryIcon} color={budget.categoryColor} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{budget.categoryName}</p>
                    <p className="text-muted-foreground tabular text-xs">
                      {formatCurrency(budget.spent)} dari {formatCurrency(budget.amount)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "tabular shrink-0 text-sm font-semibold",
                      BUDGET_TEXT_COLORS[budget.status],
                      budget.status === "ok" && "text-foreground"
                    )}
                  >
                    {Math.round(budget.ratio * 100)}%
                  </span>
                </div>

                <BudgetBar ratio={budget.ratio} status={budget.status} className="mt-3" />

                <p className={cn("mt-2 text-xs", BUDGET_TEXT_COLORS[budget.status])}>
                  {budget.remaining >= 0
                    ? `Sisa ${formatCurrency(budget.remaining)}`
                    : `Lewat ${formatCurrency(Math.abs(budget.remaining))}`}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {overview.unbudgeted.some((row) => row.spent > 0) ? (
        <section className="space-y-3">
          <h2 className="text-muted-foreground text-sm font-semibold">Belum dibatasi</h2>
          <ul className="card-surface divide-border divide-y overflow-hidden">
            {overview.unbudgeted
              .filter((row) => row.spent > 0)
              .map((row) => (
                <li key={row.categoryId} className="flex items-center gap-3 px-4 py-3">
                  <IconBadge name={row.icon} color={row.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="text-muted-foreground tabular text-xs">
                      Terpakai {formatCurrency(row.spent)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-field"
                    onClick={() => {
                      setEditing(null)
                      setSheetOpen(true)
                    }}
                  >
                    Atur
                  </Button>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      <BudgetFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        period={overview.period}
        budget={editing}
        categories={availableCategories}
        suggestions={suggestions}
      />
    </div>
  )
}
