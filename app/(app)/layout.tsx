import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { BottomNav } from "@/components/layout/bottom-nav"
import { MobileHeader } from "@/components/layout/mobile-header"
import { TransactionSheetProvider } from "@/components/transactions/transaction-sheet-context"
import { TransactionSheet } from "@/components/transactions/transaction-sheet"
import { getSessionUser } from "@/lib/auth"
import { getCategories } from "@/lib/queries/categories"
import { getWallets } from "@/lib/queries/wallets"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()

  if (!user) {
    redirect("/login")
  }

  // Wallets and categories are loaded once here so the add-transaction sheet is
  // instantly available from anywhere in the shell.
  const [wallets, categories] = await Promise.all([getWallets(), getCategories()])

  return (
    <TransactionSheetProvider wallets={wallets} categories={categories}>
      <div className="flex min-h-dvh w-full">
        <AppSidebar user={user} />

        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader user={user} />
          {/* Bottom padding clears the mobile nav bar. */}
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-28 sm:px-6 lg:pt-8 lg:pb-10">
            {children}
          </main>
        </div>

        <BottomNav />
        <TransactionSheet />
      </div>
    </TransactionSheetProvider>
  )
}
