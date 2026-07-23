import {
  Bot,
  CalendarClock,
  ChartPie,
  LayoutDashboard,
  PiggyBank,
  Receipt,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react"

export type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

/** Sidebar order per DESIGN.md § Navigation, extended with modules added after that draft (Komitmen, Investasi). */
export const SIDEBAR_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/transactions", label: "Transaksi", icon: Receipt },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/commitments", label: "Komitmen", icon: CalendarClock },
  { href: "/investments", label: "Investasi", icon: TrendingUp },
  { href: "/reports", label: "Laporan", icon: ChartPie },
  { href: "/coach", label: "AI Coach", icon: Bot },
  { href: "/settings", label: "Pengaturan", icon: Settings },
]

/**
 * Mobile bottom bar: four destinations flanking the centre "+" action, per
 * DESIGN.md § Bottom Navigation.
 */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/reports", label: "Laporan", icon: ChartPie },
  { href: "/settings", label: "Profil", icon: Settings },
]

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
