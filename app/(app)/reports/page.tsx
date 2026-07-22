import type { Metadata } from "next"
import { ChartPie } from "lucide-react"

import { ComingSoon } from "@/components/shared/coming-soon"

export const metadata: Metadata = {
  title: "Laporan",
}

export default function ReportsPage() {
  return (
    <ComingSoon
      title="Laporan"
      description="Ringkasan keuangan mingguan, bulanan, dan tahunan."
      icon={ChartPie}
      planned={[
        "Tab Weekly / Monthly / Yearly dengan filter tanggal kustom",
        "Grafik pie, line, dan bar per kategori dan wallet",
        "Export ke CSV dan Excel",
      ]}
    />
  )
}
