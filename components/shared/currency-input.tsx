"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, "")
}

function group(value: string) {
  if (!value) return ""
  return new Intl.NumberFormat("id-ID").format(Number(value))
}

/**
 * Amount field for IDR: types as plain digits, renders grouped, and reports a
 * number upward. Uses inputMode="numeric" so phones show the number pad.
 */
export function CurrencyInput({
  value,
  onValueChange,
  currency = "Rp",
  className,
  autoFocus,
  id,
  placeholder = "0",
}: {
  value: number
  onValueChange: (value: number) => void
  currency?: string
  className?: string
  autoFocus?: boolean
  id?: string
  placeholder?: string
}) {
  const [raw, setRaw] = React.useState(() => (value ? String(Math.round(value)) : ""))

  // Keep in sync when the form resets or loads an existing transaction.
  React.useEffect(() => {
    setRaw(value ? String(Math.round(value)) : "")
  }, [value])

  return (
    <div
      className={cn(
        "border-input focus-within:border-ring focus-within:ring-ring/50 flex items-center gap-2 rounded-field border bg-transparent px-3.5 py-3 transition-colors focus-within:ring-3 dark:bg-input/30",
        className
      )}
    >
      <span className="text-muted-foreground shrink-0 text-lg font-medium">{currency}</span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={group(raw)}
        onChange={(event) => {
          const next = digitsOnly(event.target.value)
          setRaw(next)
          onValueChange(next ? Number(next) : 0)
        }}
        className="tabular placeholder:text-muted-foreground/50 w-full min-w-0 bg-transparent text-2xl font-semibold outline-none"
      />
    </div>
  )
}
