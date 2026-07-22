import "server-only"

import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { endOfMonth, formatDate, startOfMonth, toNumber } from "@/lib/format"
import { getBudgetOverview } from "@/lib/queries/budgets"
import { getWallets } from "@/lib/queries/wallets"

/**
 * A bounded snapshot of the user's finances, small enough to send on every
 * question but rich enough to answer the examples in the PRD ("kenapa uang saya
 * habis", "berapa pengeluaran Shopee tahun ini", "aman beli laptop 15 juta").
 *
 * Only aggregates and a short recent slice are included — never the full
 * transaction history.
 */
export async function buildFinancialContext() {
  const user = await requireUser()

  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const lastMonthEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const yearStart = new Date(now.getFullYear(), 0, 1)

  const [wallets, categories, thisMonth, lastMonth, byCategory, byMerchant, budgets, recent] =
    await Promise.all([
      getWallets(),
      prisma.category.findMany({
        where: { userId: user.id, isArchived: false },
        select: { id: true, name: true, type: true },
      }),
      prisma.transaction.groupBy({
        by: ["type"],
        where: { userId: user.id, date: { gte: thisMonthStart, lte: thisMonthEnd } },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["type"],
        where: { userId: user.id, date: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: {
          userId: user.id,
          type: "EXPENSE",
          date: { gte: lastMonthStart, lte: thisMonthEnd },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["merchant"],
        where: {
          userId: user.id,
          type: "EXPENSE",
          date: { gte: yearStart },
          merchant: { not: null },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      getBudgetOverview(now),
      prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 25,
        select: {
          date: true,
          type: true,
          amount: true,
          merchant: true,
          notes: true,
          category: { select: { name: true } },
          wallet: { select: { name: true } },
        },
      }),
    ])

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]))
  const sumOf = (rows: { type: string; _sum: { amount: unknown } }[], type: string) =>
    toNumber((rows.find((row) => row.type === type)?._sum.amount as never) ?? null)

  const thisIncome = sumOf(thisMonth, "INCOME")
  const thisExpense = sumOf(thisMonth, "EXPENSE")
  const lastIncome = sumOf(lastMonth, "INCOME")
  const lastExpense = sumOf(lastMonth, "EXPENSE")

  return {
    hariIni: formatDate(now),
    mataUang: "IDR",
    totalSaldo: wallets.reduce((sum, wallet) => sum + wallet.balance, 0),
    wallet: wallets.map((wallet) => ({
      nama: wallet.name,
      jenis: wallet.type,
      saldo: wallet.balance,
    })),
    bulanIni: {
      pemasukan: thisIncome,
      pengeluaran: thisExpense,
      selisih: thisIncome - thisExpense,
      savingRate: thisIncome > 0 ? Math.round(((thisIncome - thisExpense) / thisIncome) * 100) : 0,
    },
    bulanLalu: {
      pemasukan: lastIncome,
      pengeluaran: lastExpense,
      selisih: lastIncome - lastExpense,
    },
    pengeluaranPerKategori2Bulan: byCategory
      .map((row) => ({
        kategori: row.categoryId ? (categoryNames.get(row.categoryId) ?? "Lainnya") : "Tanpa kategori",
        total: toNumber(row._sum.amount),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15),
    merchantTeratasTahunIni: byMerchant
      .map((row) => ({
        merchant: row.merchant as string,
        total: toNumber(row._sum.amount),
        transaksi: row._count._all,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20),
    budgetBulanIni: budgets.budgets.map((budget) => ({
      kategori: budget.categoryName,
      batas: budget.amount,
      terpakai: budget.spent,
      persen: Math.round(budget.ratio * 100),
    })),
    transaksiTerakhir: recent.map((transaction) => ({
      tanggal: formatDate(transaction.date),
      jenis: transaction.type,
      jumlah: toNumber(transaction.amount),
      merchant: transaction.merchant,
      kategori: transaction.category?.name ?? null,
      wallet: transaction.wallet.name,
      catatan: transaction.notes,
    })),
    kategoriTersedia: categories.map((category) => `${category.name} (${category.type})`),
  }
}

export type FinancialContext = Awaited<ReturnType<typeof buildFinancialContext>>
