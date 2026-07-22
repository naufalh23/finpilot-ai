import "server-only"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { formatCurrency } from "@/lib/format"
import { getBudgetOverview } from "@/lib/queries/budgets"
import {
  getCreditCards,
  getLoans,
  getRecurringTransactions,
  getSubscriptions,
} from "@/lib/queries/commitments"
import type { NotificationKind } from "@/lib/generated/prisma/enums"

export type NotificationItem = {
  id: string
  kind: NotificationKind
  title: string
  body: string
  link: string | null
  readAt: string | null
  createdAt: string
}

export async function getNotifications(limit = 30): Promise<NotificationItem[]> {
  const user = await requireUser()

  const rows = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    link: row.link,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }))
}

export async function getUnreadNotificationCount(): Promise<number> {
  const user = await requireUser()
  return prisma.notification.count({ where: { userId: user.id, readAt: null } })
}

export async function getNotificationPreferences(): Promise<{
  notifyBudget: boolean
  notifyBills: boolean
}> {
  const user = await requireUser()

  const settings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
    select: { notifyBudget: true, notifyBills: true },
  })

  // requireUser() bootstraps a UserSettings row on first sight, so this
  // should always exist — the fallback only guards against the edge case.
  return {
    notifyBudget: settings?.notifyBudget ?? true,
    notifyBills: settings?.notifyBills ?? true,
  }
}

function dueSummary(days: number) {
  if (days < 0) return `terlambat ${Math.abs(days)} hari`
  if (days === 0) return "jatuh tempo hari ini"
  if (days === 1) return "besok"
  return `${days} hari lagi`
}

type Candidate = { kind: NotificationKind; title: string; body: string; link: string }

/**
 * Refreshes the reminder list from the current due-state of subscriptions,
 * cards, loans, manual recurring entries, and budgets. Idempotent: the `link`
 * embeds the specific occurrence date, so calling this on every page load
 * never creates a duplicate for the same due date — only a later billing
 * date, or a fresh budget period, produces a new row.
 */
export async function generateNotifications(userId: string): Promise<{ created: number }> {
  const settings = await prisma.userSettings.findUnique({ where: { userId } })
  const notifyBudget = settings?.notifyBudget ?? true
  const notifyBills = settings?.notifyBills ?? true

  if (!notifyBudget && !notifyBills) return { created: 0 }

  const candidates: Candidate[] = []

  if (notifyBills) {
    // Pass userId through explicitly rather than relying on the caller's own
    // session: this function is also called from /api/cron/process, which
    // iterates every account server-to-server and has no Supabase session to
    // fall back on.
    const [subscriptions, cards, loans, recurrings] = await Promise.all([
      getSubscriptions(userId),
      getCreditCards(userId),
      getLoans(userId),
      getRecurringTransactions(userId),
    ])

    for (const subscription of subscriptions) {
      if (!subscription.isDue) continue
      const dateKey = subscription.nextBillingDate.slice(0, 10)

      candidates.push({
        kind: "SUBSCRIPTION",
        title: `${subscription.name} jatuh tempo`,
        body: `${formatCurrency(subscription.price)} · ${dueSummary(subscription.daysUntil)}`,
        link: `/commitments?tab=subscription&ref=sub-${subscription.id}-${dateKey}`,
      })
    }

    for (const card of cards) {
      if (!card.isDue) continue
      const dateKey = card.nextDueDate.slice(0, 10)

      candidates.push({
        kind: "CREDIT_CARD",
        title: `Tagihan ${card.name} jatuh tempo`,
        body: `${formatCurrency(card.outstanding)} · ${dueSummary(card.daysUntilDue)}`,
        link: `/commitments?tab=card&ref=card-${card.id}-${dateKey}`,
      })
    }

    for (const loan of loans) {
      if (!loan.isActive || loan.remainingBalance <= 0 || loan.daysUntilDue > 5) continue
      const dateKey = loan.nextDueDate.slice(0, 10)

      candidates.push({
        kind: "LOAN",
        title: `Cicilan ${loan.name} jatuh tempo`,
        body: `${formatCurrency(Math.min(loan.installment, loan.remainingBalance))} · ${dueSummary(loan.daysUntilDue)}`,
        link: `/commitments?tab=loan&ref=loan-${loan.id}-${dateKey}`,
      })
    }

    for (const recurring of recurrings) {
      if (!recurring.isDue) continue
      const dateKey = recurring.nextRunAt.slice(0, 10)

      candidates.push({
        kind: "RECURRING",
        title: `${recurring.name} perlu dicatat`,
        body: `${formatCurrency(recurring.amount)} · ${dueSummary(recurring.daysUntil)}`,
        link: `/commitments?tab=recurring&ref=rec-${recurring.id}-${dateKey}`,
      })
    }
  }

  if (notifyBudget) {
    const overview = await getBudgetOverview(new Date(), userId)
    const periodKey = overview.period.slice(0, 7)

    for (const budget of overview.budgets) {
      if (budget.status === "ok") continue

      candidates.push({
        kind: "BUDGET",
        title:
          budget.status === "over"
            ? `Budget ${budget.categoryName} terlewati`
            : `Budget ${budget.categoryName} hampir habis`,
        body: `Terpakai ${formatCurrency(budget.spent)} dari ${formatCurrency(budget.amount)} (${Math.round(budget.ratio * 100)}%)`,
        // One notification per budget per month while it stays in an alert
        // state — re-firing daily for an unchanged overage would just be noise.
        link: `/budget?month=${periodKey}&ref=budget-${budget.id}-${periodKey}`,
      })
    }
  }

  if (candidates.length === 0) return { created: 0 }

  const existing = await prisma.notification.findMany({
    where: { userId, link: { in: candidates.map((candidate) => candidate.link) } },
    select: { link: true },
  })
  const existingLinks = new Set(existing.map((row) => row.link))
  const toCreate = candidates.filter((candidate) => !existingLinks.has(candidate.link))

  if (toCreate.length === 0) return { created: 0 }

  await prisma.notification.createMany({
    data: toCreate.map((candidate) => ({
      userId,
      kind: candidate.kind,
      title: candidate.title,
      body: candidate.body,
      link: candidate.link,
    })),
  })

  return { created: toCreate.length }
}
