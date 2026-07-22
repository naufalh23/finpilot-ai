import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { BottomNav } from "@/components/layout/bottom-nav"
import { MobileHeader } from "@/components/layout/mobile-header"
import { BrowserNotifyBridge } from "@/components/notifications/browser-notify-bridge"
import { TransactionSheetProvider } from "@/components/transactions/transaction-sheet-context"
import { TransactionSheet } from "@/components/transactions/transaction-sheet"
import { getSessionUser } from "@/lib/auth"
import { getCategories } from "@/lib/queries/categories"
import { generateNotifications, getNotifications, getUnreadNotificationCount } from "@/lib/queries/notifications"
import { getWallets } from "@/lib/queries/wallets"
import { processDueRecurring } from "@/lib/recurring/process"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()

  if (!user) {
    redirect("/login")
  }

  // Runs once per shell mount — Next reuses this layout across client-side
  // navigations within it, so this isn't hit on every click. Sequenced ahead
  // of the wallet/category fetch below so a freshly auto-created recurring
  // transaction is reflected in the balances rendered this request, without
  // needing a cron job for personal, single-user use.
  await processDueRecurring(user.id)
  await generateNotifications(user.id)

  // Wallets and categories are loaded once here so the add-transaction sheet is
  // instantly available from anywhere in the shell.
  const [wallets, categories, notifications, unreadCount] = await Promise.all([
    getWallets(),
    getCategories(),
    getNotifications(),
    getUnreadNotificationCount(),
  ])

  return (
    <TransactionSheetProvider wallets={wallets} categories={categories}>
      <div className="flex min-h-dvh w-full">
        <AppSidebar user={user} notifications={notifications} unreadCount={unreadCount} />

        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader user={user} notifications={notifications} unreadCount={unreadCount} />
          {/* Bottom padding clears the mobile nav bar. */}
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-28 sm:px-6 lg:pt-8 lg:pb-10">
            {children}
          </main>
        </div>

        <BottomNav />
        <TransactionSheet />
        <BrowserNotifyBridge notifications={notifications} />
      </div>
    </TransactionSheetProvider>
  )
}
