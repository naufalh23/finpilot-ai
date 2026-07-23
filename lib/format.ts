import type { Decimal } from "@/lib/generated/prisma/internal/prismaNamespace"

/**
 * Prisma returns Decimal instances, which cannot cross the server/client
 * boundary. Every query result is normalised through this before it reaches a
 * component.
 */
export function toNumber(value: Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value)
  return value.toNumber()
}

export function formatCurrency(
  amount: number,
  options: { currency?: string; locale?: string; compact?: boolean; signed?: boolean } = {}
) {
  const { currency = "IDR", locale = "id-ID", compact = false, signed = false } = options

  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    // IDR has no minor unit in practice.
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: compact ? "compact" : "standard",
  }).format(Math.abs(amount))

  if (!signed) return amount < 0 ? `-${formatted}` : formatted
  return `${amount < 0 ? "-" : "+"}${formatted}`
}

export function formatNumber(value: number, locale = "id-ID") {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
}

export function formatPercent(value: number, locale = "id-ID") {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value)
}

const DAY_MS = 24 * 60 * 60 * 1000

/** "Hari ini" / "Kemarin" / "12 Mar 2026" — the transaction list heading. */
export function formatRelativeDay(date: Date, locale = "id-ID") {
  const today = startOfDay(new Date())
  const target = startOfDay(date)
  const diffDays = Math.round((today.getTime() - target.getTime()) / DAY_MS)

  if (diffDays === 0) return "Hari ini"
  if (diffDays === 1) return "Kemarin"
  if (diffDays === -1) return "Besok"

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: target.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(target)
}

export function formatDate(date: Date, locale = "id-ID") {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function formatMonth(date: Date, locale = "id-ID") {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date)
}

export function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

/** Monday-start week, matching the Indonesian convention used elsewhere in the app. */
export function startOfWeek(date: Date) {
  const next = startOfDay(date)
  const day = next.getDay() // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1
  next.setDate(next.getDate() - diff)
  return next
}

export function endOfWeek(date: Date) {
  return endOfDay(addDays(startOfWeek(date), 6))
}

export function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0)
}

export function endOfYear(date: Date) {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999)
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** `<input type="date">` needs a local-time YYYY-MM-DD, not an ISO UTC string. */
export function toDateInputValue(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 11) return "Selamat pagi"
  if (hour < 15) return "Selamat siang"
  if (hour < 19) return "Selamat sore"
  return "Selamat malam"
}
