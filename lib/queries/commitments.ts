import "server-only"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { startOfDay, toNumber } from "@/lib/format"
import type {
  Frequency,
  LoanType,
  SubscriptionStatus,
  TransactionType,
} from "@/lib/generated/prisma/enums"
import { getWallets } from "@/lib/queries/wallets"

const DAY_MS = 86_400_000

/**
 * Resolves a day-of-month to a real date, clamping to the last day when the
 * month is short — a card that bills on the 31st still bills in February.
 */
export function dayOfMonthDate(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, lastDay), 0, 0, 0, 0)
}

/** The next occurrence of `day` on or after today. */
export function nextMonthlyDate(day: number, from = new Date()) {
  const today = startOfDay(from)
  const thisMonth = dayOfMonthDate(today.getFullYear(), today.getMonth(), day)

  if (thisMonth >= today) return thisMonth

  return dayOfMonthDate(today.getFullYear(), today.getMonth() + 1, day)
}

export function daysUntil(date: Date, from = new Date()) {
  return Math.round((startOfDay(date).getTime() - startOfDay(from).getTime()) / DAY_MS)
}

/** Advances a billing date by one cycle, preserving the day of month. */
export function advanceByFrequency(date: Date, frequency: Frequency, interval = 1) {
  const next = new Date(date)

  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + interval)
      break
    case "WEEKLY":
      next.setDate(next.getDate() + 7 * interval)
      break
    case "YEARLY":
      // 29 Feb has no counterpart in a common year; clamp to 28 Feb rather
      // than letting it spill into March.
      return dayOfMonthDate(date.getFullYear() + interval, date.getMonth(), date.getDate())
    default: {
      // setMonth would roll 31 Jan + 1 month into 3 Mar; clamp instead.
      const target = new Date(date.getFullYear(), date.getMonth() + interval, 1)
      return dayOfMonthDate(target.getFullYear(), target.getMonth(), date.getDate())
    }
  }

  return next
}

/** Monthly-equivalent cost, so cycles can be compared on one axis. */
export function monthlyEquivalent(price: number, cycle: Frequency) {
  switch (cycle) {
    case "DAILY":
      return price * 30
    case "WEEKLY":
      return (price * 52) / 12
    case "YEARLY":
      return price / 12
    default:
      return price
  }
}

export type SubscriptionSummary = {
  id: string
  name: string
  price: number
  currency: string
  billingCycle: Frequency
  nextBillingDate: string
  daysUntil: number
  autoRenew: boolean
  reminderDays: number
  status: SubscriptionStatus
  icon: string | null
  color: string | null
  walletId: string | null
  walletName: string | null
  categoryId: string | null
  monthlyEquivalent: number
  isDue: boolean
}

export async function getSubscriptions(userId?: string): Promise<SubscriptionSummary[]> {
  const resolvedUserId = userId ?? (await requireUser()).id

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: resolvedUserId },
    include: { wallet: { select: { id: true, name: true } } },
    orderBy: [{ status: "asc" }, { nextBillingDate: "asc" }],
  })

  return subscriptions.map((subscription) => {
    const price = toNumber(subscription.price)
    const remaining = daysUntil(subscription.nextBillingDate)

    return {
      id: subscription.id,
      name: subscription.name,
      price,
      currency: subscription.currency,
      billingCycle: subscription.billingCycle,
      nextBillingDate: subscription.nextBillingDate.toISOString(),
      daysUntil: remaining,
      autoRenew: subscription.autoRenew,
      reminderDays: subscription.reminderDays,
      status: subscription.status,
      icon: subscription.icon,
      color: subscription.color,
      walletId: subscription.walletId,
      walletName: subscription.wallet?.name ?? null,
      categoryId: subscription.categoryId,
      monthlyEquivalent: Math.round(monthlyEquivalent(price, subscription.billingCycle)),
      isDue: subscription.status === "ACTIVE" && remaining <= subscription.reminderDays,
    }
  })
}

