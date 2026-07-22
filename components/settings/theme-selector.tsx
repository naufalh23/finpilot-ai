"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Monitor, Moon, Sun } from "lucide-react"

import { cn } from "@/lib/utils"

const OPTIONS = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
]

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  return (
    <div className="grid grid-cols-3 gap-2">
      {OPTIONS.map((option) => {
        const active = mounted && theme === option.value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex h-20 flex-col items-center justify-center gap-2 rounded-field border text-sm transition-colors",
              active
                ? "border-primary bg-primary/10 font-medium"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <option.icon className="size-5" />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
