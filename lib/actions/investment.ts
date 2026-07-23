"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionError, actionOk, type ActionResult } from "@/lib/actions/types"
import { FIELD_LIMITS } from "@/lib/validators"

const investmentSchema = z.object({
  name: z.string().trim().min(1, "Nama investasi wajib diisi").max(FIELD_LIMITS.investmentName),
  symbol: z.string().trim().max(FIELD_LIMITS.symbol).nullable().optional(),
  type: z.enum(["STOCK", "CRYPTO", "GOLD", "MUTUAL_FUND", "ETF", "OTHER"]),
  quantity: z.number().positive("Jumlah harus lebih dari 0").max(1_000_000_000),
  buyPrice: z.number().positive("Harga beli harus lebih dari 0").max(1_000_000_000_000),
  currentPrice: z.number().positive("Harga saat ini harus lebih dari 0").max(1_000_000_000_000),
  buyDate: z.coerce.date(),
  notes: z.string().trim().max(FIELD_LIMITS.notes).nullable().optional(),
})

function revalidateViews() {
  revalidatePath("/investments")
  revalidatePath("/dashboard")
}

export async function upsertInvestment(
  input: unknown,
  id?: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const parsed = investmentSchema.safeParse(input)

  if (!parsed.success) {
    return actionError("Data investasi tidak valid", parsed.error.flatten().fieldErrors)
  }

  const data = parsed.data

  const payload = {
    name: data.name,
    symbol: data.symbol || null,
    type: data.type,
    quantity: data.quantity,
    buyPrice: data.buyPrice,
    currentPrice: data.currentPrice,
    currency: "IDR",
    buyDate: data.buyDate,
    notes: data.notes || null,
  }

  if (id) {
    const { count } = await prisma.investment.updateMany({
      where: { id, userId: user.id },
      data: payload,
    })

    if (count === 0) return actionError("Investasi tidak ditemukan")

    revalidateViews()
    return actionOk({ id })
  }

  const created = await prisma.investment.create({ data: { ...payload, userId: user.id } })

  revalidateViews()
  return actionOk({ id: created.id })
}

export async function deleteInvestment(id: string): Promise<ActionResult<void>> {
  const user = await requireUser()

  const { count } = await prisma.investment.deleteMany({ where: { id, userId: user.id } })

  if (count === 0) return actionError("Investasi tidak ditemukan")

  revalidateViews()
  return actionOk()
}
