"use client"

import * as React from "react"

import type { CategorySummary } from "@/lib/queries/categories"
import type { WalletSummary } from "@/lib/queries/wallets"

export type TransactionDraft = {
  id?: string
  type?: "INCOME" | "EXPENSE" | "TRANSFER"
  date?: string
  amount?: number
  walletId?: string
  toWalletId?: string | null
  categoryId?: string | null
  merchant?: string | null
  notes?: string | null
}

type TransactionSheetContextValue = {
  wallets: WalletSummary[]
  categories: CategorySummary[]
  open: boolean
  draft: TransactionDraft | null
  openCreate: (prefill?: TransactionDraft) => void
  openEdit: (draft: TransactionDraft & { id: string }) => void
  close: () => void
}

const TransactionSheetContext = React.createContext<TransactionSheetContextValue | null>(null)

export function useTransactionSheet() {
  const context = React.useContext(TransactionSheetContext)

  if (!context) {
    throw new Error("useTransactionSheet must be used inside <TransactionSheetProvider>")
  }

  return context
}

/**
 * One sheet instance lives in the app shell so the FAB, the bottom-nav "+",
 * and any in-page trigger all open the same form without a navigation.
 */
export function TransactionSheetProvider({
  wallets,
  categories,
  children,
}: {
  wallets: WalletSummary[]
  categories: CategorySummary[]
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<TransactionDraft | null>(null)

  const value = React.useMemo<TransactionSheetContextValue>(
    () => ({
      wallets,
      categories,
      open,
      draft,
      openCreate: (prefill) => {
        setDraft(prefill ?? null)
        setOpen(true)
      },
      openEdit: (next) => {
        setDraft(next)
        setOpen(true)
      },
      close: () => setOpen(false),
    }),
    [wallets, categories, open, draft]
  )

  return (
    <TransactionSheetContext.Provider value={value}>{children}</TransactionSheetContext.Provider>
  )
}