export type CreditCardSummary = {
  id: string
  walletId: string
  name: string
  issuer: string
  last4: string | null
  creditLimit: number
  /** Positive amount owed. A card wallet holds a negative balance. */
  outstanding: number
  available: number
  utilisation: number
  billingDay: number
  dueDay: number
  reminderDays: number
  nextDueDate: string
  daysUntilDue: number
  isDue: boolean
  color: string | null
  icon: string | null
}

export async function getCreditCards(userId?: string): Promise<CreditCardSummary[]> {
  const resolvedUserId = userId ?? (await requireUser()).id

  const [cards, wallets] = await Promise.all([
    prisma.creditCard.findMany({
      where: { userId: resolvedUserId },
      include: { wallet: { select: { id: true, name: true, color: true, icon: true } } },
      orderBy: { createdAt: "asc" },
    }),
    getWallets({ includeArchived: true, userId: resolvedUserId }),
  ])

  const balanceByWallet = new Map(wallets.map((wallet) => [wallet.id, wallet.balance]))

  return cards.map((card) => {
    const balance = balanceByWallet.get(card.walletId) ?? 0
    // Spending pushes the wallet negative; that debt is the outstanding bill.
    const outstanding = Math.max(0, -balance)
    const creditLimit = toNumber(card.creditLimit)
    const due = nextMonthlyDate(card.dueDay)
    const remaining = daysUntil(due)

    return {
      id: card.id,
      walletId: card.walletId,
      name: card.wallet.name,
      issuer: card.issuer,
      last4: card.last4,
      creditLimit,
      outstanding,
      available: Math.max(0, creditLimit - outstanding),
      utilisation: creditLimit > 0 ? outstanding / creditLimit : 0,
      billingDay: card.billingDay,
      dueDay: card.dueDay,
      reminderDays: card.reminderDays,
      nextDueDate: due.toISOString(),
      daysUntilDue: remaining,
      isDue: outstanding > 0 && remaining <= card.reminderDays,
      color: card.wallet.color,
      icon: card.wallet.icon,
    }
  })
}

export type LoanSummary = {
  id: string
  name: string
  type: LoanType
  lender: string | null
  principal: number
  remainingBalance: number
  installment: number
  interestRate: number | null
  tenorMonths: number | null
  dueDay: number
  nextDueDate: string
  daysUntilDue: number
  paidRatio: number
  /** Installments left at the current balance, rounded up. */
  remainingInstallments: number | null
  isActive: boolean
  walletId: string | null
}

export async function getLoans(userId?: string): Promise<LoanSummary[]> {
  const resolvedUserId = userId ?? (await requireUser()).id

  const loans = await prisma.loan.findMany({
    where: { userId: resolvedUserId },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  })

  return loans.map((loan) => {
    const principal = toNumber(loan.principal)
    const remaining = toNumber(loan.remainingBalance)
    const installment = toNumber(loan.installment)
    const due = nextMonthlyDate(loan.dueDay)

    return {
      id: loan.id,
      name: loan.name,
      type: loan.type,
      lender: loan.lender,
      principal,
      remainingBalance: remaining,
      installment,
      interestRate: loan.interestRate,
      tenorMonths: loan.tenorMonths,
      dueDay: loan.dueDay,
      nextDueDate: due.toISOString(),
      daysUntilDue: daysUntil(due),
      paidRatio: principal > 0 ? Math.min(1, Math.max(0, (principal - remaining) / principal)) : 0,
      remainingInstallments: installment > 0 ? Math.ceil(remaining / installment) : null,
      isActive: loan.isActive,
      walletId: loan.walletId,
    }
  })
}

export type RecurringSummary = {
  id: string
  name: string
  type: TransactionType
  amount: number
  walletId: string
  walletName: string
  categoryId: string | null
  categoryName: string | null
  categoryIcon: string | null
  categoryColor: string | null
  frequency: Frequency
  interval: number
  startDate: string
  endDate: string | null
  nextRunAt: string
  daysUntil: number
  lastRunAt: string | null
  autoCreate: boolean
  isActive: boolean
  /** Active, manual (autoCreate=false), and due soon — needs the user to confirm. */
  isDue: boolean
  notes: string | null
}

