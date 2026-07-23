"use server"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionError, actionOk, type ActionResult } from "@/lib/actions/types"
import { isGeminiConfigured } from "@/lib/ai/gemini"
import { parseSearchIntent, type SearchDateRange } from "@/lib/ai/search"
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  formatDate,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "@/lib/format"
import type { CategoryType, TransactionType } from "@/lib/generated/prisma/enums"

export type SearchFilters = {
  type: TransactionType | null
  categoryId: string | null
  categoryName: string | null
  merchant: string | null
  from: string | null
  to: string | null
  /** Human-readable summary of what was understood, for the confirmation chip. */
  label: string
}

function resolveDateRange(range: SearchDateRange, now: Date): { from: Date; to: Date } | null {
  switch (range) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) }
    case "yesterday": {
      const day = addDays(now, -1)
      return { from: startOfDay(day), to: endOfDay(day) }
    }
    case "this_week":
      return { from: startOfWeek(now), to: endOfWeek(now) }
    case "last_week": {
      const week = addDays(now, -7)
      return { from: startOfWeek(week), to: endOfWeek(week) }
    }
    case "this_month":
      return { from: startOfMonth(now), to: endOfMonth(now) }
    case "last_month": {
      const month = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return { from: startOfMonth(month), to: endOfMonth(month) }
    }
    case "this_year":
      return { from: startOfYear(now), to: endOfYear(now) }
    case "last_year": {
      const year = new Date(now.getFullYear() - 1, 0, 1)
      return { from: startOfYear(year), to: endOfYear(year) }
    }
    default:
      return null
  }
}

const TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: "Pemasukan",
  EXPENSE: "Pengeluaran",
  TRANSFER: "Transfer",
}

/**
 * Turns a free-text query ("pengeluaran makan bulan ini") into the same
 * filters the manual pills/selects already produce, so the result is a
 * normal filtered URL — nothing about rendering the list needs to know an
 * AI was involved.
 */
export async function parseTransactionSearch(query: string): Promise<ActionResult<SearchFilters>> {
  const user = await requireUser()

  const trimmed = query.trim()
  if (!trimmed) return actionError("Query kosong")
  if (!isGeminiConfigured) return actionError("Pencarian AI belum tersedia")

  const categories = await prisma.category.findMany({
    where: { userId: user.id, isArchived: false },
    select: { id: true, name: true, type: true },
  })

  let intent
  try {
    intent = await parseSearchIntent(
      trimmed,
      categories.map((category) => category.name)
    )
  } catch {
    return actionError("Gagal memproses pencarian. Coba lagi.")
  }

  if (!intent) return actionError("Query tidak dapat dipahami. Coba kata lain.")

  const category = intent.categoryName
    ? categories.find(
        (candidate) =>
          candidate.name === intent!.categoryName &&
          (!intent!.type || matchesTransactionType(candidate.type, intent!.type))
      )
    : undefined

  const range = resolveDateRange(intent.dateRange, new Date())

  const labelParts = [
    intent.type ? TYPE_LABELS[intent.type] : null,
    category?.name ?? null,
    intent.merchant,
    range ? `${formatDate(range.from)}–${formatDate(range.to)}` : null,
  ].filter((part): part is string => Boolean(part))

  return actionOk({
    type: intent.type,
    categoryId: category?.id ?? null,
    categoryName: category?.name ?? null,
    merchant: intent.merchant,
    from: range?.from.toISOString() ?? null,
    to: range?.to.toISOString() ?? null,
    label: labelParts.length > 0 ? labelParts.join(" · ") : "Semua transaksi",
  })
}

function matchesTransactionType(categoryType: CategoryType, transactionType: TransactionType) {
  if (transactionType === "TRANSFER") return true
  return categoryType === transactionType
}
