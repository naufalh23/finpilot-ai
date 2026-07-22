"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionError, actionOk, type ActionResult } from "@/lib/actions/types"
import { walletSchema } from "@/lib/validators"

function revalidateWalletViews() {
  revalidatePath("/wallet")
  revalidatePath("/dashboard")
  revalidatePath("/transactions")
}

export async function createWallet(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const parsed = walletSchema.safeParse(input)

  if (!parsed.success) {
    return actionError("Data wallet tidak valid", parsed.error.flatten().fieldErrors)
  }

  const count = await prisma.wallet.count({ where: { userId: user.id } })

  const wallet = await prisma.wallet.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      type: parsed.data.type,
      openingBalance: parsed.data.openingBalance,
      currency: parsed.data.currency,
      institution: parsed.data.institution || null,
      color: parsed.data.color || null,
      icon: parsed.data.icon || null,
      sortOrder: count,
    },
  })

  revalidateWalletViews()
  return actionOk({ id: wallet.id })
}

export async function updateWallet(id: string, input: unknown): Promise<ActionResult<void>> {
  const user = await requireUser()
  const parsed = walletSchema.safeParse(input)

  if (!parsed.success) {
    return actionError("Data wallet tidak valid", parsed.error.flatten().fieldErrors)
  }

  // Scope by userId so a guessed id can't touch another account's wallet.
  const { count } = await prisma.wallet.updateMany({
    where: { id, userId: user.id },
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      openingBalance: parsed.data.openingBalance,
      currency: parsed.data.currency,
      institution: parsed.data.institution || null,
      color: parsed.data.color || null,
      icon: parsed.data.icon || null,
    },
  })

  if (count === 0) return actionError("Wallet tidak ditemukan")

  revalidateWalletViews()
  return actionOk()
}

export async function setWalletArchived(
  id: string,
  isArchived: boolean
): Promise<ActionResult<void>> {
  const user = await requireUser()

  const { count } = await prisma.wallet.updateMany({
    where: { id, userId: user.id },
    data: { isArchived },
  })

  if (count === 0) return actionError("Wallet tidak ditemukan")

  revalidateWalletViews()
  return actionOk()
}

export async function deleteWallet(id: string): Promise<ActionResult<void>> {
  const user = await requireUser()

  const wallet = await prisma.wallet.findFirst({
    where: { id, userId: user.id },
    include: { _count: { select: { transactions: true, transfersIn: true } } },
  })

  if (!wallet) return actionError("Wallet tidak ditemukan")

  // Deleting would cascade away real transactions — archive instead.
  if (wallet._count.transactions > 0 || wallet._count.transfersIn > 0) {
    return actionError(
      "Wallet masih memiliki transaksi. Arsipkan wallet ini daripada menghapusnya."
    )
  }

  await prisma.wallet.delete({ where: { id } })

  revalidateWalletViews()
  return actionOk()
}
