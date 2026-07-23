import "server-only"

import { Type } from "@google/genai"

import { GEMINI_MODEL, getGemini, parseJsonResponse } from "@/lib/ai/gemini"

export const DATE_RANGES = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_year",
  "last_year",
  "none",
] as const

export type SearchDateRange = (typeof DATE_RANGES)[number]

export type SearchIntent = {
  type: "INCOME" | "EXPENSE" | "TRANSFER" | null
  categoryName: string | null
  merchant: string | null
  dateRange: SearchDateRange
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, nullable: true },
    categoryName: { type: Type.STRING, nullable: true },
    merchant: { type: Type.STRING, nullable: true },
    dateRange: { type: Type.STRING },
  },
  required: ["dateRange"],
}

function buildPrompt(query: string, categoryNames: string[]) {
  return `Kamu mengubah query pencarian transaksi keuangan (Bahasa Indonesia atau Inggris) menjadi filter terstruktur.

Query: "${query}"

Kategori yang tersedia — categoryName HARUS persis salah satu nama ini, atau null: ${categoryNames.join(", ") || "(tidak ada)"}

Ekstrak:
- type: "INCOME" untuk pemasukan/gaji/dsb, "EXPENSE" untuk pengeluaran/belanja/beli/bayar, "TRANSFER" untuk transfer antar wallet, null jika tidak disebutkan atau tidak jelas
- categoryName: satu nama dari daftar kategori di atas yang paling cocok dengan maksud query (mis. "makan"/"jajan" → kategori makanan), atau null jika tidak ada yang cocok
- merchant: nama toko/aplikasi/merchant spesifik yang disebutkan (mis. "Grab", "Indomaret", "Tokopedia"), atau null jika tidak disebutkan
- dateRange: salah satu dari "today", "yesterday", "this_week", "last_week", "this_month", "last_month", "this_year", "last_year", "none" — pilih "none" jika tidak ada rentang waktu yang disebutkan di query

Jawab hanya JSON.`
}

/**
 * Turns a free-text query like "pengeluaran makan bulan ini" into structured
 * filters. Date ranges are returned as a relative label, never computed dates
 * — the caller resolves "this_month" etc. against the real current date in
 * plain code, since that arithmetic is not something to trust a model with.
 */
export async function parseSearchIntent(
  query: string,
  categoryNames: string[]
): Promise<SearchIntent | null> {
  const ai = getGemini()

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: buildPrompt(query, categoryNames) }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0,
    },
  })

  const parsed = parseJsonResponse<SearchIntent>(response.text)
  if (!parsed) return null

  const type = parsed.type === "INCOME" || parsed.type === "EXPENSE" || parsed.type === "TRANSFER" ? parsed.type : null
  const dateRange = DATE_RANGES.includes(parsed.dateRange) ? parsed.dateRange : "none"
  // Only trust a category name the model was actually offered — anything else
  // is a hallucinated label that would silently match zero transactions.
  const categoryName =
    typeof parsed.categoryName === "string" && categoryNames.includes(parsed.categoryName)
      ? parsed.categoryName
      : null

  return {
    type,
    categoryName,
    merchant: typeof parsed.merchant === "string" ? parsed.merchant.trim() || null : null,
    dateRange,
  }
}
