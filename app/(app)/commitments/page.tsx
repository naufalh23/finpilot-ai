import type { Metadata } from "next"
import Link from "next/link"

import { CreditCardTab } from "@/components/commitments/credit-card-tab"
import { LoanTab } from "@/components/commitments/loan-tab"
import { RecurringTab } from "@/components/commitments/recurring-tab"
import { SubscriptionTab } from "@/components/commitments/subscription-tab"
import { PageHeader } from "@/components/shared/page-header"
import { getCategories } from "@/lib/queries/categories"
import {
  getCreditCards,
  getLoans,
  getRecurringTransactions,
  getSubscriptions,
} from "@/lib/queries/commitments"
import { getWallets } from "@/lib/queries/wallets"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Komitmen",
}

const TABS = [
  { value: "subscription", label: "Langganan" },
  { value: "card", label: "Kartu Kredit" },
  { value: "loan", label: "Pinjaman" },
  { value: "recurring", label: "Berulang" },
] as const

type Tab = (typeof TABS)[number]["value"]

export default async function CommitmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>
}) {
  const params = await searchParams
  const raw = Array.isArray(params.tab) ? params.tab[0] : params.tab
  const tab: Tab = TABS.some((item) => item.value === raw) ? (raw as Tab) : "subscription"

  const [subscriptions, cards, loans, recurrings, wallets, categories] = await Promise.all([
    getSubscriptions(),
    getCreditCards(),
    getLoans(),
    getRecurringTransactions(),
    getWallets(),
    getCategories(),
  ])

  // Badge counts make it obvious which tab needs attention without opening it.
  const counts: Record<Tab, number> = {
    subscription: subscriptions.filter((item) => item.isDue).length,
    card: cards.filter((item) => item.isDue).length,
    loan: loans.filter((item) => item.isActive && item.daysUntilDue <= 5).length,
    recurring: recurrings.filter((item) => item.isDue).length,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Komitmen"
        description="Langganan, kartu kredit, pinjaman, dan transaksi berulang — semua yang menagih rutin."
      />

      <div className="bg-muted flex gap-1 overflow-x-auto rounded-field p-1">
        {TABS.map((item) => (
          <Link
            key={item.value}
            href={`/commitments?tab=${item.value}`}
            scroll={false}
            className={cn(
              "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[9px] px-2 text-xs font-medium whitespace-nowrap transition-colors",
              tab === item.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
            {counts[item.value] > 0 ? (
              <span className="bg-warning/15 text-warning flex size-4 items-center justify-center rounded-full text-[10px] font-semibold">
                {counts[item.value]}
              </span>
            ) : null}
          </Link>
        ))}
      </div>

      {tab === "subscription" ? (
        <SubscriptionTab
          subscriptions={subscriptions}
          wallets={wallets}
          categories={categories}
        />
      ) : null}
      {tab === "card" ? <CreditCardTab cards={cards} wallets={wallets} /> : null}
      {tab === "loan" ? <LoanTab loans={loans} wallets={wallets} /> : null}
      {tab === "recurring" ? (
        <RecurringTab recurrings={recurrings} wallets={wallets} categories={categories} />
      ) : null}
    </div>
  )
}
