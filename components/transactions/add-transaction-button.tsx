"use client"

import { Plus } from "lucide-react"

import { useTransactionSheet } from "@/components/transactions/transaction-sheet-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Opens the shared add-transaction sheet from anywhere inside the shell. */
export function AddTransactionButton({
  label = "Tambah",
  variant = "default",
  className,
}: {
  label?: string
  variant?: "default" | "outline" | "secondary" | "ghost"
  className?: string
}) {
  const { openCreate } = useTransactionSheet()

  return (
    <Button
      variant={variant}
      className={cn("h-10 rounded-field", className)}
      onClick={() => openCreate()}
    >
      <Plus className="size-4" />
      {label}
    </Button>
  )
}
