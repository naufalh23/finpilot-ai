import "server-only"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { toNumber } from "@/lib/format"
import type { InvestmentType } from "@/lib/generated/prisma/enums"

export type InvestmentSummary = {
  id: string
  name: string
  symbol: string | null
  type: InvestmentType
  quantity: number
  buyPrice: number
  currentPrice: number
  currency: string
  buyDate: string
  notes: string | null
  /** buyPrice * quantity — total amount originally put in. */
  costBasis: number
  /** currentPrice * quantity — what the position is worth today. */
  currentValue: number
  profitLoss: number
  /** profitLoss / costBasis, 0 when costBasis is 0. */
  profitLossRatio: number
}

export async function getInvestments(userId?: string): Promise<InvestmentSummary[]> {
  const resolvedUserId = userId ?? (await requireUser()).id

  const investments = await prisma.investment.findMany({
    where: { userId: resolvedUserId },
    orderBy: { createdAt: "desc" },
  })

  const items = investments.map((investment) => {
    const quantity = toNumber(investment.quantity)
    const buyPrice = toNumber(investment.buyPrice)
    const currentPrice = toNumber(investment.currentPrice)
    const costBasis = buyPrice * quantity
    const currentValue = currentPrice * quantity
    const profitLoss = currentValue - costBasis

    return {
      id: investment.id,
      name: investment.name,
      symbol: investment.symbol,
      type: investment.type,
      quantity,
      buyPrice,
      currentPrice,
      currency: investment.currency,
      buyDate: investment.buyDate.toISOString(),
      notes: investment.notes,
      costBasis,
      currentValue,
      profitLoss,
      profitLossRatio: costBasis > 0 ? profitLoss / costBasis : 0,
    }
  })

  // Biggest holdings first — the point of the list is knowing where the money is.
  return items.sort((a, b) => b.currentValue - a.currentValue)
}
