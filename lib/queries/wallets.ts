import "server-only"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { toNumber } from "@/lib/format"
import type { WalletType } from "@/lib/generated/prisma/enums"

export type WalletSummary = {
  id: string
  name: string
  type: WalletType
  currency: string
  color: string | null
  icon: string | null
  institution: string | null
  isArchived: boolean
  openingBalance: number
  /** openingBalance + income - expense + transfers in - transfers out */
  balance: number
  transactionCount: number
}

/**
 * Wallet balances are derived, never stored, so an edited or deleted
 * transaction can never leave a stale balance behind.
 */
export async function getWallets({
  includeArchived = false,
  userId,
}: { includeArchived?: boolean; userId?: string } = {}): Promise<WalletSummary[]> {
  // A caller acting on behalf of a specific user (the notification generator
  // iterating all accounts) passes userId directly; a page rendering for the
  // signed-in visitor omits it and falls back to the session.
  const resolvedUserId = userId ?? (await requireUser()).id

  const [wallets, byWallet, transfersIn] = await Promise.all([
    prisma.wallet.findMany({
      where: { userId: resolvedUserId, ...(includeArchived ? {} : { isArchived: false }) },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.transaction.groupBy({
      by: ["walletId", "type"],
      where: { userId: resolvedUserId },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.transaction.groupBy({
      by: ["toWalletId"],
      where: { userId: resolvedUserId, type: "TRANSFER", toWalletId: { not: null } },
      _sum: { amount: true },
    }),
  ])

  const inbound = new Map(
    transfersIn.map((row) => [row.toWalletId as string, toNumber(row._sum.amount)])
  )

  const delta = new Map<string, number>()
  const counts = new Map<string, number>()

  for (const row of byWallet) {
    const amount = toNumber(row._sum.amount)
    // Both EXPENSE and the outgoing leg of a TRANSFER leave the wallet.
    const signed = row.type === "INCOME" ? amount : -amount
    delta.set(row.walletId, (delta.get(row.walletId) ?? 0) + signed)
    counts.set(row.walletId, (counts.get(row.walletId) ?? 0) + row._count._all)
  }

  return wallets.map((wallet) => {
    const opening = toNumber(wallet.openingBalance)
    const movement = (delta.get(wallet.id) ?? 0) + (inbound.get(wallet.id) ?? 0)

    return {
      id: wallet.id,
      name: wallet.name,
      type: wallet.type,
      currency: wallet.currency,
      color: wallet.color,
      icon: wallet.icon,
      institution: wallet.institution,
      isArchived: wallet.isArchived,
      openingBalance: opening,
      balance: opening + movement,
      transactionCount: counts.get(wallet.id) ?? 0,
    }
  })
}

export async function getTotalBalance() {
  const wallets = await getWallets()
  // Credit cards carry a negative balance (debt); they still net into the total.
  return wallets.reduce((total, wallet) => total + wallet.balance, 0)
}
