"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, Sparkles } from "lucide-react"

import { SIDEBAR_ITEMS, isActivePath } from "@/components/layout/nav-items"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { UserMenu, type SessionUser } from "@/components/layout/user-menu"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { Button } from "@/components/ui/button"
import type { NotificationItem } from "@/lib/queries/notifications"

export function MobileHeader({
  user,
  notifications,
  unreadCount,
}: {
  user: SessionUser
  notifications: NotificationItem[]
  unreadCount: number
}) {
  const pathname = usePathname()
  const current = SIDEBAR_ITEMS.find((item) => isActivePath(pathname, item.href))

  return (
    <header className="bg-background/85 border-border pt-safe sticky top-0 z-30 border-b backdrop-blur-xl lg:hidden">
      <div className="flex h-14 items-center gap-2 px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-[9px]">
            <Sparkles className="size-3.5" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            {current?.label ?? "FinPilot"}
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" render={<Link href="/transactions?focus=search" />}>
            <Search className="size-[18px]" />
            <span className="sr-only">Cari transaksi</span>
          </Button>
          <NotificationBell notifications={notifications} unreadCount={unreadCount} />
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  )
}
