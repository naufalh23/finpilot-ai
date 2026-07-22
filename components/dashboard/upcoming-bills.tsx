import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { DueBadge } from "@/components/commitments/due-badge"
import { IconBadge } from "@/components/shared/icon"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/format"
import type { UpcomingBill } from "@/lib/queries/commitments"

const KIND_TABS: Record<UpcomingBill["kind"], string> = {
  SUBSCRIPTION: "subscription",
  CREDIT_CARD: "card",
  LOAN: "loan",
}

export function UpcomingBills({ bills }: { bills: UpcomingBill[] }) {
  const total = bills.reduce((sum, bill) => sum + bill.amount, 0)

  return (
    <section className="card-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Tagihan Mendatang</h2>
          <p className="text-muted-foreground tabular text-xs">
            {bills.length} tagihan · {formatCurrency(total)} dalam 14 hari
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-field"
          render={<Link href="/commitments" />}
        >
          Kelola
          <ChevronRight className="size-3.5" />
        </Button>
      </div>

      <ul className="space-y-3">
        {bills.slice(0, 5).map((bill) => (
          <li key={bill.id}>
            <Link
              href={`/commitments?tab=${KIND_TABS[bill.kind]}`}
              className="hover:bg-muted/40 -mx-2 flex items-center gap-3 rounded-field px-2 py-1.5 transition-colors"
            >
              <IconBadge name={bill.icon ?? "Repeat"} color={bill.color} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{bill.name}</p>
                <DueBadge days={bill.daysUntil} className="mt-1" />
              </div>
              <span className="tabular shrink-0 text-sm font-semibold">
                {formatCurrency(bill.amount)}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {bills.length > 5 ? (
        <p className="text-muted-foreground mt-3 text-xs">+{bills.length - 5} tagihan lainnya</p>
      ) : null}
    </section>
  )
}
