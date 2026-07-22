"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionError, actionOk, type ActionResult } from "@/lib/actions/types"

const notificationPreferencesSchema = z.object({
  notifyBudget: z.boolean(),
  notifyBills: z.boolean(),
})

export async function updateNotificationPreferences(input: unknown): Promise<ActionResult<void>> {
  const user = await requireUser()
  const parsed = notificationPreferencesSchema.safeParse(input)

  if (!parsed.success) {
    return actionError("Data tidak valid", parsed.error.flatten().fieldErrors)
  }

  await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  })

  revalidatePath("/settings")
  return actionOk()
}
