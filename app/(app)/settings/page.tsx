import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight, LogOut, Tag, Wallet } from "lucide-react"

import { signOutAction } from "@/app/login/actions"
import { PageHeader } from "@/components/shared/page-header"
import { ThemeSelector } from "@/components/settings/theme-selector"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Pengaturan",
}

const LINKS = [
  { href: "/settings/categories", label: "Kategori", description: "Kelola kategori transaksi", icon: Tag },
  { href: "/wallet", label: "Wallet", description: "Kelola sumber dana", icon: Wallet },
]

export default async function SettingsPage() {
  const user = await requireUser()

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

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Tampilan</h2>
        <ThemeSelector />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Data</h2>
        <ul className="card-surface divide-border divide-y overflow-hidden">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="hover:bg-muted/50 flex items-center gap-3 px-4 py-3.5 transition-colors"
              >
                <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-[11px]">
                  <link.icon className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{link.label}</span>
                  <span className="text-muted-foreground block text-xs">{link.description}</span>
                </span>
                <ChevronRight className="text-muted-foreground size-4" />
              </Link>
            </li>
          ))}
        </ul>
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
