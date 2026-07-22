"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"

import { useTransactionSheet } from "@/components/transactions/transaction-sheet-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const TYPE_FILTERS = [
  { value: "", label: "Semua" },
  { value: "EXPENSE", label: "Keluar" },
  { value: "INCOME", label: "Masuk" },
  { value: "TRANSFER", label: "Transfer" },
]

export function TransactionFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [query, setQuery] = React.useState(searchParams.get("q") ?? "")
  const [, startTransition] = React.useTransition()
  const { wallets, categories } = useTransactionSheet()

  const type = searchParams.get("type") ?? ""
  const walletId = searchParams.get("wallet") ?? ""
  const categoryId = searchParams.get("category") ?? ""
  const hasFilters = Boolean(type || walletId || categoryId || searchParams.get("q"))

  const push = React.useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      mutate(params)
      // Any filter change resets pagination.
      params.delete("page")
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      })
    },
    [pathname, router, searchParams]
  )

  // Debounce the search box so typing doesn't fire a request per keystroke.
  React.useEffect(() => {
    const current = searchParams.get("q") ?? ""
    if (query === current) return

    const timer = setTimeout(() => {
      push((params) => {
        if (query.trim()) params.set("q", query.trim())
        else params.delete("q")
      })
    }, 350)

    return () => clearTimeout(timer)
  }, [query, push, searchParams])

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari merchant, catatan, kategori…"
          className="h-11 rounded-field pr-10 pl-9"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
            aria-label="Bersihkan pencarian"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="bg-muted flex gap-1 rounded-field p-1">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value || "all"}
              type="button"
              onClick={() =>
                push((params) => {
                  if (filter.value) params.set("type", filter.value)
                  else params.delete("type")
                })
              }
              className={cn(
                "h-8 rounded-[9px] px-3 text-xs font-medium transition-colors",
                type === filter.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <Select
          value={walletId || null}
          onValueChange={(value) =>
            push((params) => {
              if (value) params.set("wallet", value as string)
              else params.delete("wallet")
            })
          }
        >
          <SelectTrigger size="sm" className="h-9 rounded-field">
            <SelectValue placeholder="Semua wallet">
              {(value: string | null) =>
                wallets.find((wallet) => wallet.id === value)?.name ?? "Semua wallet"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {wallets.map((wallet) => (
              <SelectItem key={wallet.id} value={wallet.id}>
                {wallet.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={categoryId || null}
          onValueChange={(value) =>
            push((params) => {
              if (value) params.set("category", value as string)
              else params.delete("category")
            })
          }
        >
          <SelectTrigger size="sm" className="h-9 rounded-field">
            <SelectValue placeholder="Semua kategori">
              {(value: string | null) =>
                categories.find((category) => category.id === value)?.name ?? "Semua kategori"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-field"
            onClick={() => {
              setQuery("")
              startTransition(() => router.replace(pathname, { scroll: false }))
            }}
          >
            <X className="size-3.5" />
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  )
}
