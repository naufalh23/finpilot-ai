"use server"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionError, actionOk, type ActionResult } from "@/lib/actions/types"
import { isGeminiConfigured } from "@/lib/ai/gemini"
import { extractReceipt, type ReceiptItem } from "@/lib/ai/receipt"

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]

export type ReceiptDraft = {
  merchant: string | null
  total: number | null
  date: string | null
  items: ReceiptItem[]
  categoryId: string | null
  categoryName: string | null
  confidence: number | null
}

/**
 * Reads an uploaded receipt and returns a transaction draft for the user to
 * confirm. Nothing is written to the database here — confirmation happens in
 * the normal create-transaction flow, so an AI mistake is never silently saved.
 */
export async function scanReceipt(formData: FormData): Promise<ActionResult<ReceiptDraft>> {
  const user = await requireUser()

  if (!isGeminiConfigured) {
    return actionError("GEMINI_API_KEY belum diisi. Scan struk tidak tersedia.")
  }

  const file = formData.get("file")

  if (!(file instanceof File) || file.size === 0) {
    return actionError("File struk tidak ditemukan")
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return actionError("Ukuran file maksimal 8 MB")
  }

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return actionError("Format tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.")
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64")

  let extraction
  try {
    extraction = await extractReceipt(base64, file.type)
  } catch {
    return actionError("Gagal menghubungi AI. Coba lagi sebentar lagi.")
  }

  if (!extraction || (!extraction.total && !extraction.merchant)) {
    return actionError("Struk tidak terbaca. Coba foto yang lebih jelas atau isi manual.")
  }

  // Map the model's free-text hint onto a category this user actually has.
  let categoryId: string | null = null
  let categoryName: string | null = null

  if (extraction.categoryHint) {
    const match = await prisma.category.findFirst({
      where: {
        userId: user.id,
        type: "EXPENSE",
        isArchived: false,
        name: { equals: extraction.categoryHint, mode: "insensitive" },
      },
      select: { id: true, name: true },
    })

    if (match) {
      categoryId = match.id
      categoryName = match.name
    }
  }

  return actionOk({
    merchant: extraction.merchant,
    total: extraction.total,
    date: extraction.date,
    items: extraction.items,
    categoryId,
    categoryName,
    confidence: extraction.confidence,
  })
}
