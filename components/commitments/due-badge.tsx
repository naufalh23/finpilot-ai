import { cn } from "@/lib/utils"

export function dueLabel(days: number) {
  if (days < 0) return `Terlambat ${Math.abs(days)} hari`
  if (days === 0) return "Jatuh tempo hari ini"
  if (days === 1) return "Besok"
  return `${days} hari lagi`
}

/** Urgency reads from colour before the text is even parsed. */
export function dueTone(days: number, reminderDays = 3) {
  if (days < 0) return "danger" as const
  if (days <= reminderDays) return "warning" as const
  return "muted" as const
}

export function DueBadge({
  days,
  reminderDays = 3,
  className,
}: {
  days: number
  reminderDays?: number
  className?: string
}) {
  const tone = dueTone(days, reminderDays)

  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[11px] font-medium",
        tone === "danger" && "bg-danger/12 text-danger",
        tone === "warning" && "bg-warning/12 text-warning",
        tone === "muted" && "bg-muted text-muted-foreground",
        className
      )}
    >
      {dueLabel(days)}
    </span>
  )
}
