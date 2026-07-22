"use client"

import * as React from "react"
import { Sparkles, X } from "lucide-react"

import { dismissInsight } from "@/lib/actions/insight"
import type { DashboardInsight } from "@/lib/queries/insights"
import { cn } from "@/lib/utils"

const SEVERITY_STYLES: Record<DashboardInsight["severity"], string> = {
  INFO: "from-ai/15 to-primary/10 text-ai",
  SUCCESS: "from-success/15 to-primary/10 text-success",
  WARNING: "from-warning/18 to-danger/10 text-warning",
  DANGER: "from-danger/18 to-danger/8 text-danger",
}

/** Always the topmost card on the dashboard, and always dismissible. */
export function AiInsightCard({ insight }: { insight: DashboardInsight }) {
  const [dismissed, setDismissed] = React.useState(false)

  if (dismissed) return null

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-card border border-transparent bg-gradient-to-br p-5",
        SEVERITY_STYLES[insight.severity]
      )}
    >
      <div className="border-border/60 absolute inset-0 rounded-card border" aria-hidden />

      <button
        type="button"
        onClick={() => {
          // Hide immediately; persistence is best-effort and must not block the UI.
          setDismissed(true)
          if (insight.id) void dismissInsight(insight.id)
        }}
        aria-label="Tutup insight"
        className="text-muted-foreground hover:text-foreground absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full transition-colors"
      >
        <X className="size-4" />
      </button>

      <div className="relative flex gap-3.5 pr-8">
        <span className="bg-ai/15 text-ai flex size-10 shrink-0 items-center justify-center rounded-[12px]">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-ai text-[11px] font-semibold tracking-wide uppercase">AI Insight</p>
          <h2 className="text-foreground mt-1 text-[15px] leading-snug font-semibold text-balance">
            {insight.title}
          </h2>
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{insight.body}</p>
        </div>
      </div>
    </section>
  )
}
