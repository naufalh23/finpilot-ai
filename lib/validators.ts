import { z } from "zod"

const amount = z
  .number({ error: "Jumlah wajib diisi" })
  .positive("Jumlah harus lebih dari 0")
  .max(1_000_000_000_000, "Jumlah terlalu besar")

export const walletSchema = z.object({
  name: z.string().trim().min(1, "Nama wallet wajib diisi").max(60),
  type: z.enum(["CASH", "BANK", "EWALLET", "CREDIT_CARD", "INVESTMENT"]),
  openingBalance: z.number().min(-1_000_000_000_000).max(1_000_000_000_000).default(0),
  currency: z.string().length(3).default("IDR"),
  institution: z.string().trim().max(60).optional().nullable(),
  color: z.string().trim().max(20).optional().nullable(),
  icon: z.string().trim().max(40).optional().nullable(),
})

export type WalletInput = z.infer<typeof walletSchema>

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Nama kategori wajib diisi").max(40),
  type: z.enum(["INCOME", "EXPENSE"]),
  icon: z.string().trim().max(40).optional().nullable(),
  color: z.string().trim().max(20).optional().nullable(),
})

export type CategoryInput = z.infer<typeof categorySchema>

export const transactionSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE", "TRANSFER"]),
    status: z.enum(["PENDING", "COMPLETED"]).default("COMPLETED"),
    date: z.coerce.date({ error: "Tanggal tidak valid" }),
    amount,
    walletId: z.string().min(1, "Wallet wajib dipilih"),
    toWalletId: z.string().optional().nullable(),
    categoryId: z.string().optional().nullable(),
    merchant: z.string().trim().max(80).optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
    aiGenerated: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.type === "TRANSFER") {
      if (!value.toWalletId) {
        ctx.addIssue({
          code: "custom",
          path: ["toWalletId"],
          message: "Wallet tujuan wajib dipilih",
        })
      } else if (value.toWalletId === value.walletId) {
        ctx.addIssue({
          code: "custom",
          path: ["toWalletId"],
          message: "Wallet tujuan harus berbeda",
        })
      }
      return
    }

    if (!value.categoryId) {
      ctx.addIssue({ code: "custom", path: ["categoryId"], message: "Kategori wajib dipilih" })
    }
  })

export type TransactionInput = z.input<typeof transactionSchema>
