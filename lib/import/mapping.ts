// Pure logic shared by the server (final validation) and the client (live
// wizard preview), so both stages parse dates/amounts identically — a row
// that looks valid in the preview can never fail differently on commit.

import { FIELD_LIMITS } from "@/lib/validators"

export type TargetField = "date" | "type" | "amount" | "category" | "merchant" | "notes"

export const TARGET_FIELDS: { key: TargetField; label: string; required: boolean }[] = [
  { key: "date", label: "Tanggal", required: true },
  { key: "amount", label: "Jumlah", required: true },
  { key: "type", label: "Jenis (Pemasukan/Pengeluaran)", required: false },
  { key: "category", label: "Kategori", required: false },
  { key: "merchant", label: "Merchant", required: false },
  { key: "notes", label: "Catatan", required: false },
]

/** Column index into the file's rows, or null when a field is left unmapped. */
export type ColumnMapping = Partial<Record<TargetField, number | null>>

const FIELD_ALIASES: Record<TargetField, string[]> = {
  date: ["tanggal", "date", "tgl", "transaction date", "posting date", "waktu"],
  amount: ["jumlah", "amount", "nominal", "value", "total", "harga"],
  type: ["jenis", "type", "tipe", "jenis transaksi"],
  category: ["kategori", "category"],
  merchant: ["merchant", "deskripsi", "description", "keterangan", "nama", "toko"],
  notes: ["catatan", "notes", "note", "memo", "remark", "remarks"],
}

/** Matches file headers against known aliases so most files need zero manual mapping. */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const normalized = headers.map((header) => header.trim().toLowerCase())
  const mapping: ColumnMapping = {}
  const used = new Set<number>()

  for (const field of TARGET_FIELDS) {
    const aliases = FIELD_ALIASES[field.key]
    const index = normalized.findIndex((header, i) => !used.has(i) && aliases.includes(header))

    if (index !== -1) {
      mapping[field.key] = index
      used.add(index)
    } else {
      mapping[field.key] = null
    }
  }

  return mapping
}

export type DateFormat = "DMY" | "MDY" | "YMD"

export const DATE_FORMAT_OPTIONS: { value: DateFormat; label: string }[] = [
  { value: "DMY", label: "HH/BB/TTTT — 31/12/2026" },
  { value: "MDY", label: "BB/HH/TTTT — 12/31/2026" },
  { value: "YMD", label: "TTTT-BB-HH — 2026-12-31" },
]

/** Guesses day-vs-month order from a handful of sample values. Defaults to the Indonesian DMY convention. */
export function detectDateFormat(samples: string[]): DateFormat {
  for (const raw of samples) {
    if (/^\d{4}[/\-.]/.test(raw.trim())) return "YMD"

    const parts = raw.trim().split(/[/\-.]/)
    if (parts.length !== 3) continue

    const first = Number(parts[0])
    const second = Number(parts[1])
    if (Number.isNaN(first) || Number.isNaN(second)) continue

    if (first > 12) return "DMY"
    if (second > 12) return "MDY"
  }

  return "DMY"
}

/** Parses one date cell. Accepts ISO (`YYYY-MM-DD`) regardless of `format`, since that's unambiguous. */
export function parseDateValue(raw: string, format: DateFormat): Date | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(trimmed)
  if (iso) {
    const [, y, m, d] = iso
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
    return date.getUTCMonth() === Number(m) - 1 ? date : null
  }

  const parts = trimmed.split(/[/\-. ]/).filter(Boolean)
  if (parts.length !== 3) return null

  const nums = parts.map(Number)
  if (nums.some((n) => Number.isNaN(n))) return null

  let day: number, month: number, year: number
  if (format === "YMD") [year, month, day] = nums
  else if (format === "MDY") [month, day, year] = nums
  else [day, month, year] = nums

  if (year < 100) year += 2000
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  const date = new Date(Date.UTC(year, month - 1, day))
  // Rejects roll-overs like 31 Feb, which Date would otherwise silently bump to March.
  return date.getUTCMonth() === month - 1 ? date : null
}

/**
 * Parses an amount that may use either thousands-separator convention
 * ("1.500.000,50" or "1,500,000.50"). The rightmost `.`/`,` is taken as the
 * decimal separator; the other character is stripped as grouping.
 */
export function parseAmountValue(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const isNegative = /^-/.test(trimmed) || /^\(.*\)$/.test(trimmed)
  let stripped = trimmed.replace(/^[-+]/, "").replace(/[()]/g, "")
  stripped = stripped.replace(/[^\d.,]/g, "")
  if (!stripped) return null

  const lastComma = stripped.lastIndexOf(",")
  const lastDot = stripped.lastIndexOf(".")
  let normalized: string

  if (lastComma > -1 && lastDot > -1) {
    normalized =
      lastComma > lastDot
        ? stripped.replace(/\./g, "").replace(",", ".")
        : stripped.replace(/,/g, "")
  } else if (lastComma > -1) {
    const decimals = stripped.length - lastComma - 1
    normalized = decimals === 2 ? stripped.replace(",", ".") : stripped.replace(/,/g, "")
  } else if (lastDot > -1) {
    const decimals = stripped.length - lastDot - 1
    normalized = decimals === 2 ? stripped : stripped.replace(/\./g, "")
  } else {
    normalized = stripped
  }

  const value = Number(normalized)
  if (!Number.isFinite(value)) return null

  return isNegative ? -value : value
}

