import type { Metadata } from "next"

import { InvestmentList } from "@/components/investments/investment-list"
import { PageHeader } from "@/components/shared/page-header"
import { getInvestments } from "@/lib/queries/investments"

export const metadata: Metadata = {
  title: "Investasi",
}

export default async function InvestmentsPage() {
  const investments = await getInvestments()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investasi"
        description="Pantau saham, kripto, emas, reksa dana, dan ETF. Harga diperbarui manual."
      />
      <InvestmentList investments={investments} />
    </div>
  )
}
