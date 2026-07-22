"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus, Sparkles } from "lucide-react"

import { SIDEBAR_ITEMS, isActivePath } from "@/components/layout/nav-items"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { UserMenu, type SessionUser } from "@/components/layout/user-menu"
import { useTransactionSheet } from "@/components/transactions/transaction-sheet-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function AppSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname()
  const { openCreate } = useTransactionSheet()

  return (
    <aside className="bg-sidebar border-sidebar-border hidden w-64 shrink-0 flex-col border-r lg:flex">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-[10px]">
          <Sparkles className="size-4" />
        </span>
        <span className="text-[15px] font-bold tracking-tight">FinPilot AI</span>
        <ThemeToggle className="ml-auto" />
      </div>

      <div className="px-3 pb-3">
        <Button
          className="h-11 w-full justify-start gap-2 rounded-field text-sm"
          onClick={() => openCreate()}
        >
          <Plus className="size-4" />
          Tambah Transaksi
        </Button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {SIDEBAR_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-field px-3 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              )}
            >
              <item.icon className="size-[18px]" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-sidebar-border border-t p-3">
        <UserMenu user={user} showDetails />
      </div>
    </aside>
  )
}
