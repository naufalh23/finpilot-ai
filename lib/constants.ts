import type { CategoryType, WalletType } from "@/lib/generated/prisma/enums"

/** Seeded for every new user so the app is usable on first sign-in. */
export const DEFAULT_CATEGORIES: {
  name: string
  type: CategoryType
  icon: string
  color: string
}[] = [
  // Income
  { name: "Salary", type: "INCOME", icon: "Wallet", color: "#22c55e" },
  { name: "Bonus", type: "INCOME", icon: "Gift", color: "#14b8a6" },
  { name: "Freelance", type: "INCOME", icon: "Laptop", color: "#2563eb" },

  // Expense
  { name: "Food", type: "EXPENSE", icon: "UtensilsCrossed", color: "#f59e0b" },
  { name: "Transportation", type: "EXPENSE", icon: "Car", color: "#3b82f6" },
  { name: "Shopping", type: "EXPENSE", icon: "ShoppingBag", color: "#ec4899" },
  { name: "Bills", type: "EXPENSE", icon: "ReceiptText", color: "#8b5cf6" },
  { name: "Entertainment", type: "EXPENSE", icon: "Clapperboard", color: "#f43f5e" },
  { name: "Health", type: "EXPENSE", icon: "HeartPulse", color: "#10b981" },
  { name: "Education", type: "EXPENSE", icon: "GraduationCap", color: "#06b6d4" },
]

export const WALLET_TYPE_LABELS: Record<WalletType, string> = {
  CASH: "Cash",
  BANK: "Bank",
  EWALLET: "E-Wallet",
  CREDIT_CARD: "Kartu Kredit",
  INVESTMENT: "Investasi",
}

export const WALLET_TYPE_ICONS: Record<WalletType, string> = {
  CASH: "Banknote",
  BANK: "Landmark",
  EWALLET: "Smartphone",
  CREDIT_CARD: "CreditCard",
  INVESTMENT: "TrendingUp",
}

/** Palette offered when creating wallets and categories. */
export const PICKER_COLORS = [
  "#2563eb",
  "#14b8a6",
  "#7c3aed",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
  "#64748b",
]

export const TRANSACTION_TYPE_LABELS = {
  INCOME: "Pemasukan",
  EXPENSE: "Pengeluaran",
  TRANSFER: "Transfer",
} as const
