import "server-only"

import { randomUUID } from "crypto"

import { getSupabaseAdmin } from "@/lib/supabase/admin"
import { SUPABASE_URL } from "@/lib/supabase/env"

const RECEIPTS_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "receipts"
const AVATARS_BUCKET = "avatars"

export const isStorageConfigured = Boolean(SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function uploadReceiptFile(params: {
  userId: string
  transactionId: string
  file: File
}): Promise<{ storagePath: string }> {
  const client = getSupabaseAdmin()
  const ext = params.file.name.split(".").pop() || "bin"
  const storagePath = `${params.userId}/${params.transactionId}/${randomUUID()}.${ext}`

  const { error } = await client.storage.from(RECEIPTS_BUCKET).upload(storagePath, params.file, {
    contentType: params.file.type,
    upsert: false,
  })

  if (error) throw error

  return { storagePath }
}

/** Bucket is private — every view goes through a freshly minted, time-limited URL. */
export async function getReceiptSignedUrl(storagePath: string, expiresIn = 3600): Promise<string | null> {
  const client = getSupabaseAdmin()
  const { data, error } = await client.storage.from(RECEIPTS_BUCKET).createSignedUrl(storagePath, expiresIn)

  if (error || !data) return null

  return data.signedUrl
}

export async function deleteReceiptFile(storagePath: string): Promise<void> {
  const client = getSupabaseAdmin()
  await client.storage.from(RECEIPTS_BUCKET).remove([storagePath])
}

/**
 * Avatars live in a public bucket (unlike receipts) — a profile photo isn't
 * sensitive the way a purchase record is, and it needs to render directly in
 * `<img>` tags across the app without minting a signed URL on every load.
 * A stable per-user path (`upsert: true`) means re-uploading replaces the
 * old file instead of accumulating orphans.
 */
export async function uploadAvatarFile(params: { userId: string; file: File }): Promise<string> {
  const client = getSupabaseAdmin()
  const ext = params.file.name.split(".").pop() || "jpg"
  const storagePath = `${params.userId}/avatar.${ext}`

  const { error } = await client.storage.from(AVATARS_BUCKET).upload(storagePath, params.file, {
    contentType: params.file.type,
    upsert: true,
  })

  if (error) throw error

  const { data } = client.storage.from(AVATARS_BUCKET).getPublicUrl(storagePath)
  // Cache-bust so the new photo shows immediately instead of a stale CDN copy at the same path.
  return `${data.publicUrl}?v=${Date.now()}`
}
