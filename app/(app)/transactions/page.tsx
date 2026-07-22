import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"

import { PageHeader } from "@/components/shared/page-header"
import { TransactionFilters } from "@/components/transactions/transaction-filters"
import { TransactionList } from "@/components/transactions/transaction-list"
import { AddTransactionButton } from "@/components/transactions/add-transaction-button"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/format"
import type { TransactionStatus, TransactionType } from "@/lib/generated/prisma/enums"
import { getTransactions } from "@/lib/queries/transactions"

export const metadata: Metadata = {
  title: "Transaksi",
}

const PAGE_SIZE = 50

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const single = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }

  const page = Math.max(1, Number(single("page") ?? 1) || 1)

  const { items, total, hasMore } = await getTransactions(
    {
      q: single("q"),
      type: single("type") as TransactionType | undefined,
      status: single("status") as TransactionStatus | undefined,
      walletId: single("wallet"),
      categoryId: single("category"),
    },
    { take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }
  )

  const netTotal = items.reduce((sum, item) => {
    if (item.type === "INCOME") return sum + item.amount
    if (item.type === "EXPENSE") return sum - item.amount
    return sum
  }, 0)

  const buildPageHref = (nextPage: number) => {
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") next.set(key, value)
    }
    next.set("page", String(nextPage))
    return `/transactions?${next.toString()}`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transaksi"
        description={`${total} transaksi tercatat`}
        action={<AddTransactionButton />}
      />

      <Suspense fallback={<Skeleton className="h-28 w-full rounded-card" />}>
        <TransactionFilters />
      </Suspense>

      {items.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          Net halaman ini:{" "}
          <span className="text-foreground tabular font-medium">{formatCurrency(netTotal)}</span>
        </p>
      ) : null}

      <TransactionList
        transactions={items}
        emptyTitle={
          total === 0 ? "Belum ada transaksi." : "Tidak ada transaksi yang cocok dengan filter."
        }
        emptyDescription={
          total === 0
            ? "Tambahkan transaksi pertama Anda."
            : "Coba ubah kata kunci atau reset filter."
        }
      />

      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            className="h-10 rounded-field"
            disabled={page <= 1}
            render={page > 1 ? <Link href={buildPageHref(page - 1)} /> : undefined}
          >
            Sebelumnya
          </Button>
          <span className="text-muted-foreground text-xs">Halaman {page}</span>
          <Button
            variant="outline"
            className="h-10 rounded-field"
            disabled={!hasMore}
            render={hasMore ? <Link href={buildPageHref(page + 1)} /> : undefined}
          >
            Berikutnya
          </Button>
        </div>
      )}
    </div>
  )
}
