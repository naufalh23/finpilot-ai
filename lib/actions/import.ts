"use server"

import { z } from "zod"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionError, actionOk, type ActionResult } from "@/lib/actions/types"
import { revalidateTransactionViews } from "@/lib/actions/revalidate"
import { autoDetectMapping, detectDateFormat, type ColumnMapping, type DateFormat } from "@/lib/import/mapping"
import { ImportParseError, parseImportGrid } from "@/lib/import/parse"
import { FIELD_LIMITS } from "@/lib/validators"

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const ACCEPTED_EXTENSIONS = [".csv", ".xlsx"]

export type ParsedImportFile = {
  headers: string[]
  rows: string[][]
  suggestedMapping: ColumnMapping
  suggestedDateFormat: DateFormat
}

/** Reads an uploaded CSV/XLSX into a grid and a best-guess column mapping. Writes nothing. */
export async function parseImportFile(formData: FormData): Promise<ActionResult<ParsedImportFile>> {
  await requireUser()

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return actionError("File tidak ditemukan")
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return actionError("Ukuran file maksimal 5 MB")
  }

  const name = file.name.toLowerCase()
  if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return actionError("Format tidak didukung. Gunakan CSV atau Excel (.xlsx).")
  }

  try {
    const grid = await parseImportGrid(file)
    const suggestedMapping = autoDetectMapping(grid.headers)

    const dateColumn = suggestedMapping.date
    const samples =
      dateColumn == null
        ? []
        : grid.rows
            .slice(0, 20)
            .map((row) => row[dateColumn])
            .filter((value): value is string => Boolean(value))

    return actionOk({
      headers: grid.headers,
      rows: grid.rows,
      suggestedMapping,
      suggestedDateFormat: detectDateFormat(samples),
    })
  } catch (error) {
    if (error instanceof ImportParseError) return actionError(error.message)
    return actionError("Gagal membaca file. Pastikan formatnya benar.")
  }
}

const commitRowSchema = z.object({
  date: z.coerce.date(),
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.number().positive().max(1_000_000_000_000),
  categoryId: z.string().nullable(),
  merchant: z.string().trim().max(FIELD_LIMITS.merchant).nullable(),
  notes: z.string().trim().max(FIELD_LIMITS.notes).nullable(),
})

const commitInputSchema = z.object({
  walletId: z.string().min(1, "Wallet wajib dipilih"),
  rows: z.array(commitRowSchema).min(1, "Tidak ada baris valid untuk diimpor").max(2000),
})

/** Bulk-inserts the rows the wizard already validated, re-checking ownership server-side. */
export async function commitImport(input: unknown): Promise<ActionResult<{ created: number }>> {
  const user = await requireUser()
  const parsed = commitInputSchema.safeParse(input)

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Data import tidak valid")
  }

  const { walletId, rows } = parsed.data

  const wallet = await prisma.wallet.findFirst({ where: { id: walletId, userId: user.id } })
  if (!wallet) return actionError("Wallet tidak ditemukan")

  const categoryIds = [...new Set(rows.map((row) => row.categoryId).filter((id): id is string => Boolean(id)))]

  if (categoryIds.length > 0) {
    const owned = await prisma.category.count({ where: { userId: user.id, id: { in: categoryIds } } })
    if (owned !== categoryIds.length) return actionError("Ada kategori yang tidak valid")
  }

  await prisma.transaction.createMany({
    data: rows.map((row) => ({
      userId: user.id,
      type: row.type,
      status: "COMPLETED" as const,
      date: row.date,
      amount: row.amount,
      walletId,
      categoryId: row.categoryId,
      merchant: row.merchant || null,
      notes: row.notes || null,
      aiGenerated: false,
    })),
  })

  revalidateTransactionViews()
  return actionOk({ created: rows.length })
}
