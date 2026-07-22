import { cn } from "@/lib/utils"
import type { BudgetProgress } from "@/lib/queries/budgets"

const TRACK_COLORS: Record<BudgetProgress["status"], string> = {
  ok: "bg-success",
  warning: "bg-warning",
  over: "bg-danger",
}

export const BUDGET_TEXT_COLORS: Record<BudgetProgress["status"], string> = {
  ok: "text-muted-foreground",
  warning: "text-warning",
  over: "text-danger",
}

/**
 * Progress track for a budget. Past 100% the bar stays full and turns danger —
 * a bar that overflows its track reads as a rendering bug, not a warning.
 */
export function BudgetBar({
  ratio,
  status,
  className,
}: {
  ratio: number
  status: BudgetProgress["status"]
  className?: string
}) {
  const percent = Math.min(Math.max(ratio, 0), 1) * 100

  return (
    <div
      className={cn("bg-muted h-2 w-full overflow-hidden rounded-full", className)}
      role="progressbar"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-300", TRACK_COLORS[status])}
        style={{ width: `${Math.max(percent, ratio > 0 ? 2 : 0)}%` }}
      />
    </div>
  )
}
