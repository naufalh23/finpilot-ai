import type { Metadata } from "next"

import { BudgetManager } from "@/components/budget/budget-manager"
import { PageHeader } from "@/components/shared/page-header"
import { getBudgetOverview, getBudgetSuggestions } from "@/lib/queries/budgets"

export const metadata: Metadata = {
  title: "Budget",
}

/** Accepts `?month=YYYY-MM`; anything else falls back to the current month. */
function resolveMonth(value: string | undefined) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number)
    if (month >= 1 && month <= 12) return new Date(year, month - 1, 1)
  }

  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>
}) {
  const params = await searchParams
  const raw = Array.isArray(params.month) ? params.month[0] : params.month
  const month = resolveMonth(raw)

  const [overview, suggestions] = await Promise.all([
    getBudgetOverview(month),
    getBudgetSuggestions(month),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget"
        description="Tetapkan batas pengeluaran bulanan per kategori."
      />

      <BudgetManager
        overview={overview}
        month={month.toISOString()}
        suggestions={Object.fromEntries(suggestions)}
      />
    </div>
  )
}
