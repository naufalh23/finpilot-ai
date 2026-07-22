"use client"

import * as React from "react"
import { ArrowRightLeft, Plus, Receipt, Sparkles } from "lucide-react"

import { Amount } from "@/components/shared/amount"
import { EmptyState } from "@/components/shared/empty-state"
import { IconBadge } from "@/components/shared/icon"
import { useTransactionSheet } from "@/components/transactions/transaction-sheet-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatRelativeDay } from "@/lib/format"
import type { TransactionListItem } from "@/lib/queries/transactions"
import { cn } from "@/lib/utils"

function groupByDay(items: TransactionListItem[]) {
  const groups = new Map<string, { label: string; items: TransactionListItem[] }>()

  for (const item of items) {
    const date = new Date(item.date)
    const key = date.toDateString()
    const group = groups.get(key)

    if (group) group.items.push(item)
    else groups.set(key, { label: formatRelativeDay(date), items: [item] })
  }

  return [...groups.values()]
}

export function TransactionList({
  transactions,
  emptyTitle = "Belum ada transaksi.",
  emptyDescription = "Tambahkan transaksi pertama Anda.",
  showDayHeadings = true,
}: {
  transactions: TransactionListItem[]
  emptyTitle?: string
  emptyDescription?: string
  showDayHeadings?: boolean
}) {
  const { openCreate } = useTransactionSheet()

  if (transactions.length === 0) {
    return (
      <div className="card-surface">
        <EmptyState
          icon={Receipt}
          title={emptyTitle}
          description={emptyDescription}
          action={
            <Button className="h-11 rounded-field" onClick={() => openCreate()}>
              <Plus className="size-4" />
              Tambah Transaksi
            </Button>
          }
        />
      </div>
    )
  }

  if (!showDayHeadings) {
    return (
      <ul className="card-surface divide-border divide-y overflow-hidden">
        {transactions.map((transaction) => (
          <TransactionRow key={transaction.id} transaction={transaction} />
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-5">
      {groupByDay(transactions).map((group) => {
        const dayTotal = group.items.reduce((sum, item) => {
          if (item.type === "INCOME") return sum + item.amount
          if (item.type === "EXPENSE") return sum - item.amount
          return sum
        }, 0)

        return (
          <section key={group.label}>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {group.label}
              </h3>
              <Amount value={dayTotal} className="text-xs" />
            </div>
            <ul className="card-surface divide-border divide-y overflow-hidden">
              {group.items.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function TransactionRow({ transaction }: { transaction: TransactionListItem }) {
  const { openEdit } = useTransactionSheet()

  const isTransfer = transaction.type === "TRANSFER"
  const signedAmount =
    transaction.type === "INCOME"
      ? transaction.amount
      : transaction.type === "EXPENSE"
        ? -transaction.amount
        : transaction.amount

  const title =
    transaction.merchant ||
    (isTransfer
      ? `${transaction.wallet.name} → ${transaction.toWallet?.name ?? "?"}`
      : (transaction.category?.name ?? "Tanpa kategori"))

  const subtitle = isTransfer
    ? "Transfer"
    : [transaction.category?.name, transaction.wallet.name].filter(Boolean).join(" · ")

  return (
    <li>
      <button
        type="button"
        onClick={() =>
          openEdit({
            id: transaction.id,
            type: transaction.type,
            date: transaction.date,
            amount: transaction.amount,
            walletId: transaction.wallet.id,
            toWalletId: transaction.toWallet?.id ?? null,
            categoryId: transaction.category?.id ?? null,
            merchant: transaction.merchant,
            notes: transaction.notes,
          })
        }
        className="hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
      >
        {isTransfer ? (
          <span className="bg-primary/12 text-primary flex size-10 shrink-0 items-center justify-center rounded-[12px]">
            <ArrowRightLeft className="size-5" />
          </span>
        ) : (
          <IconBadge name={transaction.category?.icon} color={transaction.category?.color} />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium">{title}</p>
            {transaction.aiGenerated ? (
              <Sparkles className="text-ai size-3.5 shrink-0" aria-label="Dibuat oleh AI" />
            ) : null}
          </div>
          <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <Amount
            value={signedAmount}
            currency={transaction.currency}
            tone={isTransfer ? "neutral" : "auto"}
            className={cn("text-sm", isTransfer && "text-foreground")}
          />
          {transaction.status === "PENDING" ? (
            <Badge variant="outline" className="text-warning border-warning/40 h-5 px-1.5 text-[10px]">
              Pending
            </Badge>
          ) : null}
        </div>
      </button>
    </li>
  )
}
