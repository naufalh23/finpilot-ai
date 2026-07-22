"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { formatCurrency } from "@/lib/format"
import type { CashFlowPoint } from "@/lib/queries/transactions"

export function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            dy={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(value: number) => formatCurrency(value, { compact: true })}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null

              return (
                <div className="border-border bg-popover text-popover-foreground shadow-lifted rounded-field border px-3 py-2 text-xs">
                  <p className="mb-1.5 font-medium">{label}</p>
                  {payload.map((entry) => (
                    <p key={String(entry.dataKey)} className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-muted-foreground">
                        {entry.dataKey === "income" ? "Masuk" : "Keluar"}
                      </span>
                      <span className="tabular ml-auto font-medium">
                        {formatCurrency(Number(entry.value ?? 0))}
                      </span>
                    </p>
                  ))}
                </div>
              )
            }}
          />
          <Bar dataKey="income" fill="var(--success)" radius={[6, 6, 0, 0]} maxBarSize={22} />
          <Bar dataKey="expense" fill="var(--danger)" radius={[6, 6, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
