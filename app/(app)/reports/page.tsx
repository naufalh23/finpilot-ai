import type { Metadata } from "next"
import { Suspense } from "react"
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Receipt, TrendingUp } from "lucide-react"

import { StatCard } from "@/components/dashboard/stat-card"
import { CategoryPie, TrendChart } from "@/components/reports/report-charts"
import { ReportFilters } from "@/components/reports/report-filters"
import { EmptyState } from "@/components/shared/empty-state"
import { IconBadge } from "@/components/shared/icon"
import { PageHeader } from "@/components/shared/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatDate, formatPercent, toDateInputValue } from "@/lib/format"
import { getReport, resolveReportRange } from "@/lib/queries/reports"

export const metadata: Metadata = {
  title: "Laporan",
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const single = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }

  const range = resolveReportRange({
    preset: single("preset"),
    from: single("from"),
    to: single("to"),
    offset: single("offset"),
  })

  const report = await getReport(range)
  const hasData = report.summary.transactionCount > 0

  return (
    <div className="space-y-6">
      <PageHeader title="Laporan" description="Ringkasan keuangan per periode." />

      <Suspense fallback={<Skeleton className="h-24 w-full rounded-card" />}>
        <ReportFilters
          preset={range.preset}
          offset={Number.parseInt(single("offset") ?? "0", 10) || 0}
          label={range.label}
          from={toDateInputValue(range.from)}
          to={toDateInputValue(range.to)}
        />
      </Suspense>

      {!hasData ? (
        <div className="card-surface">
          <EmptyState
            icon={Receipt}
            title="Belum ada transaksi di periode ini."
            description="Pilih periode lain, atau catat transaksi terlebih dahulu."
          />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Pemasukan"
              value={formatCurrency(report.summary.income)}
              icon={ArrowDownLeft}
              tone="income"
            />
            <StatCard
              label="Pengeluaran"
              value={formatCurrency(report.summary.expense)}
              icon={ArrowUpRight}
              tone="expense"
            />
            <StatCard
              label="Selisih"
              value={formatCurrency(report.summary.net)}
              hint={report.summary.net >= 0 ? "Surplus" : "Defisit"}
              icon={TrendingUp}
            />
            <StatCard
              label="Saving Rate"
              value={formatPercent(report.summary.savingRate)}
              hint={`${report.summary.transactionCount} transaksi`}
              icon={PiggyBank}
              tone="ai"
            />
          </section>

          <section className="card-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Tren Arus Kas</h2>
                <p className="text-muted-foreground text-xs">{range.label}</p>
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
            <TrendChart data={report.trend} />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            {report.categories.length > 0 ? (
              <section className="card-surface p-5">
                <h2 className="mb-1 text-sm font-semibold">Pengeluaran per Kategori</h2>
                <p className="text-muted-foreground mb-2 text-xs">
                  Total {formatCurrency(report.summary.expense)}
                </p>
                <CategoryPie data={report.categories} />

                <ul className="mt-4 space-y-3">
                  {report.categories.slice(0, 6).map((row) => (
                    <li key={row.id} className="flex items-center gap-3">
                      <IconBadge name={row.icon} color={row.color} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm">{row.name}</span>
                      <span className="tabular text-muted-foreground shrink-0 text-xs">
                        {formatCurrency(row.total)} · {Math.round(row.share * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="space-y-4">
              {report.wallets.length > 0 ? (
                <section className="card-surface p-5">
                  <h2 className="mb-4 text-sm font-semibold">Pengeluaran per Wallet</h2>
                  <ul className="space-y-3.5">
                    {report.wallets.map((row) => (
                      <li key={row.id}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-3">
                          <span className="min-w-0 truncate text-sm">{row.name}</span>
                          <span className="tabular text-muted-foreground shrink-0 text-xs">
                            {formatCurrency(row.total)}
                          </span>
                        </div>
                        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                          <div
                            className="h-full rounded-full"
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

              {report.merchants.length > 0 ? (
                <section className="card-surface p-5">
                  <h2 className="mb-4 text-sm font-semibold">Merchant Teratas</h2>
                  <ul className="space-y-3">
                    {report.merchants.map((row) => (
                      <li key={row.merchant} className="flex items-center gap-3">
                        <span className="min-w-0 flex-1 truncate text-sm">{row.merchant}</span>
                        <span className="text-muted-foreground shrink-0 text-xs">
                          {row.count}×
                        </span>
                        <span className="tabular shrink-0 text-sm font-medium">
                          {formatCurrency(row.total)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="card-surface space-y-3 p-5">
                <h2 className="text-sm font-semibold">Sorotan</h2>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-muted-foreground text-sm">Rata-rata harian</span>
                  <span className="tabular text-sm font-medium">
                    {formatCurrency(report.summary.averageDailyExpense)}
                  </span>
                </div>
                {report.summary.largestExpense ? (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-muted-foreground min-w-0 truncate text-sm">
                      Terbesar · {report.summary.largestExpense.label}
                    </span>
                    <span className="tabular shrink-0 text-sm font-medium">
                      {formatCurrency(report.summary.largestExpense.amount)}
                    </span>
                  </div>
                ) : null}
                {report.summary.largestExpense ? (
                  <p className="text-muted-foreground text-xs">
                    Tercatat {formatDate(new Date(report.summary.largestExpense.date))}
                  </p>
                ) : null}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
