import "server-only"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { endOfDay, endOfMonth, startOfDay, startOfMonth, toNumber } from "@/lib/format"

export type ReportPreset = "week" | "month" | "year" | "custom"

export type ReportRange = {
  preset: ReportPreset
  from: Date
  to: Date
  label: string
  /** Bucket size for the trend series, derived from the range length. */
  granularity: "day" | "week" | "month"
}

const MONTH_FORMAT = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" })
const DAY_FORMAT = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" })
const DAY_YEAR_FORMAT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

/** Monday-based week start, matching Indonesian calendar convention. */
function startOfWeek(date: Date) {
  const result = startOfDay(date)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  return result
}

/**
 * Resolves the report window from URL parameters. `offset` steps backwards
 * (-1) or forwards (+1) through periods so the user can page through history
 * without picking dates.
 */
export function resolveReportRange(params: {
  preset?: string
  from?: string
  to?: string
  offset?: string
}): ReportRange {
  const preset = (["week", "month", "year", "custom"] as const).includes(
    params.preset as ReportPreset
  )
    ? (params.preset as ReportPreset)
    : "month"

  const offset = Number.parseInt(params.offset ?? "0", 10) || 0
  const now = new Date()

  if (preset === "custom") {
    const parsedFrom = params.from ? new Date(`${params.from}T00:00:00`) : null
    const parsedTo = params.to ? new Date(`${params.to}T00:00:00`) : null

    const first = parsedFrom && !Number.isNaN(parsedFrom.getTime()) ? parsedFrom : startOfMonth(now)
    const second = parsedTo && !Number.isNaN(parsedTo.getTime()) ? parsedTo : now

    // Order the two dates first, then widen to whole days. Swapping already
    // normalised bounds would leave the window starting at 23:59 and ending at
    // 00:00, quietly clipping a day off each end.
    const [earlier, later] = first <= second ? [first, second] : [second, first]
    const start = startOfDay(earlier)
    const end = endOfDay(later)

    return {
      preset,
      from: start,
      to: end,
      label: `${DAY_YEAR_FORMAT.format(start)} – ${DAY_YEAR_FORMAT.format(end)}`,
      granularity: granularityFor(start, end),
    }
  }

  if (preset === "week") {
    const base = new Date(now)
    base.setDate(base.getDate() + offset * 7)
    const from = startOfWeek(base)
    const to = endOfDay(new Date(from.getFullYear(), from.getMonth(), from.getDate() + 6))

    return {
      preset,
      from,
      to,
      label: `${DAY_FORMAT.format(from)} – ${DAY_YEAR_FORMAT.format(to)}`,
      granularity: "day",
    }
  }

  if (preset === "year") {
    const year = now.getFullYear() + offset
    return {
      preset,
      from: new Date(year, 0, 1, 0, 0, 0, 0),
      to: new Date(year, 11, 31, 23, 59, 59, 999),
      label: String(year),
      granularity: "month",
    }
  }

  const base = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  return {
    preset: "month",
    from: startOfMonth(base),
    to: endOfMonth(base),
    label: MONTH_FORMAT.format(base),
    granularity: "day",
  }
}

function granularityFor(from: Date, to: Date): ReportRange["granularity"] {
  const days = Math.ceil((to.getTime() - from.getTime()) / 86_400_000)
  if (days <= 45) return "day"
  if (days <= 200) return "week"
  return "month"
}

export type ReportSummary = {
  income: number
  expense: number
  net: number
  savingRate: number
  transactionCount: number
  /** Mean expense per day across the whole window, not just days with spending. */
  averageDailyExpense: number
  largestExpense: { amount: number; label: string; date: string } | null
}

export type TrendPoint = { label: string; income: number; expense: number }
export type BreakdownRow = { id: string; name: string; total: number; share: number; color: string | null; icon: string | null }
export type MerchantRow = { merchant: string; total: number; count: number }

export type ReportData = {
  summary: ReportSummary
  trend: TrendPoint[]
  categories: BreakdownRow[]
  wallets: BreakdownRow[]
  merchants: MerchantRow[]
}

