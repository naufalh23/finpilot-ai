"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Plus, Trash2, Wallet as WalletIcon } from "lucide-react"
import { toast } from "sonner"

import { Amount } from "@/components/shared/amount"
import { EmptyState } from "@/components/shared/empty-state"
import { IconBadge } from "@/components/shared/icon"
import { WalletFormSheet } from "@/components/wallet/wallet-form-sheet"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteWallet, setWalletArchived } from "@/lib/actions/wallet"
import { WALLET_TYPE_LABELS } from "@/lib/constants"
import { formatCurrency } from "@/lib/format"
import type { WalletSummary } from "@/lib/queries/wallets"

export function WalletList({ wallets }: { wallets: WalletSummary[] }) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<WalletSummary | null>(null)
  const [, startTransition] = React.useTransition()

  const total = wallets
    .filter((wallet) => !wallet.isArchived)
    .reduce((sum, wallet) => sum + wallet.balance, 0)

  function openCreate() {
    setEditing(null)
    setSheetOpen(true)
  }

  function openEdit(wallet: WalletSummary) {
    setEditing(wallet)
    setSheetOpen(true)
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.error ?? "Terjadi kesalahan")
        return
      }
      toast.success(success)
      router.refresh()
    })
  }

  const active = wallets.filter((wallet) => !wallet.isArchived)
  const archived = wallets.filter((wallet) => wallet.isArchived)

  return (
    <div className="space-y-6">
      <section className="card-surface bg-primary text-primary-foreground border-transparent p-5">
        <p className="text-primary-foreground/70 text-xs font-medium tracking-wide uppercase">
          Total Saldo
        </p>
        <p className="tabular mt-1.5 text-3xl font-bold">{formatCurrency(total)}</p>
        <p className="text-primary-foreground/70 mt-1 text-sm">
          {active.length} wallet aktif
        </p>
      </section>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Wallet Anda</h2>
        <Button variant="outline" className="h-9 rounded-field" onClick={openCreate}>
          <Plus className="size-4" />
          Tambah
        </Button>
      </div>

      {active.length === 0 ? (
        <div className="card-surface">
          <EmptyState
            icon={WalletIcon}
            title="Belum ada wallet."
            description="Tambahkan wallet pertama Anda — Cash, rekening bank, atau e-wallet."
            action={
              <Button className="h-11 rounded-field" onClick={openCreate}>
                <Plus className="size-4" />
                Tambah Wallet
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {active.map((wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              onEdit={() => openEdit(wallet)}
              onArchive={() =>
                run(() => setWalletArchived(wallet.id, true), "Wallet diarsipkan")
              }
              onDelete={() => run(() => deleteWallet(wallet.id), "Wallet dihapus")}
            />
          ))}
        </ul>
      )}

      {archived.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-muted-foreground text-sm font-semibold">Diarsipkan</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {archived.map((wallet) => (
              <WalletCard
                key={wallet.id}
                wallet={wallet}
                onEdit={() => openEdit(wallet)}
                onRestore={() =>
                  run(() => setWalletArchived(wallet.id, false), "Wallet dipulihkan")
                }
                onDelete={() => run(() => deleteWallet(wallet.id), "Wallet dihapus")}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <WalletFormSheet open={sheetOpen} onOpenChange={setSheetOpen} wallet={editing} />
    </div>
  )
}

function WalletCard({
  wallet,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: {
  wallet: WalletSummary
  onEdit: () => void
  onArchive?: () => void
  onRestore?: () => void
  onDelete: () => void
}) {
  return (
    <li className="card-surface flex items-center gap-3 p-4 data-[archived=true]:opacity-60" data-archived={wallet.isArchived}>
      <IconBadge name={wallet.icon} color={wallet.color} size="lg" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{wallet.name}</p>
        <p className="text-muted-foreground truncate text-xs">
          {WALLET_TYPE_LABELS[wallet.type]}
          {wallet.institution ? ` · ${wallet.institution}` : ""}
        </p>
        <Amount
          value={wallet.balance}
          currency={wallet.currency}
          tone="neutral"
          className="mt-1.5 block text-lg"
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Aksi wallet</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil />
            Ubah
          </DropdownMenuItem>
          {onArchive ? (
            <DropdownMenuItem onClick={onArchive}>
              <Archive />
              Arsipkan
            </DropdownMenuItem>
          ) : null}
          {onRestore ? (
            <DropdownMenuItem onClick={onRestore}>
              <ArchiveRestore />
              Pulihkan
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 />
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
