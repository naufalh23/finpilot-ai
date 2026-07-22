"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionError, actionOk, type ActionResult } from "@/lib/actions/types"
import { monthPeriod } from "@/lib/queries/budgets"

const budgetSchema = z.object({
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  period: z.coerce.date(),
  amount: z
    .number({ error: "Nominal wajib diisi" })
    .positive("Nominal harus lebih dari 0")
    .max(1_000_000_000_000),
  alertAt: z.number().int().min(1).max(100).default(90),
})

function revalidateBudgetViews() {
  revalidatePath("/budget")
  revalidatePath("/dashboard")
}

export async function upsertBudget(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const parsed = budgetSchema.safeParse(input)

  if (!parsed.success) {
    return actionError("Data budget tidak valid", parsed.error.flatten().fieldErrors)
  }

  const { categoryId, amount, alertAt } = parsed.data
  const period = monthPeriod(parsed.data.period)

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId: user.id, type: "EXPENSE" },
  })

  if (!category) {
    return actionError("Kategori pengeluaran tidak ditemukan")
  }

  // One budget per category per month — re-submitting simply updates it.
  const budget = await prisma.budget.upsert({
    where: { userId_categoryId_period: { userId: user.id, categoryId, period } },
    create: { userId: user.id, categoryId, period, amount, alertAt },
    update: { amount, alertAt },
  })

  revalidateBudgetViews()
  return actionOk({ id: budget.id })
}

export async function deleteBudget(id: string): Promise<ActionResult<void>> {
  const user = await requireUser()

  const { count } = await prisma.budget.deleteMany({ where: { id, userId: user.id } })

  if (count === 0) return actionError("Budget tidak ditemukan")

  revalidateBudgetViews()
  return actionOk()
}

/**
 * Carries every budget from the previous month into the target month. Existing
 * budgets in the target month are left untouched, so this is safe to re-run.
 */
export async function copyBudgetsFromPreviousMonth(
  targetMonth: string
): Promise<ActionResult<{ copied: number }>> {
  const user = await requireUser()

  const target = monthPeriod(new Date(targetMonth))
  const previous = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() - 1, 1)
  )

  const [source, existing] = await Promise.all([
    prisma.budget.findMany({ where: { userId: user.id, period: previous } }),
    prisma.budget.findMany({
      where: { userId: user.id, period: target },
      select: { categoryId: true },
    }),
  ])

  if (source.length === 0) {
    return actionError("Tidak ada budget di bulan sebelumnya untuk disalin")
  }

  const alreadySet = new Set(existing.map((budget) => budget.categoryId))
  const toCreate = source.filter((budget) => !alreadySet.has(budget.categoryId))

  if (toCreate.length === 0) {
    return actionError("Semua kategori sudah punya budget di bulan ini")
  }

  await prisma.budget.createMany({
    data: toCreate.map((budget) => ({
      userId: user.id,
      categoryId: budget.categoryId,
      period: target,
      amount: budget.amount,
      alertAt: budget.alertAt,
    })),
  })

  revalidateBudgetViews()
  return actionOk({ copied: toCreate.length })
}
