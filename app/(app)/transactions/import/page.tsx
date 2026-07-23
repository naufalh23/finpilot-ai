import type { Metadata } from "next"

import { ImportWizard } from "@/components/transactions/import-wizard"
import { PageHeader } from "@/components/shared/page-header"
import { getCategories } from "@/lib/queries/categories"
import { getWallets } from "@/lib/queries/wallets"

export const metadata: Metadata = {
  title: "Import Transaksi",
}

export default async function ImportTransactionsPage() {
  const [wallets, categories] = await Promise.all([getWallets(), getCategories()])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Transaksi"
        description="Unggah CSV atau Excel, petakan kolomnya, lalu tinjau sebelum disimpan."
      />
      <ImportWizard
        wallets={wallets.map((wallet) => ({ id: wallet.id, name: wallet.name }))}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          type: category.type,
        }))}
      />
    </div>
  )
}
