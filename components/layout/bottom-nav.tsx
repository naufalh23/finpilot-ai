"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus } from "lucide-react"

import { BOTTOM_NAV_ITEMS, isActivePath } from "@/components/layout/nav-items"
import { useTransactionSheet } from "@/components/transactions/transaction-sheet-context"
import { cn } from "@/lib/utils"

/**
 * Mobile navigation: four destinations with the "+" action raised in the
 * middle, per DESIGN.md § Bottom Navigation + Floating Action Button.
 */
export function BottomNav() {
  const pathname = usePathname()
  const { openCreate } = useTransactionSheet()

  const [left, right] = [BOTTOM_NAV_ITEMS.slice(0, 2), BOTTOM_NAV_ITEMS.slice(2)]

  return (
    <nav className="bg-background/85 border-border pb-safe fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-2">
        {left.map((item) => (
          <NavTab key={item.href} item={item} active={isActivePath(pathname, item.href)} />
        ))}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => openCreate()}
            aria-label="Tambah transaksi"
            className="bg-primary text-primary-foreground shadow-lifted flex size-14 -translate-y-4 items-center justify-center rounded-full transition-transform active:scale-95"
          >
            <Plus className="size-6" />
          </button>
        </div>

        {right.map((item) => (
          <NavTab key={item.href} item={item} active={isActivePath(pathname, item.href)} />
        ))}
      </div>
    </nav>
  )
}

function NavTab({
  item,
  active,
}: {
  item: (typeof BOTTOM_NAV_ITEMS)[number]
  active: boolean
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-full flex-col items-center justify-center gap-1 text-[11px] transition-colors",
        active ? "text-primary font-medium" : "text-muted-foreground"
      )}
    >
      <item.icon className="size-[22px]" />
      {item.label}
    </Link>
  )
}
