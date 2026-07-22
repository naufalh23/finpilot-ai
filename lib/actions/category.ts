"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionError, actionOk, type ActionResult } from "@/lib/actions/types"
import { categorySchema } from "@/lib/validators"

function revalidateCategoryViews() {
  revalidatePath("/settings/categories")
  revalidatePath("/transactions")
  revalidatePath("/dashboard")
}

export async function createCategory(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const parsed = categorySchema.safeParse(input)

  if (!parsed.success) {
    return actionError("Data kategori tidak valid", parsed.error.flatten().fieldErrors)
  }

  const duplicate = await prisma.category.findFirst({
    where: { userId: user.id, name: parsed.data.name, type: parsed.data.type },
  })

  if (duplicate) {
    return actionError("Kategori dengan nama dan jenis ini sudah ada")
  }

  const count = await prisma.category.count({ where: { userId: user.id, type: parsed.data.type } })

  const category = await prisma.category.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      type: parsed.data.type,
      icon: parsed.data.icon || null,
      color: parsed.data.color || null,
      sortOrder: count,
    },
  })

  revalidateCategoryViews()
  return actionOk({ id: category.id })
}

export async function updateCategory(id: string, input: unknown): Promise<ActionResult<void>> {
  const user = await requireUser()
  const parsed = categorySchema.safeParse(input)

  if (!parsed.success) {
    return actionError("Data kategori tidak valid", parsed.error.flatten().fieldErrors)
  }

  const duplicate = await prisma.category.findFirst({
    where: {
      userId: user.id,
      name: parsed.data.name,
      type: parsed.data.type,
      NOT: { id },
    },
  })

  if (duplicate) {
    return actionError("Kategori dengan nama dan jenis ini sudah ada")
  }

  const { count } = await prisma.category.updateMany({
    where: { id, userId: user.id },
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      icon: parsed.data.icon || null,
      color: parsed.data.color || null,
    },
  })

  if (count === 0) return actionError("Kategori tidak ditemukan")

  revalidateCategoryViews()
  return actionOk()
}

export async function setCategoryArchived(
  id: string,
  isArchived: boolean
): Promise<ActionResult<void>> {
  const user = await requireUser()

  const { count } = await prisma.category.updateMany({
    where: { id, userId: user.id },
    data: { isArchived },
  })

  if (count === 0) return actionError("Kategori tidak ditemukan")

  revalidateCategoryViews()
  return actionOk()
}

export async function deleteCategory(id: string): Promise<ActionResult<void>> {
  const user = await requireUser()

  const category = await prisma.category.findFirst({
    where: { id, userId: user.id },
    include: { _count: { select: { transactions: true, budgets: true } } },
  })

  if (!category) return actionError("Kategori tidak ditemukan")

  // Transactions would silently lose their category (onDelete: SetNull).
  if (category._count.transactions > 0) {
    return actionError(
      `Kategori masih dipakai ${category._count.transactions} transaksi. Arsipkan saja.`
    )
  }

  await prisma.category.delete({ where: { id } })

  revalidateCategoryViews()
  return actionOk()
}
