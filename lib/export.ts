import "server-only"

import ExcelJS from "exceljs"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { toNumber } from "@/lib/format"

export type ExportRow = {
  Tanggal: string
  Jenis: string
  Status: string
  Jumlah: number
  Wallet: string
  "Wallet Tujuan": string
  Kategori: string
  Merchant: string
  Catatan: string
  "Dibuat AI": string
}

const TYPE_LABELS: Record<string, string> = {
  INCOME: "Pemasukan",
  EXPENSE: "Pengeluaran",
  TRANSFER: "Transfer",
}

const COLUMNS: { key: keyof ExportRow; width: number }[] = [
  { key: "Tanggal", width: 12 },
  { key: "Jenis", width: 14 },
  { key: "Status", width: 12 },
  { key: "Jumlah", width: 16 },
  { key: "Wallet", width: 18 },
  { key: "Wallet Tujuan", width: 18 },
  { key: "Kategori", width: 18 },
  { key: "Merchant", width: 22 },
  { key: "Catatan", width: 30 },
  { key: "Dibuat AI", width: 10 },
]

export async function getExportRows(from: Date, to: Date): Promise<ExportRow[]> {
  const user = await requireUser()

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: from, lte: to } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: {
      wallet: { select: { name: true } },
      toWallet: { select: { name: true } },
      category: { select: { name: true } },
    },
  })

  return transactions.map((transaction) => ({
    // ISO date keeps spreadsheet sorting correct regardless of locale.
    Tanggal: transaction.date.toISOString().slice(0, 10),
    Jenis: TYPE_LABELS[transaction.type] ?? transaction.type,
    Status: transaction.status === "COMPLETED" ? "Selesai" : "Pending",
    Jumlah: toNumber(transaction.amount),
    Wallet: transaction.wallet.name,
    "Wallet Tujuan": transaction.toWallet?.name ?? "",
    Kategori: transaction.category?.name ?? "",
    Merchant: transaction.merchant ?? "",
    Catatan: transaction.notes ?? "",
    "Dibuat AI": transaction.aiGenerated ? "Ya" : "Tidak",
  }))
}

/**
 * RFC 4180 escaping. A leading =, +, - or @ is prefixed with a quote so a
 * merchant name can't be interpreted as a formula when opened in Excel.
 */
export function csvCell(value: string | number) {
  if (typeof value === "number") return String(value)

  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value

  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded
}

export function toCsv(rows: ExportRow[]) {
  const headers = COLUMNS.map((column) => column.key)
  const lines = [headers.join(",")]

  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header])).join(","))
  }

  // BOM so Excel opens UTF-8 names (e.g. "Kopi Kenangan") correctly.
  return `﻿${lines.join("\r\n")}\r\n`
}

export function toJson(rows: ExportRow[]) {
  return JSON.stringify(rows, null, 2)
}

export async function toXlsx(rows: ExportRow[], sheetName = "Transaksi") {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "FinPilot AI"
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(sheetName)

  sheet.columns = COLUMNS.map((column) => ({
    header: column.key,
    key: column.key,
    width: column.width,
  }))

  sheet.getRow(1).font = { bold: true }
  sheet.views = [{ state: "frozen", ySplit: 1 }]

  for (const row of rows) {
    sheet.addRow(row)
  }

  sheet.getColumn("Jumlah").numFmt = '#,##0;[Red]-#,##0'
  sheet.autoFilter = { from: "A1", to: { row: 1, column: COLUMNS.length } }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
