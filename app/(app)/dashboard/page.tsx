import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  PiggyBank,
  TrendingUp,
  Wallet as WalletIcon,
} from "lucide-react"

import { AiInsightCard } from "@/components/dashboard/ai-insight-card"
import { BalanceCard } from "@/components/dashboard/balance-card"
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart"
import { StatCard } from "@/components/dashboard/stat-card"
import { AddTransactionButton } from "@/components/transactions/add-transaction-button"
import { TransactionList } from "@/components/transactions/transaction-list"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"
import {
  endOfMonth,
  formatCurrency,
  formatMonth,
  formatPercent,
  greeting,
  startOfMonth,
} from "@/lib/format"
import { BUDGET_TEXT_COLORS, BudgetBar } from "@/components/budget/budget-bar"
import { IconBadge } from "@/components/shared/icon"
import { UpcomingBills } from "@/components/dashboard/upcoming-bills"
import { getBudgetHighlights } from "@/lib/queries/budgets"
import { getUpcomingBills } from "@/lib/queries/commitments"
import { getDashboardInsight } from "@/lib/queries/insights"
import { cn } from "@/lib/utils"
import {
  getCategoryBreakdown,
  getMonthlyCashFlow,
  getPeriodTotals,
  getTransactions,
} from "@/lib/queries/transactions"
import { getWallets } from "@/lib/queries/wallets"

export const metadata: Metadata = {
  title: "Dashboard",
}

export default async function DashboardPage() {
  const user = await requireUser()

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const [wallets, totals, cashFlow, breakdown, recent, insight, budgets, bills] = await Promise.all([
    getWallets(),
    getPeriodTotals(monthStart, monthEnd),
    getMonthlyCashFlow(6),
    getCategoryBreakdown(monthStart, monthEnd),
    getTransactions({}, { take: 6 }),
    getDashboardInsight(),
    getBudgetHighlights(now),
    getUpcomingBills(14),
  ])

  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0)
  const firstName = user.name?.split(" ")[0]
  const topCategories = breakdown.slice(0, 4)

  return (
    <div className="space-y-6">
      <header>
        <p className="text-muted-foreground text-sm">{greeting()}</p>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {firstName ? `${firstName} 👋` : "Selamat datang 👋"}
        </h1>
      </header>

      {insight ? <AiInsightCard insight={insight} /> : null}

      <BalanceCard total={totalBalance} wallets={wallets} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Pemasukan"
          value={formatCurrency(totals.income)}
          hint={formatMonth(now)}
          icon={ArrowDownLeft}
          tone="income"
        />
        <StatCard
          label="Pengeluaran"
          value={formatCurrency(totals.expense)}
          hint={formatMonth(now)}
          icon={ArrowUpRight}
          tone="expense"
        />
        <StatCard
          label="Cash Flow"
          value={formatCurrency(totals.cashFlow)}
          hint={totals.cashFlow >= 0 ? "Surplus bulan ini" : "Defisit bulan ini"}
          icon={TrendingUp}
        />
        <StatCard
          label="Saving Rate"
          value={formatPercent(totals.savingRate)}
          hint={
            totals.income > 0 ? "Dari pemasukan bulan ini" : "Belum ada pemasukan bulan ini"
          }
          icon={PiggyBank}
          tone="ai"
        />
      </section>

      <section className="card-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Cash Flow</h2>
            <p className="text-muted-foreground text-xs">6 bulan terakhir</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span className="bg-success size-2 rounded-full" />
              Masuk
            </span>
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span className="bg-danger size-2 rounded-full" />
              Keluar
            </span>
          </div>
        </div>
        <CashFlowChart data={cashFlow} />
      </section>

      {bills.length > 0 ? <UpcomingBills bills={bills} /> : null}

      {budgets.items.length > 0 ? (
        <section className="card-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Budget Progress</h2>
              <p className="text-muted-foreground tabular text-xs">
                {formatCurrency(budgets.totalSpent)} dari {formatCurrency(budgets.totalBudget)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-field"
              render={<Link href="/budget" />}
            >
              Kelola
              <ChevronRight className="size-3.5" />
            </Button>
          </div>

          <ul className="space-y-4">
            {budgets.items.map((budget) => (
              <li key={budget.id}>
                <div className="mb-2 flex items-center gap-2.5">
                  <IconBadge
                    name={budget.categoryIcon}
                    color={budget.categoryColor}
                    size="sm"
                    className="size-7 rounded-[9px]"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{budget.categoryName}</span>
                  <span
                    className={cn(
                      "tabular shrink-0 text-xs font-semibold",
                      BUDGET_TEXT_COLORS[budget.status],
                      budget.status === "ok" && "text-foreground"
                    )}
                  >
                    {Math.round(budget.ratio * 100)}%
                  </span>
                </div>
                <BudgetBar ratio={budget.ratio} status={budget.status} />
              </li>
            ))}
          </ul>

          {budgets.total > budgets.items.length ? (
            <p className="text-muted-foreground mt-3.5 text-xs">
              +{budgets.total - budgets.items.length} budget lainnya
            </p>
          ) : null}
        </section>
      ) : null}

      {topCategories.length > 0 ? (
        <section className="card-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Pengeluaran Terbesar</h2>
              <p className="text-muted-foreground text-xs">{formatMonth(now)}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-field"
              render={<Link href="/reports" />}
            >
              Laporan
              <ChevronRight className="size-3.5" />
            </Button>
          </div>

          <ul className="space-y-3.5">
            {topCategories.map((row) => (
              <li key={row.categoryId ?? "none"}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm">{row.name}</span>
                  <span className="tabular text-muted-foreground shrink-0 text-xs">
                    {formatCurrency(row.total)} · {Math.round(row.share * 100)}%
                  </span>
                </div>
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(row.share * 100, 2)}%`,
                      backgroundColor: row.color ?? "var(--primary)",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Transaksi Terakhir</h2>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-field"
            render={<Link href="/transactions" />}
          >
            Lihat semua
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
        <TransactionList transactions={recent.items} showDayHeadings={false} />
      </section>

      {wallets.length === 0 ? (
        <section className="card-surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
          <span className="bg-primary/12 text-primary flex size-10 shrink-0 items-center justify-center rounded-[12px]">
            <WalletIcon className="size-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium">Belum ada wallet</p>
            <p className="text-muted-foreground text-sm">
              Tambahkan wallet dulu agar transaksi bisa dicatat.
            </p>
          </div>
          <Button className="h-11 rounded-field" render={<Link href="/wallet" />}>
            Buat Wallet
          </Button>
        </section>
      ) : (
        <section className="flex justify-center lg:hidden">
          <AddTransactionButton label="Tambah Transaksi" variant="outline" className="h-11" />
        </section>
      )}
    </div>
  )
}
