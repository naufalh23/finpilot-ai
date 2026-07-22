import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  tone?: "neutral" | "income" | "expense" | "ai"
}) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-[9px]",
            tone === "income" && "bg-success/12 text-success",
            tone === "expense" && "bg-danger/12 text-danger",
            tone === "ai" && "bg-ai/12 text-ai",
            tone === "neutral" && "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="size-4" />
        </span>
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
      </div>
      <p
        className={cn(
          "tabular mt-2.5 text-lg font-semibold tracking-tight",
          tone === "income" && "text-success",
          tone === "expense" && "text-danger"
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p> : null}
    </div>
  )
}
