import type { Metadata } from "next"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  Bot,
  CalendarClock,
  ChartPie,
  ChevronRight,
  LogOut,
  PiggyBank,
  Receipt,
  Tag,
  TrendingUp,
  Wallet,
} from "lucide-react"

import { signOutAction } from "@/app/login/actions"
import { PageHeader } from "@/components/shared/page-header"
import { NotificationSettings } from "@/components/settings/notification-settings"
import { ThemeSelector } from "@/components/settings/theme-selector"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"
import { getNotificationPreferences } from "@/lib/queries/notifications"

export const metadata: Metadata = {
  title: "Pengaturan",
}

/**
 * On phones the sidebar is hidden and the bottom bar only holds four
 * destinations, so this page doubles as the full navigation hub — otherwise
 * Budget, Komitmen, and AI Coach would be unreachable on mobile.
 */
const MENU_LINKS = [
  { href: "/transactions", label: "Transaksi", description: "Semua catatan keuangan", icon: Receipt },
  { href: "/budget", label: "Budget", description: "Batas pengeluaran per kategori", icon: PiggyBank },
  { href: "/commitments", label: "Komitmen", description: "Langganan, kartu kredit, pinjaman", icon: CalendarClock },
  { href: "/investments", label: "Investasi", description: "Saham, kripto, emas, reksa dana, ETF", icon: TrendingUp },
  { href: "/reports", label: "Laporan", description: "Ringkasan per periode & export", icon: ChartPie },
  { href: "/coach", label: "AI Coach", description: "Tanya soal keuangan Anda", icon: Bot },
]

const DATA_LINKS = [
  { href: "/settings/categories", label: "Kategori", description: "Kelola kategori transaksi", icon: Tag },
  { href: "/wallet", label: "Wallet", description: "Kelola sumber dana", icon: Wallet },
]

export default async function SettingsPage() {
  const user = await requireUser()
  const notificationPreferences = await getNotificationPreferences()

  return (
    <div className="space-y-6">
      <PageHeader title="Pengaturan" />

      <section className="card-surface flex items-center gap-3 p-4">
        <Avatar className="size-12">
          {user?.image ? <AvatarImage src={user.image} alt="" /> : null}
          <AvatarFallback>{user?.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user?.name ?? "Akun saya"}</p>
          <p className="text-muted-foreground truncate text-sm">{user?.email}</p>
        </div>
      </section>

      {/* Hidden on desktop, where the sidebar already lists every destination. */}
      <section className="space-y-3 lg:hidden">
        <h2 className="text-sm font-semibold">Menu</h2>
        <LinkList links={MENU_LINKS} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Tampilan</h2>
        <ThemeSelector />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Notifikasi</h2>
        <NotificationSettings
          notifyBudget={notificationPreferences.notifyBudget}
          notifyBills={notificationPreferences.notifyBills}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Data</h2>
        <LinkList links={DATA_LINKS} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Mata Uang &amp; Bahasa</h2>
        <div className="card-surface text-muted-foreground p-4 text-sm">
          Saat ini terkunci pada <span className="text-foreground font-medium">IDR</span> dan{" "}
          <span className="text-foreground font-medium">Bahasa Indonesia</span>. Multi-currency
          masuk roadmap setelah versi 0.1.
        </div>
      </section>

      <form action={signOutAction}>
        <Button type="submit" variant="destructive" className="h-11 w-full rounded-field">
          <LogOut className="size-4" />
          Keluar
        </Button>
      </form>
    </div>
  )
}

function LinkList({
  links,
}: {
  links: { href: string; label: string; description: string; icon: LucideIcon }[]
}) {
  return (
    <ul className="card-surface divide-border divide-y overflow-hidden">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3.5 transition-colors"
          >
            <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-[11px]">
              <link.icon className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{link.label}</span>
              <span className="text-muted-foreground block truncate text-xs">
                {link.description}
              </span>
            </span>
            <ChevronRight className="text-muted-foreground size-4 shrink-0" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
