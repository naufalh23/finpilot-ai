import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { CategoryManager } from "@/components/categories/category-manager"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { getCategories } from "@/lib/queries/categories"

export const metadata: Metadata = {
  title: "Kategori",
}

export default async function CategoriesPage() {
  const categories = await getCategories({ includeArchived: true })

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 rounded-field"
        render={<Link href="/settings" />}
      >
        <ChevronLeft className="size-4" />
        Pengaturan
      </Button>

      <PageHeader
        title="Kategori"
        description="Kelompokkan transaksi agar laporan dan insight AI lebih akurat."
      />

      <CategoryManager categories={categories} />
    </div>
  )
}
