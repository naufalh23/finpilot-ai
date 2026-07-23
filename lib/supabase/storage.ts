import "server-only"

import { randomUUID } from "crypto"
import { createClient } from "@supabase/supabase-js"

import { SUPABASE_URL } from "@/lib/supabase/env"

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "receipts"

export const isStorageConfigured = Boolean(SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

/**
 * Service-role client for Storage only — every caller in this file already
 * runs behind `requireUser()`, so bucket access doesn't need per-user RLS
 * policies. Never reused for anything beyond Storage operations.
 */
function getStorageClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPABASE_URL || !serviceKey) {
    throw new Error("Supabase Storage belum dikonfigurasi.")
  }

  return createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function uploadReceiptFile(params: {
  userId: string
  transactionId: string
  file: File
}): Promise<{ storagePath: string }> {
  const client = getStorageClient()
  const ext = params.file.name.split(".").pop() || "bin"
  const storagePath = `${params.userId}/${params.transactionId}/${randomUUID()}.${ext}`

  const { error } = await client.storage.from(BUCKET).upload(storagePath, params.file, {
    contentType: params.file.type,
    upsert: false,
  })

  if (error) throw error

  return { storagePath }
}

/** Bucket is private — every view goes through a freshly minted, time-limited URL. */
export async function getReceiptSignedUrl(storagePath: string, expiresIn = 3600): Promise<string | null> {
  const client = getStorageClient()
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(storagePath, expiresIn)

  if (error || !data) return null

  return data.signedUrl
}

export async function deleteReceiptFile(storagePath: string): Promise<void> {
  const client = getStorageClient()
  await client.storage.from(BUCKET).remove([storagePath])
}
