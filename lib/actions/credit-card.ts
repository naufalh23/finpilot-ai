"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionError, actionOk, type ActionResult } from "@/lib/actions/types"

const creditCardSchema = z.object({
  name: z.string().trim().min(1, "Nama kartu wajib diisi").max(60),
  issuer: z.string().trim().min(1, "Penerbit wajib diisi").max(60),
  last4: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Harus 4 digit")
    .nullable()
    .optional()
    .or(z.literal("")),
  creditLimit: z.number().positive("Limit harus lebih dari 0").max(1_000_000_000_000),
  /** Existing debt at the time the card is added. */
  currentOutstanding: z.number().min(0).max(1_000_000_000_000).default(0),
  billingDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  reminderDays: z.number().int().min(0).max(30).default(5),
  color: z.string().max(20).nullable().optional(),
})

function revalidateViews() {
  revalidatePath("/commitments")
  revalidatePath("/dashboard")
  revalidatePath("/wallet")
}

/**
 * A credit card is a wallet plus billing metadata, so charges and payments flow
 * through the normal transaction system. Both rows are created together.
 */
export async function createCreditCard(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const parsed = creditCardSchema.safeParse(input)

  if (!parsed.success) {
    return actionError("Data kartu tidak valid", parsed.error.flatten().fieldErrors)
  }

  const data = parsed.data
  const sortOrder = await prisma.wallet.count({ where: { userId: user.id } })

  const card = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.create({
      data: {
        userId: user.id,
        name: data.name,
        type: "CREDIT_CARD",
        // Debt is a negative balance, mirroring how charges reduce it.
        openingBalance: -data.currentOutstanding,
        institution: data.issuer,
        color: data.color || null,
        icon: "CreditCard",
        sortOrder,
      },
    })

    return tx.creditCard.create({
      data: {
        userId: user.id,
        walletId: wallet.id,
        issuer: data.issuer,
        last4: data.last4 || null,
        creditLimit: data.creditLimit,
        billingDay: data.billingDay,
        dueDay: data.dueDay,
        reminderDays: data.reminderDays,
      },
    })
  })

  revalidateViews()
  return actionOk({ id: card.id })
}

export async function updateCreditCard(id: string, input: unknown): Promise<ActionResult<void>> {
  const user = await requireUser()
  const parsed = creditCardSchema.safeParse(input)

  if (!parsed.success) {
    return actionError("Data kartu tidak valid", parsed.error.flatten().fieldErrors)
  }

  const data = parsed.data
  const card = await prisma.creditCard.findFirst({ where: { id, userId: user.id } })

  if (!card) return actionError("Kartu tidak ditemukan")

  await prisma.$transaction([
    prisma.creditCard.update({
      where: { id },
      data: {
        issuer: data.issuer,
        last4: data.last4 || null,
        creditLimit: data.creditLimit,
        billingDay: data.billingDay,
        dueDay: data.dueDay,
        reminderDays: data.reminderDays,
      },
    }),
    // The opening balance is deliberately not touched here: it would rewrite
    // history. Adjust outstanding by recording a transaction instead.
    prisma.wallet.update({
      where: { id: card.walletId },
      data: { name: data.name, institution: data.issuer, color: data.color || null },
    }),
  ])

  revalidateViews()
  return actionOk()
}

export async function deleteCreditCard(id: string): Promise<ActionResult<void>> {
  const user = await requireUser()

  const card = await prisma.creditCard.findFirst({
    where: { id, userId: user.id },
    include: {
      wallet: { include: { _count: { select: { transactions: true, transfersIn: true } } } },
    },
  })

  if (!card) return actionError("Kartu tidak ditemukan")

  if (card.wallet._count.transactions > 0 || card.wallet._count.transfersIn > 0) {
    return actionError(
      "Kartu ini masih memiliki transaksi. Arsipkan wallet-nya daripada menghapus."
    )
  }

  // Deleting the wallet cascades to the credit card row.
  await prisma.wallet.delete({ where: { id: card.walletId } })

  revalidateViews()
  return actionOk()
}

/**
 * Records a bill payment as a transfer from a funding wallet into the card,
 * which reduces the outstanding balance.
 */
export async function payCreditCard(
  id: string,
  fromWalletId: string,
  amount: number
): Promise<ActionResult<void>> {
  const user = await requireUser()

  if (!(amount > 0)) return actionError("Nominal harus lebih dari 0")

  const [card, source] = await Promise.all([
    prisma.creditCard.findFirst({ where: { id, userId: user.id } }),
    prisma.wallet.findFirst({ where: { id: fromWalletId, userId: user.id } }),
  ])

  if (!card) return actionError("Kartu tidak ditemukan")
  if (!source) return actionError("Wallet sumber tidak ditemukan")
  if (source.id === card.walletId) return actionError("Wallet sumber harus berbeda dari kartu")

  await prisma.transaction.create({
    data: {
      userId: user.id,
      type: "TRANSFER",
      status: "COMPLETED",
      date: new Date(),
      amount,
      walletId: fromWalletId,
      toWalletId: card.walletId,
      notes: "Pembayaran tagihan kartu kredit",
    },
  })

  revalidateViews()
  return actionOk()
}