export async function getRecurringTransactions(userId?: string): Promise<RecurringSummary[]> {
  const resolvedUserId = userId ?? (await requireUser()).id

  const recurrings = await prisma.recurringTransaction.findMany({
    where: { userId: resolvedUserId },
    include: {
      wallet: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, icon: true, color: true } },
    },
    orderBy: [{ isActive: "desc" }, { nextRunAt: "asc" }],
  })

  return recurrings.map((recurring) => {
    const remaining = daysUntil(recurring.nextRunAt)

    return {
      id: recurring.id,
      name: recurring.name,
      type: recurring.type,
      amount: toNumber(recurring.amount),
      walletId: recurring.walletId,
      walletName: recurring.wallet.name,
      categoryId: recurring.categoryId,
      categoryName: recurring.category?.name ?? null,
      categoryIcon: recurring.category?.icon ?? null,
      categoryColor: recurring.category?.color ?? null,
      frequency: recurring.frequency,
      interval: recurring.interval,
      startDate: recurring.startDate.toISOString(),
      endDate: recurring.endDate?.toISOString() ?? null,
      nextRunAt: recurring.nextRunAt.toISOString(),
      daysUntil: remaining,
      lastRunAt: recurring.lastRunAt?.toISOString() ?? null,
      autoCreate: recurring.autoCreate,
      isActive: recurring.isActive,
      isDue: recurring.isActive && !recurring.autoCreate && remaining <= 3,
      notes: recurring.notes,
    }
  })
}

export type UpcomingBill = {
  id: string
  kind: "SUBSCRIPTION" | "CREDIT_CARD" | "LOAN" | "RECURRING"
  name: string
  amount: number
  dueDate: string
  daysUntil: number
  color: string | null
  icon: string | null
}

/**
 * Everything with a payment date coming up, merged into one list for the
 * dashboard. Overdue items sort first — they are the most urgent.
 */
export async function getUpcomingBills(withinDays = 14): Promise<UpcomingBill[]> {
  const [subscriptions, cards, loans, recurrings] = await Promise.all([
    getSubscriptions(),
    getCreditCards(),
    getLoans(),
    getRecurringTransactions(),
  ])

  const bills: UpcomingBill[] = []

  for (const subscription of subscriptions) {
    if (subscription.status !== "ACTIVE") continue
    if (subscription.daysUntil > withinDays) continue

    bills.push({
      id: `sub-${subscription.id}`,
      kind: "SUBSCRIPTION",
      name: subscription.name,
      amount: subscription.price,
      dueDate: subscription.nextBillingDate,
      daysUntil: subscription.daysUntil,
      color: subscription.color,
      icon: subscription.icon,
    })
  }

  for (const card of cards) {
    if (card.outstanding <= 0 || card.daysUntilDue > withinDays) continue

    bills.push({
      id: `card-${card.id}`,
      kind: "CREDIT_CARD",
      name: `${card.name} · tagihan`,
      amount: card.outstanding,
      dueDate: card.nextDueDate,
      daysUntil: card.daysUntilDue,
      color: card.color,
      icon: "CreditCard",
    })
  }

  for (const loan of loans) {
    if (!loan.isActive || loan.remainingBalance <= 0 || loan.daysUntilDue > withinDays) continue

    bills.push({
      id: `loan-${loan.id}`,
      kind: "LOAN",
      name: `${loan.name} · cicilan`,
      amount: Math.min(loan.installment, loan.remainingBalance),
      dueDate: loan.nextDueDate,
      daysUntil: loan.daysUntilDue,
      color: null,
      icon: "Landmark",
    })
  }

  // Auto-created recurring entries never need attention here — they just
  // happen. Only manual ones (autoCreate=false) are actionable reminders.
  for (const recurring of recurrings) {
    if (!recurring.isActive || recurring.autoCreate) continue
    if (recurring.daysUntil > withinDays) continue

    bills.push({
      id: `rec-${recurring.id}`,
      kind: "RECURRING",
      name: recurring.name,
      amount: recurring.amount,
      dueDate: recurring.nextRunAt,
      daysUntil: recurring.daysUntil,
      color: recurring.categoryColor,
      icon: recurring.type === "INCOME" ? "TrendingUp" : "ReceiptText",
    })
  }

  return bills.sort((a, b) => a.daysUntil - b.daysUntil)
}
