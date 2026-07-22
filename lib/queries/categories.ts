import "server-only"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { CategoryType } from "@/lib/generated/prisma/enums"

export type CategorySummary = {
  id: string
  name: string
  type: CategoryType
  icon: string | null
  color: string | null
  isDefault: boolean
  isArchived: boolean
  transactionCount: number
}

export async function getCategories({
  includeArchived = false,
}: { includeArchived?: boolean } = {}): Promise<CategorySummary[]> {
  const user = await requireUser()

  const categories = await prisma.category.findMany({
    where: { userId: user.id, ...(includeArchived ? {} : { isArchived: false }) },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { transactions: true } } },
  })

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    type: category.type,
    icon: category.icon,
    color: category.color,
    isDefault: category.isDefault,
    isArchived: category.isArchived,
    transactionCount: category._count.transactions,
  }))
}
