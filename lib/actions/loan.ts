"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionError, actionOk, type ActionResult } from "@/lib/actions/types"

const loanSchema = z.object({
  name: z.string().trim().min(1, "Nama pinjaman wajib diisi").max(60),
  type: z.enum(["PERSONAL", "BANK", "VEHICLE", "MORTGAGE", "OTHER"]),
  lender: z.string().trim().max(60).nullable().optional(),
  principal: z.number().positive("Pokok pinjaman harus lebih dari 0").max(1_000_000_000_000),
  remainingBalance: z.number().min(0).max(1_000_000_000_000),
  installment: z.number().positive("Cicilan harus lebih dari 0").max(1_000_000_000_000),
  interestRate: z.number().min(0).max(100).nullable().optional(),
  tenorMonths: z.number().int().min(1).max(600).nullable().optional(),
  dueDay: z.number().int().min(1).max(31),
  startDate: z.coerce.date(),
  walletId: z.string().nullable().optional(),
})

function revalidateViews() {
  revalidatePath("/commitments")
  revalidatePath("/dashboard")
  revalidatePath("/transactions")
}

export async function upsertLoan(
  input: unknown,
  id?: string
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const parsed = loanSchema.safeParse(input)

  if (!parsed.success) {
    return actionError("Data pinjaman tidak valid", parsed.error.flatten().fieldErrors)
  }

  const data = parsed.data

  if (data.remainingBalance > data.principal) {
    return actionError("Sisa pinjaman tidak boleh melebihi pokok pinjaman")
  }

  if (data.walletId) {
    const owned = await prisma.wallet.count({ where: { id: data.walletId, userId: user.id } })
    if (owned === 0) return actionError("Wallet tidak ditemukan")
  }

  const payload = {
    name: data.name,
    type: data.type,
    lender: data.lender || null,
    principal: data.principal,
    remainingBalance: data.remainingBalance,
    installment: data.installment,
    interestRate: data.interestRate ?? null,
    tenorMonths: data.tenorMonths ?? null,
    dueDay: data.dueDay,
    startDate: data.startDate,
    walletId: data.walletId || null,
  }

  if (id) {
    const { count } = await prisma.loan.updateMany({
      where: { id, userId: user.id },
      data: payload,
    })

    if (count === 0) return actionError("Pinjaman tidak ditemukan")

    revalidateViews()
    return actionOk({ id })
  }

  const created = await prisma.loan.create({ data: { ...payload, userId: user.id } })

  revalidateViews()
  return actionOk({ id: created.id })
}

export async function deleteLoan(id: string): Promise<ActionResult<void>> {
  const user = await requireUser()

  const { count } = await prisma.loan.deleteMany({ where: { id, userId: user.id } })

  if (count === 0) return actionError("Pinjaman tidak ditemukan")

  revalidateViews()
  return actionOk()
}

/**
 * Records an instalment: reduces the remaining balance and, when a wallet is
 * linked, books the matching expense. The loan closes itself once paid off.
 */
export async function payLoanInstallment(
  id: string,
  amount?: number
): Promise<ActionResult<{ remaining: number; closed: boolean }>> {
  const user = await requireUser()

  const loan = await prisma.loan.findFirst({ where: { id, userId: user.id } })

  if (!loan) return actionError("Pinjaman tidak ditemukan")

  const remaining = Number(loan.remainingBalance)
  const installment = Number(loan.installment)
  // Never pay more than what is left, so the balance can't go negative.
  const payment = Math.min(amount && amount > 0 ? amount : installment, remaining)

  if (payment <= 0) return actionError("Pinjaman ini sudah lunas")

  const nextRemaining = remaining - payment
  const closed = nextRemaining <= 0

  const operations = [
    prisma.loan.update({
      where: { id },
      data: { remainingBalance: nextRemaining, isActive: !closed },
    }),
  ]

  if (loan.walletId) {
    operations.push(
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: "EXPENSE",
          status: "COMPLETED",
          date: new Date(),
          amount: payment,
          walletId: loan.walletId,
          merchant: loan.lender ?? loan.name,
          notes: `Cicilan ${loan.name}`,
        },
      }) as never
    )
  }

  await prisma.$transaction(operations)

  revalidateViews()
  return actionOk({ remaining: nextRemaining, closed })
}