const INCOME_ALIASES = ["income", "pemasukan", "masuk", "credit", "kredit", "cr"]
const EXPENSE_ALIASES = ["expense", "pengeluaran", "keluar", "debit", "dr"]

/** Falls back to the amount's sign when the type column is blank or unrecognised. */
export function inferType(rawType: string | null, signedAmount: number): "INCOME" | "EXPENSE" | null {
  if (rawType) {
    const normalized = rawType.trim().toLowerCase()
    if (INCOME_ALIASES.some((alias) => normalized.includes(alias))) return "INCOME"
    if (EXPENSE_ALIASES.some((alias) => normalized.includes(alias))) return "EXPENSE"
  }

  if (signedAmount > 0) return "INCOME"
  if (signedAmount < 0) return "EXPENSE"
  return null
}

export type RowIssue = { level: "error" | "warning"; message: string }

export type PreviewRow = {
  rowNumber: number
  date: Date | null
  dateLabel: string
  type: "INCOME" | "EXPENSE" | null
  amount: number | null
  categoryId: string | null
  categoryName: string | null
  merchant: string | null
  notes: string | null
  issues: RowIssue[]
  included: boolean
}

export function buildPreviewRows({
  rows,
  mapping,
  dateFormat,
  categories,
}: {
  rows: string[][]
  mapping: ColumnMapping
  dateFormat: DateFormat
  categories: { id: string; name: string; type: "INCOME" | "EXPENSE" }[]
}): PreviewRow[] {
  const cell = (row: string[], field: TargetField) => {
    const index = mapping[field]
    if (index == null) return null
    const value = row[index]?.trim()
    return value ? value : null
  }

  const seen = new Set<string>()

  return rows.map((row, i) => {
    const issues: RowIssue[] = []

    const dateRaw = cell(row, "date")
    const date = dateRaw ? parseDateValue(dateRaw, dateFormat) : null
    if (!dateRaw) issues.push({ level: "error", message: "Tanggal kosong" })
    else if (!date) issues.push({ level: "error", message: `Tanggal "${dateRaw}" tidak dikenali` })

    const amountRaw = cell(row, "amount")
    const signedAmount = amountRaw ? parseAmountValue(amountRaw) : null
    if (!amountRaw) issues.push({ level: "error", message: "Jumlah kosong" })
    else if (signedAmount === null) issues.push({ level: "error", message: `Jumlah "${amountRaw}" tidak dikenali` })
    else if (signedAmount === 0) issues.push({ level: "error", message: "Jumlah nol" })

    const typeRaw = cell(row, "type")
    const type = inferType(typeRaw, signedAmount ?? 0)
    if (!type) issues.push({ level: "error", message: "Jenis tidak bisa ditentukan" })

    const categoryRaw = cell(row, "category")
    let categoryId: string | null = null
    let categoryName: string | null = null

    if (categoryRaw && type) {
      const match = categories.find(
        (category) => category.type === type && category.name.toLowerCase() === categoryRaw.toLowerCase()
      )

      if (match) {
        categoryId = match.id
        categoryName = match.name
      } else {
        issues.push({ level: "warning", message: `Kategori "${categoryRaw}" tidak ditemukan — masuk tanpa kategori` })
      }
    }

    const merchantRaw = cell(row, "merchant")
    const merchant = merchantRaw?.slice(0, FIELD_LIMITS.merchant) ?? null
    if (merchantRaw && merchantRaw.length > FIELD_LIMITS.merchant) {
      issues.push({ level: "warning", message: "Merchant dipotong (terlalu panjang)" })
    }

    const notesRaw = cell(row, "notes")
    const notes = notesRaw?.slice(0, FIELD_LIMITS.notes) ?? null
    if (notesRaw && notesRaw.length > FIELD_LIMITS.notes) {
      issues.push({ level: "warning", message: "Catatan dipotong (terlalu panjang)" })
    }

    const amount = signedAmount === null ? null : Math.abs(signedAmount)

    if (date && amount) {
      const signature = `${date.toISOString().slice(0, 10)}|${amount}|${(merchant ?? "").toLowerCase()}`
      if (seen.has(signature)) {
        issues.push({ level: "warning", message: "Kemungkinan duplikat baris lain di file ini" })
      }
      seen.add(signature)
    }

    return {
      rowNumber: i + 1,
      date,
      dateLabel: dateRaw ?? "",
      type,
      amount,
      categoryId,
      categoryName,
      merchant,
      notes,
      issues,
      included: !issues.some((issue) => issue.level === "error"),
    }
  })
}
