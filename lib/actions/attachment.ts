"use server"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionError, actionOk, type ActionResult } from "@/lib/actions/types"
import { getReceiptSignedUrl, uploadReceiptFile } from "@/lib/supabase/storage"

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]

/**
 * Uploads a receipt to Storage and links it to an already-saved transaction.
 * Called right after `createTransaction` succeeds — never blocks the
 * transaction itself, since the receipt is a nice-to-have on top of it.
 */
export async function uploadReceiptAttachment(
  transactionId: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()

  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId: user.id },
    select: { id: true },
  })
  if (!transaction) return actionError("Transaksi tidak ditemukan")

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return actionError("File tidak ditemukan")
  if (file.size > MAX_UPLOAD_BYTES) return actionError("Ukuran file maksimal 5 MB")
  if (!ACCEPTED_TYPES.includes(file.type)) return actionError("Format tidak didukung")

  let storagePath: string
  try {
    const uploaded = await uploadReceiptFile({ userId: user.id, transactionId, file })
    storagePath = uploaded.storagePath
  } catch {
    return actionError("Gagal mengunggah struk. Coba lagi.")
  }

  const attachment = await prisma.attachment.create({
    data: {
      transactionId,
      storagePath,
      // Kept only as a legible placeholder — real access always goes through
      // a freshly signed URL from storagePath, never this stored value.
      url: storagePath,
      mimeType: file.type,
      size: file.size,
    },
  })

  return actionOk({ id: attachment.id })
}

/** Mints a fresh, time-limited URL for viewing a transaction's receipt. */
export async function getReceiptUrl(
  transactionId: string
): Promise<ActionResult<{ url: string; mimeType: string | null }>> {
  const user = await requireUser()

  const attachment = await prisma.attachment.findFirst({
    where: { transaction: { id: transactionId, userId: user.id } },
    orderBy: { createdAt: "desc" },
  })
  if (!attachment || !attachment.storagePath) return actionError("Struk tidak ditemukan")

  const url = await getReceiptSignedUrl(attachment.storagePath)
  if (!url) return actionError("Gagal memuat struk")

  return actionOk({ url, mimeType: attachment.mimeType })
}
