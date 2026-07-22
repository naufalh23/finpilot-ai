import "server-only"

import { Type } from "@google/genai"

import { GEMINI_MODEL, getGemini, parseJsonResponse } from "@/lib/ai/gemini"

export type ReceiptItem = {
  name: string
  quantity: number | null
  price: number | null
}

export type ReceiptExtraction = {
  merchant: string | null
  /** Grand total in the smallest whole currency unit (rupiah). */
  total: number | null
  /** ISO date (YYYY-MM-DD) as printed on the receipt, or null if unreadable. */
  date: string | null
  items: ReceiptItem[]
  /** Free-text category hint, matched against the user's categories later. */
  categoryHint: string | null
  confidence: number | null
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    merchant: { type: Type.STRING, nullable: true },
    total: { type: Type.NUMBER, nullable: true },
    date: { type: Type.STRING, nullable: true },
    categoryHint: { type: Type.STRING, nullable: true },
    confidence: { type: Type.NUMBER, nullable: true },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          quantity: { type: Type.NUMBER, nullable: true },
          price: { type: Type.NUMBER, nullable: true },
        },
        required: ["name"],
      },
    },
  },
  required: ["merchant", "total", "date", "items"],
}

const PROMPT = `Kamu membaca struk belanja Indonesia.

Ekstrak:
- merchant: nama toko/merchant seperti tertulis, tanpa alamat atau slogan
- total: TOTAL AKHIR yang dibayar, sebagai angka rupiah bulat tanpa titik/koma pemisah.
  Ambil angka setelah diskon dan pajak. Abaikan "subtotal", "kembalian", dan "tunai".
- date: tanggal transaksi dalam format YYYY-MM-DD. Struk Indonesia umumnya DD/MM/YYYY,
  jadi 03/07/2026 berarti 3 Juli 2026. Jika tidak terbaca, null.
- items: daftar barang dengan name, quantity, price (harga total per baris, bukan satuan)
- categoryHint: satu kata kategori pengeluaran yang paling cocok dalam bahasa Inggris,
  pilih dari: Food, Transportation, Shopping, Bills, Entertainment, Health, Education
- confidence: 0 sampai 1, seberapa yakin kamu pada nilai total

Jika gambar bukan struk, kembalikan semua field null dan items kosong.
Jawab hanya JSON.`

/**
 * Reads a receipt image (or PDF) and returns the fields needed to draft a
 * transaction. Never throws on a bad model response — returns null so the
 * caller can fall back to manual entry.
 */
export async function extractReceipt(
  base64Data: string,
  mimeType: string
): Promise<ReceiptExtraction | null> {
  const ai = getGemini()

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [{ inlineData: { data: base64Data, mimeType } }, { text: PROMPT }],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0,
    },
  })

  const parsed = parseJsonResponse<ReceiptExtraction>(response.text)
  if (!parsed) return null

  return {
    merchant: parsed.merchant?.trim() || null,
    // Guard against the model returning a formatted string like "120.000".
    total: normaliseAmount(parsed.total),
    date: normaliseDate(parsed.date),
    items: Array.isArray(parsed.items)
      ? parsed.items.slice(0, 30).map((item) => ({
          name: String(item?.name ?? "").trim(),
          quantity: normaliseAmount(item?.quantity),
          price: normaliseAmount(item?.price),
        }))
      : [],
    categoryHint: parsed.categoryHint?.trim() || null,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : null,
  }
}

function normaliseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value)

  if (typeof value === "string") {
    const digits = value.replace(/[^\d]/g, "")
    if (digits) return Number(digits)
  }

  return null
}

function normaliseDate(value: unknown): string | null {
  if (typeof value !== "string") return null

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null

  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))

  // Reject impossible dates (e.g. 2026-02-31 rolling over into March).
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null
  }

  return `${year}-${month}-${day}`
}
