import "server-only"

import ExcelJS from "exceljs"
import Papa from "papaparse"

/** A daily/weekly personal-finance import realistically never approaches this. */
export const MAX_IMPORT_ROWS = 2000

export type ParsedGrid = { headers: string[]; rows: string[][] }

/** Thrown for anything file-shaped-but-wrong — the action layer turns this into a user-facing message. */
export class ImportParseError extends Error {}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ""
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text
    if ("result" in value) return cellToString((value as { result: ExcelJS.CellValue }).result)
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("")
    }
    return ""
  }

  return String(value)
}

async function parseXlsx(buffer: Buffer): Promise<ParsedGrid> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer)

  const sheet = workbook.worksheets[0]
  if (!sheet) throw new ImportParseError("File Excel tidak berisi sheet")

  const rows: string[][] = []
  let headers: string[] = []

  sheet.eachRow((row, rowNumber) => {
    // Row.values is 1-indexed with a leading empty slot — drop it to align with headers[0].
    const values = (row.values as ExcelJS.CellValue[]).slice(1).map(cellToString)

    if (rowNumber === 1) {
      headers = values
    } else if (values.some((value) => value !== "")) {
      rows.push(values)
    }
  })

  return { headers, rows }
}

function parseCsv(text: string): ParsedGrid {
  const result = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: true })

  if (result.data.length === 0) {
    throw new ImportParseError("Gagal membaca CSV")
  }

  const [headers = [], ...rows] = result.data
  return { headers, rows }
}

/** Reads a CSV or XLSX upload into a header row + string grid, with ragged rows padded to header width. */
export async function parseImportGrid(file: File): Promise<ParsedGrid> {
  const isXlsx =
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.name.toLowerCase().endsWith(".xlsx")

  const grid = isXlsx
    ? await parseXlsx(Buffer.from(await file.arrayBuffer()))
    : parseCsv(await file.text())

  if (grid.headers.length === 0) {
    throw new ImportParseError("File kosong atau format tidak dikenali")
  }

  if (grid.rows.length === 0) {
    throw new ImportParseError("Tidak ada baris data di file ini")
  }

  if (grid.rows.length > MAX_IMPORT_ROWS) {
    throw new ImportParseError(
      `File berisi ${grid.rows.length} baris, maksimal ${MAX_IMPORT_ROWS}. Bagi jadi beberapa file.`
    )
  }

  const width = grid.headers.length
  const rows = grid.rows.map((row) => Array.from({ length: width }, (_, i) => row[i] ?? ""))

  return { headers: grid.headers, rows }
}
