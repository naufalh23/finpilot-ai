"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionError, actionOk, type ActionResult } from "@/lib/actions/types"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { uploadAvatarFile } from "@/lib/supabase/storage"
import { FIELD_LIMITS, passwordSchema } from "@/lib/validators"

const nameSchema = z.string().trim().min(1, "Nama wajib diisi").max(FIELD_LIMITS.profileName)

export async function updateProfileName(input: unknown): Promise<ActionResult<void>> {
  const user = await requireUser()
  const parsed = nameSchema.safeParse(input)

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Nama tidak valid")
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ data: { full_name: parsed.data } })
  if (error) return actionError("Gagal memperbarui nama")

  await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data } })

  revalidatePath("/", "layout")
  return actionOk()
}

/**
 * Also used by `/reset-password` after a recovery link lands the visitor in
 * an authenticated (but password-forgotten) session — same operation either
 * way, `supabase.auth.updateUser` doesn't distinguish "change" from "set new".
 */
export async function updatePassword(input: unknown): Promise<ActionResult<void>> {
  await requireUser()
  const parsed = z.object({ password: passwordSchema }).safeParse(input)

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Password tidak valid")
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) return actionError("Gagal mengubah password. Coba lagi.")

  return actionOk()
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"]

export async function updateAvatar(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const user = await requireUser()

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return actionError("File tidak ditemukan")
  if (file.size > MAX_AVATAR_BYTES) return actionError("Ukuran file maksimal 2 MB")
  if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) return actionError("Format tidak didukung. Gunakan JPG, PNG, atau WEBP.")

  let publicUrl: string
  try {
    publicUrl = await uploadAvatarFile({ userId: user.id, file })
  } catch {
    return actionError("Gagal mengunggah foto. Coba lagi.")
  }

  const supabase = await createSupabaseServerClient()
  await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
  await prisma.user.update({ where: { id: user.id }, data: { image: publicUrl } })

  revalidatePath("/", "layout")
  return actionOk({ url: publicUrl })
}
