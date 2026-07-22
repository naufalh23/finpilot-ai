import Link from "next/link"
import { ChevronRight, Eye } from "lucide-react"

import { formatCurrency } from "@/lib/format"
import type { WalletSummary } from "@/lib/queries/wallets"

/** The one number that must always be on screen, per DESIGN.md § UX Rules. */
export function BalanceCard({
  total,
  wallets,
}: {
  total: number
  wallets: WalletSummary[]
}) {
  return (
    <section className="bg-primary text-primary-foreground shadow-lifted relative overflow-hidden rounded-card p-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-white/10 blur-2xl"
      />

      <div className="relative">
        <div className="flex items-center gap-1.5">
          <Eye className="text-primary-foreground/70 size-3.5" />
          <p className="text-primary-foreground/70 text-xs font-medium tracking-wide uppercase">
            Total Saldo
          </p>
        </div>
        <p className="tabular mt-2 text-[2rem] leading-none font-bold tracking-tight">
          {formatCurrency(total)}
        </p>

        {wallets.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
            {wallets.slice(0, 3).map((wallet) => (
              <div key={wallet.id}>
                <p className="text-primary-foreground/70 text-[11px]">{wallet.name}</p>
                <p className="tabular text-sm font-semibold">
                  {formatCurrency(wallet.balance, { compact: wallet.balance >= 100_000_000 })}
                </p>
              </div>
            ))}
            {wallets.length > 3 ? (
              <Link
                href="/wallet"
                className="text-primary-foreground/80 hover:text-primary-foreground flex items-center self-end text-xs"
              >
                +{wallets.length - 3} lainnya
                <ChevronRight className="size-3.5" />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
