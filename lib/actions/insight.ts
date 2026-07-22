"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionOk, type ActionResult } from "@/lib/actions/types"

/** Dismissal sticks until the next insight is generated for this user. */
export async function dismissInsight(id: string): Promise<ActionResult<void>> {
  const user = await requireUser()

  await prisma.aiInsight.updateMany({
    where: { id, userId: user.id },
    data: { dismissedAt: new Date() },
  })

  revalidatePath("/dashboard")
  return actionOk()
}
