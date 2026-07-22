"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionError, actionOk, type ActionResult } from "@/lib/actions/types"
import { advanceByFrequency } from "@/lib/queries/commitments"

const subscriptionSchema = z.object({
  name: z.string().trim().min(1, "Nama subscription wajib diisi").max(60),
  price: z.number().positive("Harga harus lebih dari 0").max(1_000_000_000_000),
  billingCycle: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  nextBillingDate: z.coerce.date(),
  autoRenew: z.boolean().default(true),
  reminderDays: z.number().int().min(0).max(30).default(3),
  walletId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  icon: z.string().max(40).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  notes: z.string().trim().max(300).nullable().optional(),
})

function revalidateViews() {
  revalidatePath("/commitments")
  revalidatePath("/dashboard")
  revalidatePath("/transactions")
}

/** Verifies optional wallet/category references belong to the caller. */
async function assertOwned(userId: string, walletId?: string | null, categoryId?: string | null) {
  const [wallet, category] = await Promise.all([
    walletId ? prisma.wallet.count({ where: { id: walletId, userId } }) : Promise.resolve(1),
    categoryId ? prisma.category.count({ where: { id: categoryId, userId } }) : Promise.resolve(1),
  ])

  return wallet === 1 && category === 1
}

export async function upsertSubscription(
  input: unknown,
  id?: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const parsed = subscriptionSchema.safeParse(input)

  if (!parsed.success) {
    return actionError("Data subscription tidak valid", parsed.error.flatten().fieldErrors)
  }

  const data = parsed.data

  if (!(await assertOwned(user.id, data.walletId, data.categoryId))) {
    return actionError("Wallet atau kategori tidak ditemukan")
  }

  const payload = {
    name: data.name,
    price: data.price,
    billingCycle: data.billingCycle,
    nextBillingDate: data.nextBillingDate,
    autoRenew: data.autoRenew,
    reminderDays: data.reminderDays,
    walletId: data.walletId || null,
    categoryId: data.categoryId || null,
    icon: data.icon || null,
    color: data.color || null,
    notes: data.notes || null,
  }

  if (id) {
    const { count } = await prisma.subscription.updateMany({
      where: { id, userId: user.id },
      data: payload,
    })

    if (count === 0) return actionError("Subscription tidak ditemukan")

    revalidateViews()
    return actionOk({ id })
  }

  const created = await prisma.subscription.create({
    data: { ...payload, userId: user.id },
  })

  revalidateViews()
  return actionOk({ id: created.id })
}

export async function setSubscriptionStatus(
  id: string,
  status: "ACTIVE" | "PAUSED" | "CANCELLED"
): Promise<ActionResult<void>> {
  const user = await requireUser()

  const { count } = await prisma.subscription.updateMany({
    where: { id, userId: user.id },
    data: { status },
  })

  if (count === 0) return actionError("Subscription tidak ditemukan")

  revalidateViews()
  return actionOk()
}

export async function deleteSubscription(id: string): Promise<ActionResult<void>> {
  const user = await requireUser()

  const { count } = await prisma.subscription.deleteMany({ where: { id, userId: user.id } })

  if (count === 0) return actionError("Subscription tidak ditemukan")

  revalidateViews()
  return actionOk()
}

/**
 * Records this cycle's payment as a real expense and rolls the billing date
 * forward. Without a wallet set there is nothing to charge, so the date is
 * advanced on its own.
 */
export async function paySubscription(id: string): Promise<ActionResult<{ paid: boolean }>> {
  const user = await requireUser()

  const subscription = await prisma.subscription.findFirst({ where: { id, userId: user.id } })

  if (!subscription) return actionError("Subscription tidak ditemukan")

  const nextDate = advanceByFrequency(
    subscription.nextBillingDate,
    subscription.billingCycle
  )

  if (!subscription.walletId) {
    await prisma.subscription.update({
      where: { id },
      data: { nextBillingDate: nextDate },
    })

    revalidateViews()
    return actionOk({ paid: false })
  }

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        userId: user.id,
        type: "EXPENSE",
        status: "COMPLETED",
        date: subscription.nextBillingDate,
        amount: subscription.price,
        currency: subscription.currency,
        walletId: subscription.walletId,
        categoryId: subscription.categoryId,
        merchant: subscription.name,
        notes: "Pembayaran subscription",
        subscriptionId: subscription.id,
      },
    }),
    prisma.subscription.update({
      where: { id },
      data: { nextBillingDate: nextDate },
    }),
  ])

  revalidateViews()
  return actionOk({ paid: true })
}
