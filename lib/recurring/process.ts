import "server-only"

import { prisma } from "@/lib/db"
import { startOfDay } from "@/lib/format"
import { advanceByFrequency } from "@/lib/queries/commitments"
import type { Prisma } from "@/lib/generated/prisma/client"

/**
 * Caps how many missed cycles a single call will backfill. A daily recurring
 * left unattended for years shouldn't create thousands of rows in one pass —
 * it catches up gradually across visits instead, MAX_CATCH_UP rows at a time.
 */
const MAX_CATCH_UP = 60

/**
 * Creates the real transactions for every recurring definition that is due
 * and set to auto-create, advancing each one to its next occurrence. Safe to
 * call on every page load: a user with nothing due does zero writes.
 */
export async function processDueRecurring(userId: string): Promise<{ created: number }> {
  const today = startOfDay(new Date())

  const due = await prisma.recurringTransaction.findMany({
    where: { userId, isActive: true, autoCreate: true, nextRunAt: { lte: today } },
  })

  if (due.length === 0) return { created: 0 }

  let totalCreated = 0

  for (const recurring of due) {
    // Already past its end date with nothing left to run — retire it.
    if (recurring.endDate && recurring.nextRunAt > recurring.endDate) {
      await prisma.recurringTransaction.update({
        where: { id: recurring.id },
        data: { isActive: false },
      })
      continue
    }

    const rows: Prisma.TransactionCreateManyInput[] = []
    let cursor = recurring.nextRunAt
    let stillActive = true
    let iterations = 0

    while (cursor <= today && iterations < MAX_CATCH_UP) {
      if (recurring.endDate && cursor > recurring.endDate) {
        stillActive = false
        break
      }

      rows.push({
        userId,
        type: recurring.type,
        status: "COMPLETED",
        date: cursor,
        amount: recurring.amount,
        walletId: recurring.walletId,
        categoryId: recurring.categoryId,
        merchant: recurring.name,
        notes: recurring.notes,
        recurringId: recurring.id,
      })

      cursor = advanceByFrequency(cursor, recurring.frequency, recurring.interval)
      iterations++

      // Check right away, not just at the top of the next iteration: when
      // today's occurrence IS the last cycle, the advanced cursor jumps past
      // both `endDate` and `today` in the same step (a monthly cadence moves
      // a whole month), so the `while` condition above would exit the loop
      // before ever re-checking `endDate` — silently leaving the recurring
      // active with no cycles left to run.
      if (recurring.endDate && cursor > recurring.endDate) {
        stillActive = false
      }
    }

    if (rows.length === 0) continue

    const lastDate = rows[rows.length - 1]!.date as Date

    await prisma.$transaction([
      prisma.transaction.createMany({ data: rows }),
      prisma.recurringTransaction.update({
        where: { id: recurring.id },
        data: { nextRunAt: cursor, lastRunAt: lastDate, isActive: stillActive },
      }),
    ])

    totalCreated += rows.length
  }

  return { created: totalCreated }
}
