import "server-only"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { endOfMonth, startOfMonth, toNumber } from "@/lib/format"

/**
 * Budget periods are keyed by the first day of the month at UTC midnight so the
 * same row is found regardless of the viewer's timezone.
 */
export function monthPeriod(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1))
}

export type BudgetProgress = {
  id: string
  categoryId: string
  categoryName: string
  categoryIcon: string | null
  categoryColor: string | null
  amount: number
  spent: number
  remaining: number
  /** 0..1, uncapped — a value above 1 means the budget is blown. */
  ratio: number
  alertAt: number
  status: "ok" | "warning" | "over"
}

export type BudgetOverview = {
  period: string
  budgets: BudgetProgress[]
  totalBudget: number
  totalSpent: number
  /** Expense categories that have no budget set for this period yet. */
  unbudgeted: { categoryId: string; name: string; icon: string | null; color: string | null; spent: number }[]
}

function statusOf(ratio: number, alertAt: number): BudgetProgress["status"] {
  if (ratio >= 1) return "over"
  if (ratio * 100 >= alertAt) return "warning"
  return "ok"
}

export async function getBudgetOverview(month: Date, userId?: string): Promise<BudgetOverview> {
  const resolvedUserId = userId ?? (await requireUser()).id

  const period = monthPeriod(month)
  const from = startOfMonth(month)
  const to = endOfMonth(month)

  const [budgets, spending, expenseCategories] = await Promise.all([
    prisma.budget.findMany({
      where: { userId: resolvedUserId, period },
      include: { category: { select: { id: true, name: true, icon: true, color: true } } },
      orderBy: { amount: "desc" },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId: resolvedUserId, type: "EXPENSE", date: { gte: from, lte: to } },
      _sum: { amount: true },
    }),
    prisma.category.findMany({
      where: { userId: resolvedUserId, type: "EXPENSE", isArchived: false },
      select: { id: true, name: true, icon: true, color: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ])

  const spentByCategory = new Map(
    spending
      .filter((row): row is typeof row & { categoryId: string } => Boolean(row.categoryId))
      .map((row) => [row.categoryId, toNumber(row._sum.amount)])
  )

  const progress: BudgetProgress[] = budgets.map((budget) => {
    const amount = toNumber(budget.amount)
    const spent = spentByCategory.get(budget.categoryId) ?? 0
    const ratio = amount > 0 ? spent / amount : 0

    return {
      id: budget.id,
      categoryId: budget.categoryId,
      categoryName: budget.category.name,
      categoryIcon: budget.category.icon,
      categoryColor: budget.category.color,
      amount,
      spent,
      remaining: amount - spent,
      ratio,
      alertAt: budget.alertAt,
      status: statusOf(ratio, budget.alertAt),
    }
  })

  const budgetedIds = new Set(budgets.map((budget) => budget.categoryId))

  const unbudgeted = expenseCategories
    .filter((category) => !budgetedIds.has(category.id))
    .map((category) => ({
      categoryId: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      spent: spentByCategory.get(category.id) ?? 0,
    }))
    // Categories with actual spending are the ones worth budgeting first.
    .sort((a, b) => b.spent - a.spent)

  return {
    period: period.toISOString(),
    budgets: progress,
    totalBudget: progress.reduce((sum, row) => sum + row.amount, 0),
    totalSpent: progress.reduce((sum, row) => sum + row.spent, 0),
    unbudgeted,
  }
}

/** Compact version for the dashboard: only budgets that need attention first. */
export async function getBudgetHighlights(month: Date, take = 4) {
  const overview = await getBudgetOverview(month)

  const sorted = [...overview.budgets].sort((a, b) => b.ratio - a.ratio)

  return {
    items: sorted.slice(0, take),
    total: overview.budgets.length,
    totalBudget: overview.totalBudget,
    totalSpent: overview.totalSpent,
  }
}

/**
 * Suggested monthly budget per category: the average of the last three
 * completed months, rounded to the nearest 50k so the number reads like a
 * decision rather than a computation.
 */
export async function getBudgetSuggestions(month: Date) {
  const user = await requireUser()

  const from = startOfMonth(new Date(month.getFullYear(), month.getMonth() - 3, 1))
  const to = endOfMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))

  if (to < from) return new Map<string, number>()

  const rows = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId: user.id, type: "EXPENSE", date: { gte: from, lte: to } },
    _sum: { amount: true },
  })

  const suggestions = new Map<string, number>()

  for (const row of rows) {
    if (!row.categoryId) continue

    const average = toNumber(row._sum.amount) / 3
    if (average <= 0) continue

    suggestions.set(row.categoryId, Math.max(50_000, Math.round(average / 50_000) * 50_000))
  }

  return suggestions
}
