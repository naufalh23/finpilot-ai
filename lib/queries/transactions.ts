import "server-only"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { toNumber } from "@/lib/format"
import type {
  TransactionStatus,
  TransactionType,
} from "@/lib/generated/prisma/enums"
import type { Prisma } from "@/lib/generated/prisma/client"

export type TransactionListItem = {
  id: string
  type: TransactionType
  status: TransactionStatus
  date: string
  amount: number
  currency: string
  merchant: string | null
  notes: string | null
  aiGenerated: boolean
  wallet: { id: string; name: string; color: string | null }
  toWallet: { id: string; name: string } | null
  category: { id: string; name: string; icon: string | null; color: string | null } | null
  attachmentCount: number
}

export type TransactionFilters = {
  q?: string
  type?: TransactionType
  walletId?: string
  categoryId?: string
  status?: TransactionStatus
  from?: Date
  to?: Date
}

const LIST_INCLUDE = {
  wallet: { select: { id: true, name: true, color: true } },
  toWallet: { select: { id: true, name: true } },
  category: { select: { id: true, name: true, icon: true, color: true } },
  _count: { select: { attachments: true } },
} satisfies Prisma.TransactionInclude

function buildWhere(userId: string, filters: TransactionFilters): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { userId }

  if (filters.type) where.type = filters.type
  if (filters.status) where.status = filters.status
  if (filters.categoryId) where.categoryId = filters.categoryId
  if (filters.walletId) {
    // A transfer shows up in both the source and destination wallet.
    where.OR = [{ walletId: filters.walletId }, { toWalletId: filters.walletId }]
  }
  if (filters.from || filters.to) {
    where.date = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    }
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim()
    where.AND = [
      {
        OR: [
          { merchant: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
          { category: { name: { contains: q, mode: "insensitive" } } },
          { wallet: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
    ]
  }

  return where
}

function serialize(
  transaction: Prisma.TransactionGetPayload<{ include: typeof LIST_INCLUDE }>
): TransactionListItem {
  return {
    id: transaction.id,
    type: transaction.type,
    status: transaction.status,
    date: transaction.date.toISOString(),
    amount: toNumber(transaction.amount),
    currency: transaction.currency,
    merchant: transaction.merchant,
    notes: transaction.notes,
    aiGenerated: transaction.aiGenerated,
    wallet: transaction.wallet,
    toWallet: transaction.toWallet,
    category: transaction.category,
    attachmentCount: transaction._count.attachments,
  }
}

export async function getTransactions(
  filters: TransactionFilters = {},
  { take = 50, skip = 0 }: { take?: number; skip?: number } = {}
) {
  const user = await requireUser()
  const where = buildWhere(user.id, filters)

  const [rows, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: LIST_INCLUDE,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take,
      skip,
    }),
    prisma.transaction.count({ where }),
  ])

  return { items: rows.map(serialize), total, hasMore: skip + rows.length < total }
}

export async function getTransactionById(id: string) {
  const user = await requireUser()

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
    include: { ...LIST_INCLUDE, attachments: true },
  })

  if (!transaction) return null

  return {
    ...serialize(transaction),
    walletId: transaction.walletId,
    toWalletId: transaction.toWalletId,
    categoryId: transaction.categoryId,
    attachments: transaction.attachments.map((attachment) => ({
      id: attachment.id,
      url: attachment.url,
      mimeType: attachment.mimeType,
    })),
  }
}

/** Income/expense totals for an arbitrary window. Transfers are excluded. */
export async function getPeriodTotals(from: Date, to: Date) {
  const user = await requireUser()

  const rows = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId: user.id, date: { gte: from, lte: to }, type: { in: ["INCOME", "EXPENSE"] } },
    _sum: { amount: true },
  })

  const income = toNumber(rows.find((row) => row.type === "INCOME")?._sum.amount)
  const expense = toNumber(rows.find((row) => row.type === "EXPENSE")?._sum.amount)

  return {
    income,
    expense,
    cashFlow: income - expense,
    // Share of income kept. Undefined-safe when there is no income yet.
    savingRate: income > 0 ? (income - expense) / income : 0,
  }
}

export type CategoryBreakdownRow = {
  categoryId: string | null
  name: string
  color: string | null
  icon: string | null
  total: number
  share: number
}

export async function getCategoryBreakdown(
  from: Date,
  to: Date,
  type: TransactionType = "EXPENSE"
): Promise<CategoryBreakdownRow[]> {
  const user = await requireUser()

  const rows = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId: user.id, type, date: { gte: from, lte: to } },
    _sum: { amount: true },
  })

  const categoryIds = rows.map((row) => row.categoryId).filter((id): id is string => Boolean(id))
  const categories = categoryIds.length
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, color: true, icon: true },
      })
    : []
  const byId = new Map(categories.map((category) => [category.id, category]))

  const totals = rows.map((row) => ({
    categoryId: row.categoryId,
    name: row.categoryId ? (byId.get(row.categoryId)?.name ?? "Lainnya") : "Tanpa kategori",
    color: row.categoryId ? (byId.get(row.categoryId)?.color ?? null) : null,
    icon: row.categoryId ? (byId.get(row.categoryId)?.icon ?? null) : null,
    total: toNumber(row._sum.amount),
  }))

  const grandTotal = totals.reduce((sum, row) => sum + row.total, 0)

  return totals
    .map((row) => ({ ...row, share: grandTotal > 0 ? row.total / grandTotal : 0 }))
    .sort((a, b) => b.total - a.total)
}

export type CashFlowPoint = { label: string; date: string; income: number; expense: number }

/**
 * Monthly income/expense series for the cash-flow chart. Aggregated in SQL so
 * the payload stays small no matter how many transactions exist.
 */
export async function getMonthlyCashFlow(months = 6): Promise<CashFlowPoint[]> {
  const user = await requireUser()

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)

  const rows = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      type: { in: ["INCOME", "EXPENSE"] },
      date: { gte: start },
    },
    select: { date: true, amount: true, type: true },
  })

  const buckets = new Map<string, CashFlowPoint>()

  for (let index = 0; index < months; index += 1) {
    const cursor = new Date(start.getFullYear(), start.getMonth() + index, 1)
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}`
    buckets.set(key, {
      label: new Intl.DateTimeFormat("id-ID", { month: "short" }).format(cursor),
      date: cursor.toISOString(),
      income: 0,
      expense: 0,
    })
  }

  for (const row of rows) {
    const key = `${row.date.getFullYear()}-${row.date.getMonth()}`
    const bucket = buckets.get(key)
    if (!bucket) continue

    if (row.type === "INCOME") bucket.income += toNumber(row.amount)
    else bucket.expense += toNumber(row.amount)
  }

  return [...buckets.values()]
}
