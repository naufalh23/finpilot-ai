import { NextResponse, type NextRequest } from "next/server"

import { getExportRows, toCsv, toJson, toXlsx } from "@/lib/export"
import { resolveReportRange } from "@/lib/queries/reports"

const FORMATS = ["csv", "xlsx", "json"] as const
type Format = (typeof FORMATS)[number]

const CONTENT_TYPES: Record<Format, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  json: "application/json; charset=utf-8",
}

/**
 * Downloads the caller's transactions for a report window. Auth is enforced
 * inside `getExportRows` via `requireUser`, and every row is scoped to that
 * user — a crafted range can never reach another account's data.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const format = (params.get("format") ?? "csv") as Format

  if (!FORMATS.includes(format)) {
    return NextResponse.json({ error: "Format tidak didukung" }, { status: 400 })
  }

  const range = resolveReportRange({
    preset: params.get("preset") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    offset: params.get("offset") ?? undefined,
  })

  let rows
  try {
    rows = await getExportRows(range.from, range.to)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const stamp = `${range.from.toISOString().slice(0, 10)}_${range.to.toISOString().slice(0, 10)}`
  const filename = `finpilot_${stamp}.${format}`

  const body =
    format === "xlsx" ? await toXlsx(rows) : format === "json" ? toJson(rows) : toCsv(rows)

  return new NextResponse(body as BodyInit, {
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
