import type { Metadata } from "next"

import { PageHeader } from "@/components/shared/page-header"
import { WalletList } from "@/components/wallet/wallet-list"
import { getWallets } from "@/lib/queries/wallets"

export const metadata: Metadata = {
  title: "Wallet",
}

export default async function WalletPage() {
  const wallets = await getWallets({ includeArchived: true })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet"
        description="Semua sumber dana Anda — cash, bank, dan e-wallet — dalam satu tempat."
      />
      <WalletList wallets={wallets} />
    </div>
  )
}
