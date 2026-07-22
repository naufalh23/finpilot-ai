"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionError, actionOk, type ActionResult } from "@/lib/actions/types"
import { advanceByFrequency } from "@/lib/queries/commitments"

const recurringSchema = z
  .object({
    name: z.string().trim().min(1, "Nama wajib diisi").max(60),
    // Recurring definitions have no `toWalletId`, so unlike a one-off
    // transaction they can only be an income or an expense.
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z.number().positive("Jumlah harus lebih dari 0").max(1_000_000_000_000),
    walletId: z.string().min(1, "Wallet wajib dipilih"),
    categoryId: z.string().nullable().optional(),
    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
    interval: z.number().int().min(1, "Minimal 1").max(365).default(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullable().optional(),
    autoCreate: z.boolean().default(true),
    notes: z.string().trim().max(300).nullable().optional(),
  })
  .refine((value) => !value.endDate || value.endDate >= value.startDate, {
    message: "Tanggal berakhir harus setelah tanggal mulai",
    path: ["endDate"],
  })

function revalidateViews() {
  revalidatePath("/commitments")
  revalidatePath("/dashboard")
  revalidatePath("/transactions")
}

export async function upsertRecurring(
  input: unknown,
  id?: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const parsed = recurringSchema.safeParse(input)

  if (!parsed.success) {
    return actionError("Data tidak valid", parsed.error.flatten().fieldErrors)
  }

  const data = parsed.data

  const [wallet, category] = await Promise.all([
    prisma.wallet.count({ where: { id: data.walletId, userId: user.id } }),
    data.categoryId
      ? prisma.category.count({ where: { id: data.categoryId, userId: user.id } })
      : Promise.resolve(1),
  ])

  if (wallet !== 1 || category !== 1) {
    return actionError("Wallet atau kategori tidak ditemukan")
  }

  const payload = {
    name: data.name,
    type: data.type,
    amount: data.amount,
    walletId: data.walletId,
    categoryId: data.categoryId || null,
    frequency: data.frequency,
    interval: data.interval,
    startDate: data.startDate,
    endDate: data.endDate || null,
    autoCreate: data.autoCreate,
    notes: data.notes || null,
  }

  if (id) {
    const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId: user.id } })
    if (!existing) return actionError("Data berulang tidak ditemukan")

    // If the schedule was pushed further into the future, re-anchor the next
    // run to it. Otherwise leave the current cycle's nextRunAt alone so an
    // already-pending occurrence isn't silently reset by an unrelated edit.
    const nextRunAt = data.startDate > existing.nextRunAt ? data.startDate : existing.nextRunAt

    await prisma.recurringTransaction.update({
      where: { id },
      data: { ...payload, nextRunAt },
    })

    revalidateViews()
    return actionOk({ id })
  }

  const created = await prisma.recurringTransaction.create({
    data: { ...payload, userId: user.id, nextRunAt: data.startDate },
  })

  revalidateViews()
  return actionOk({ id: created.id })
}

export async function setRecurringActive(id: string, isActive: boolean): Promise<ActionResult<void>> {
  const user = await requireUser()

  const { count } = await prisma.recurringTransaction.updateMany({
    where: { id, userId: user.id },
    data: { isActive },
  })

  if (count === 0) return actionError("Data berulang tidak ditemukan")

  revalidateViews()
  return actionOk()
}

export async function deleteRecurring(id: string): Promise<ActionResult<void>> {
  const user = await requireUser()

  // Transactions keep their own data when the recurring definition is
  // removed (onDelete: SetNull on Transaction.recurringId), so this is safe
  // without the "still has transactions" guard used for wallets/categories.
  const { count } = await prisma.recurringTransaction.deleteMany({ where: { id, userId: user.id } })

  if (count === 0) return actionError("Data berulang tidak ditemukan")

  revalidateViews()
  return actionOk()
}

/**
 * Records the currently-due occurrence right now and advances the schedule by
 * one cycle. Used for the "Catat Sekarang" action on manual (autoCreate=false)
 * recurring entries.
 */
export async function runRecurringNow(id: string): Promise<ActionResult<void>> {
  const user = await requireUser()

  const recurring = await prisma.recurringTransaction.findFirst({ where: { id, userId: user.id } })

  if (!recurring) return actionError("Data berulang tidak ditemukan")
  if (!recurring.isActive) return actionError("Data berulang ini sedang dijeda")

  const nextRunAt = advanceByFrequency(recurring.nextRunAt, recurring.frequency, recurring.interval)
  const stillActive = !recurring.endDate || nextRunAt <= recurring.endDate

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId: user.id,
        type: recurring.type,
        status: "COMPLETED",
        date: recurring.nextRunAt,
        amount: recurring.amount,
        walletId: recurring.walletId,
        categoryId: recurring.categoryId,
        merchant: recurring.name,
        notes: recurring.notes,
        recurringId: recurring.id,
      },
    }),
    prisma.recurringTransaction.update({
      where: { id },
      data: { lastRunAt: recurring.nextRunAt, nextRunAt, isActive: stillActive },
    }),
  ])

  revalidateViews()
  return actionOk()
}
