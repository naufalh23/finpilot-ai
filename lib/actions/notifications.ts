"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionError, actionOk, type ActionResult } from "@/lib/actions/types"

export async function markNotificationRead(id: string): Promise<ActionResult<void>> {
  const user = await requireUser()

  await prisma.notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  })

  // The bell lives in the shared shell (sidebar/header), not a single route,
  // so the whole layout segment needs revalidating for the badge to refresh.
  revalidatePath("/", "layout")
  return actionOk()
}

export async function markAllNotificationsRead(): Promise<ActionResult<void>> {
  const user = await requireUser()

  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  })

  revalidatePath("/", "layout")
  return actionOk()
}

export async function deleteNotification(id: string): Promise<ActionResult<void>> {
  const user = await requireUser()

  const { count } = await prisma.notification.deleteMany({ where: { id, userId: user.id } })

  if (count === 0) return actionError("Notifikasi tidak ditemukan")

  revalidatePath("/", "layout")
  return actionOk()
}
