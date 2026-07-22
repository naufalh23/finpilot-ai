import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Money is always tabular and always sign-aware — the single place that
 * decides how a figure reads.
 */
export function Amount({
  value,
  currency = "IDR",
  signed = false,
  tone = "auto",
  compact = false,
  className,
}: {
  value: number
  currency?: string
  signed?: boolean
  tone?: "auto" | "neutral" | "income" | "expense"
  compact?: boolean
  className?: string
}) {
  const resolvedTone =
    tone === "auto" ? (value > 0 ? "income" : value < 0 ? "expense" : "neutral") : tone

  return (
    <span
      className={cn(
        "tabular font-semibold",
        resolvedTone === "income" && "text-success",
        resolvedTone === "expense" && "text-danger",
        className
      )}
    >
      {formatCurrency(value, { currency, signed, compact })}
    </span>
  )
}
