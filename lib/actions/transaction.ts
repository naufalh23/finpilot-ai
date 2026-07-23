"use server"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionError, actionOk, type ActionResult } from "@/lib/actions/types"
import { revalidateTransactionViews } from "@/lib/actions/revalidate"
import { transactionSchema } from "@/lib/validators"

/**
 * Confirms every referenced wallet/category belongs to the caller. Without
 * this, a crafted POST could attach a transaction to someone else's wallet.
 */
async function assertOwnedRefs(
  userId: string,
  refs: { walletId: string; toWalletId?: string | null; categoryId?: string | null }
) {
  const walletIds = [refs.walletId, refs.toWalletId].filter((id): id is string => Boolean(id))

  const [walletCount, categoryCount] = await Promise.all([
    prisma.wallet.count({ where: { userId, id: { in: walletIds } } }),
    refs.categoryId
      ? prisma.category.count({ where: { userId, id: refs.categoryId } })
      : Promise.resolve(1),
  ])

  return walletCount === new Set(walletIds).size && categoryCount === 1
}

export async function createTransaction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const parsed = transactionSchema.safeParse(input)

  if (!parsed.success) {
    return actionError("Data transaksi tidak valid", parsed.error.flatten().fieldErrors)
  }

  const data = parsed.data
  // A transfer moves money between wallets; it has no category.
  const categoryId = data.type === "TRANSFER" ? null : (data.categoryId ?? null)
  const toWalletId = data.type === "TRANSFER" ? data.toWalletId! : null

  if (!(await assertOwnedRefs(user.id, { walletId: data.walletId, toWalletId, categoryId }))) {
    return actionError("Wallet atau kategori tidak ditemukan")
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      type: data.type,
      status: data.status,
      date: data.date,
      amount: data.amount,
      walletId: data.walletId,
      toWalletId,
      categoryId,
      merchant: data.merchant || null,
      notes: data.notes || null,
      aiGenerated: data.aiGenerated,
    },
  })

  revalidateTransactionViews()
  return actionOk({ id: transaction.id })
}

export async function updateTransaction(id: string, input: unknown): Promise<ActionResult<void>> {
  const user = await requireUser()
  const parsed = transactionSchema.safeParse(input)

  if (!parsed.success) {
    return actionError("Data transaksi tidak valid", parsed.error.flatten().fieldErrors)
  }

  const data = parsed.data
  const categoryId = data.type === "TRANSFER" ? null : (data.categoryId ?? null)
  const toWalletId = data.type === "TRANSFER" ? data.toWalletId! : null

  if (!(await assertOwnedRefs(user.id, { walletId: data.walletId, toWalletId, categoryId }))) {
    return actionError("Wallet atau kategori tidak ditemukan")
  }

  const { count } = await prisma.transaction.updateMany({
    where: { id, userId: user.id },
    data: {
      type: data.type,
      status: data.status,
      date: data.date,
      amount: data.amount,
      walletId: data.walletId,
      toWalletId,
      categoryId,
      merchant: data.merchant || null,
      notes: data.notes || null,
    },
  })

  if (count === 0) return actionError("Transaksi tidak ditemukan")

  revalidateTransactionViews()
  return actionOk()
}

export async function deleteTransaction(id: string): Promise<ActionResult<void>> {
  const user = await requireUser()

  const { count } = await prisma.transaction.deleteMany({ where: { id, userId: user.id } })

  if (count === 0) return actionError("Transaksi tidak ditemukan")

  revalidateTransactionViews()
  return actionOk()
}

export async function setTransactionStatus(
  id: string,
  status: "PENDING" | "COMPLETED"
): Promise<ActionResult<void>> {
  const user = await requireUser()

  const { count } = await prisma.transaction.updateMany({
    where: { id, userId: user.id },
    data: { status },
  })

  if (count === 0) return actionError("Transaksi tidak ditemukan")

  revalidateTransactionViews()
  return actionOk()
}
