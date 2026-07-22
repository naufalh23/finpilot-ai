"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight, Download, FileJson, FileSpreadsheet, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ReportPreset } from "@/lib/queries/reports"
import { cn } from "@/lib/utils"

const PRESETS: { value: ReportPreset; label: string }[] = [
  { value: "week", label: "Mingguan" },
  { value: "month", label: "Bulanan" },
  { value: "year", label: "Tahunan" },
  { value: "custom", label: "Kustom" },
]

export function ReportFilters({
  preset,
  offset,
  label,
  from,
  to,
}: {
  preset: ReportPreset
  offset: number
  label: string
  from: string
  to: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const buildHref = React.useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(changes)) {
        if (value === null) params.delete(key)
        else params.set(key, value)
      }

      return `${pathname}?${params.toString()}`
    },
    [pathname, searchParams]
  )

  // Export must reflect exactly what is on screen, so it reuses the same params.
  const exportHref = (format: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("format", format)
    return `/api/export?${params.toString()}`
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="bg-muted flex gap-1 rounded-field p-1">
          {PRESETS.map((item) => (
            <Link
              key={item.value}
              href={buildHref({ preset: item.value, offset: "0" })}
              scroll={false}
              className={cn(
                "flex h-9 items-center rounded-[9px] px-3 text-xs font-medium transition-colors",
                preset === item.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="outline" className="h-9 rounded-field" />}
          >
            <Download className="size-4" />
            Export
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<a href={exportHref("csv")} download />}>
              <FileText />
              CSV
            </DropdownMenuItem>
            <DropdownMenuItem render={<a href={exportHref("xlsx")} download />}>
              <FileSpreadsheet />
              Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem render={<a href={exportHref("json")} download />}>
              <FileJson />
              JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {preset === "custom" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            defaultValue={from}
            onChange={(event) =>
              router.replace(buildHref({ from: event.target.value }), { scroll: false })
            }
            className="h-10 w-auto rounded-field px-3"
            aria-label="Tanggal mulai"
          />
          <span className="text-muted-foreground text-sm">sampai</span>
          <Input
            type="date"
            defaultValue={to}
            onChange={(event) =>
              router.replace(buildHref({ to: event.target.value }), { scroll: false })
            }
            className="h-10 w-auto rounded-field px-3"
            aria-label="Tanggal akhir"
          />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-field"
            aria-label="Periode sebelumnya"
            render={<Link href={buildHref({ offset: String(offset - 1) })} scroll={false} />}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <p className="text-sm font-semibold">{label}</p>

          <Button
            variant="outline"
            size="icon"
            className="rounded-field"
            aria-label="Periode berikutnya"
            disabled={offset >= 0}
            render={
              offset < 0 ? (
                <Link href={buildHref({ offset: String(offset + 1) })} scroll={false} />
              ) : undefined
            }
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
