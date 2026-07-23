import { NextResponse, type NextRequest } from "next/server"
import ExcelJS from "exceljs"

import { csvCell } from "@/lib/export"

const HEADERS = ["Tanggal", "Jenis", "Jumlah", "Kategori", "Merchant", "Catatan"] as const

const EXAMPLE_ROWS: (string | number)[][] = [
  ["2026-07-01", "Pengeluaran", 50000, "Makanan", "Kopi Kenangan", "Ngopi sore"],
  ["2026-07-01", "Pemasukan", 5000000, "Gaji", "PT Contoh Sejahtera", ""],
]

function buildCsv() {
  const lines = [HEADERS.join(",")]
  for (const row of EXAMPLE_ROWS) lines.push(row.map(csvCell).join(","))
  // BOM so Excel opens UTF-8 names correctly, matching the export template.
  return `﻿${lines.join("\r\n")}\r\n`
}

async function buildXlsx() {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "FinPilot AI"
  workbook.created = new Date()

  const sheet = workbook.addWorksheet("Template")
  sheet.columns = HEADERS.map((header) => ({ header, key: header, width: 20 }))
  sheet.getRow(1).font = { bold: true }

  for (const row of EXAMPLE_ROWS) sheet.addRow(row)

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/** Downloadable starting point for the Import Wizard — same column set the mapping step expects. */
export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv"
  const body = format === "xlsx" ? await buildXlsx() : buildCsv()

  return new NextResponse(body as BodyInit, {
    headers: {
      "Content-Type":
        format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finpilot_template.${format}"`,
      "Cache-Control": "no-store",
    },
  })
}