export async function getReport(range: ReportRange): Promise<ReportData> {
  const user = await requireUser()
  const where = { userId: user.id, date: { gte: range.from, lte: range.to } }

  const [totals, count, rows, categories, wallets, merchants, largest] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["type"],
      where: { ...where, type: { in: ["INCOME", "EXPENSE"] } },
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where: { ...where, type: { in: ["INCOME", "EXPENSE"] } },
      select: { date: true, amount: true, type: true },
      orderBy: { date: "asc" },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { ...where, type: "EXPENSE" },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["walletId"],
      where: { ...where, type: "EXPENSE" },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["merchant"],
      where: { ...where, type: "EXPENSE", merchant: { not: null } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.transaction.findFirst({
      where: { ...where, type: "EXPENSE" },
      orderBy: { amount: "desc" },
      select: {
        amount: true,
        date: true,
        merchant: true,
        category: { select: { name: true } },
      },
    }),
  ])

  const income = toNumber(totals.find((row) => row.type === "INCOME")?._sum.amount)
  const expense = toNumber(totals.find((row) => row.type === "EXPENSE")?._sum.amount)

  const days = Math.max(
    1,
    Math.ceil((range.to.getTime() - range.from.getTime()) / 86_400_000)
  )

  const [categoryRows, walletRows] = await Promise.all([
    resolveCategoryNames(categories),
    resolveWalletNames(wallets),
  ])

  return {
    summary: {
      income,
      expense,
      net: income - expense,
      savingRate: income > 0 ? (income - expense) / income : 0,
      transactionCount: count,
      averageDailyExpense: Math.round(expense / days),
      largestExpense: largest
        ? {
            amount: toNumber(largest.amount),
            label: largest.merchant || largest.category?.name || "Tanpa nama",
            date: largest.date.toISOString(),
          }
        : null,
    },
    trend: buildTrend(rows, range),
    categories: categoryRows,
    wallets: walletRows,
    merchants: merchants
      .map((row) => ({
        merchant: row.merchant as string,
        total: toNumber(row._sum.amount),
        count: row._count._all,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
  }
}

async function resolveCategoryNames(
  rows: { categoryId: string | null; _sum: { amount: unknown } }[]
): Promise<BreakdownRow[]> {
  const ids = rows.map((row) => row.categoryId).filter((id): id is string => Boolean(id))

  const categories = ids.length
    ? await prisma.category.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, color: true, icon: true },
      })
    : []

  const byId = new Map(categories.map((category) => [category.id, category]))
  const totals = rows.map((row) => ({
    id: row.categoryId ?? "none",
    name: row.categoryId ? (byId.get(row.categoryId)?.name ?? "Lainnya") : "Tanpa kategori",
    color: row.categoryId ? (byId.get(row.categoryId)?.color ?? null) : null,
    icon: row.categoryId ? (byId.get(row.categoryId)?.icon ?? null) : null,
    total: toNumber(row._sum.amount as never),
  }))

  return withShares(totals)
}

async function resolveWalletNames(
  rows: { walletId: string; _sum: { amount: unknown } }[]
): Promise<BreakdownRow[]> {
  const ids = rows.map((row) => row.walletId)

  const wallets = ids.length
    ? await prisma.wallet.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, color: true, icon: true },
      })
    : []

  const byId = new Map(wallets.map((wallet) => [wallet.id, wallet]))
  const totals = rows.map((row) => ({
    id: row.walletId,
    name: byId.get(row.walletId)?.name ?? "Wallet",
    color: byId.get(row.walletId)?.color ?? null,
    icon: byId.get(row.walletId)?.icon ?? null,
    total: toNumber(row._sum.amount as never),
  }))

  return withShares(totals)
}

function withShares(rows: Omit<BreakdownRow, "share">[]): BreakdownRow[] {
  const grand = rows.reduce((sum, row) => sum + row.total, 0)

  return rows
    .map((row) => ({ ...row, share: grand > 0 ? row.total / grand : 0 }))
    .sort((a, b) => b.total - a.total)
}

function buildTrend(
  rows: { date: Date; amount: unknown; type: string }[],
  range: ReportRange
): TrendPoint[] {
  const buckets = new Map<string, TrendPoint>()
  const keyOf = (date: Date) => {
    if (range.granularity === "month") return `${date.getFullYear()}-${date.getMonth()}`
    if (range.granularity === "week") {
      const start = startOfWeek(date)
      return `${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`
    }
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  }

  // Pre-seed every bucket so gaps render as zero instead of collapsing the axis.
  const cursor = new Date(range.from)
  while (cursor <= range.to) {
    const key = keyOf(cursor)

    if (!buckets.has(key)) {
      buckets.set(key, { label: labelFor(cursor, range.granularity), income: 0, expense: 0 })
    }

    if (range.granularity === "month") cursor.setMonth(cursor.getMonth() + 1)
    else if (range.granularity === "week") cursor.setDate(cursor.getDate() + 7)
    else cursor.setDate(cursor.getDate() + 1)
  }

  for (const row of rows) {
    const bucket = buckets.get(keyOf(row.date))
    if (!bucket) continue

    const amount = toNumber(row.amount as never)
    if (row.type === "INCOME") bucket.income += amount
    else bucket.expense += amount
  }

  return [...buckets.values()]
}

function labelFor(date: Date, granularity: ReportRange["granularity"]) {
  if (granularity === "month") {
    return new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date)
  }
  return DAY_FORMAT.format(date)
}
