import { NextResponse, type NextRequest } from "next/server"

import { prisma } from "@/lib/db"
import { generateNotifications } from "@/lib/queries/notifications"
import { processDueRecurring } from "@/lib/recurring/process"

/**
 * Optional production path: without this, recurring transactions and
 * reminders still process the moment someone opens the app (see
 * `app/(app)/layout.tsx`), which is enough for daily personal use. This
 * endpoint exists so a Vercel Cron Job (or any scheduler) can run the same
 * catch-up on a schedule even on days nobody opens the app, so a subscription
 * due while you're on holiday still gets a reminder waiting when you're back.
 *
 * Configure in vercel.json:
 *   { "crons": [{ "path": "/api/cron/process?secret=$CRON_SECRET", "schedule": "0 1 * * *" }] }
 * and set CRON_SECRET in the project's environment variables. Without
 * CRON_SECRET set, this route refuses every request — it is not exposed by
 * default.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET

  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET tidak dikonfigurasi" }, { status: 501 })
  }

  const provided =
    request.nextUrl.searchParams.get("secret") ?? request.headers.get("x-cron-secret")

  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const users = await prisma.user.findMany({ select: { id: true } })

  let recurringCreated = 0
  let notificationsCreated = 0

  for (const user of users) {
    const [recurringResult, notificationResult] = await Promise.all([
      processDueRecurring(user.id),
      generateNotifications(user.id),
    ])

    recurringCreated += recurringResult.created
    notificationsCreated += notificationResult.created
  }

  return NextResponse.json({
    usersProcessed: users.length,
    transactionsCreated: recurringCreated,
    notificationsCreated,
  })
}
