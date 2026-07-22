"use client"

import {
  Area,
  AreaChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

import { formatCurrency } from "@/lib/format"
import type { BreakdownRow, TrendPoint } from "@/lib/queries/reports"

/** Fallback series colours for categories with no colour set. */
const SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

function TooltipCard({ title, rows }: { title: string; rows: { label: string; value: number; color?: string }[] }) {
  return (
    <div className="border-border bg-popover text-popover-foreground shadow-lifted rounded-field border px-3 py-2 text-xs">
      <p className="mb-1.5 font-medium">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center gap-2">
          {row.color ? (
            <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} />
          ) : null}
          <span className="text-muted-foreground">{row.label}</span>
          <span className="tabular ml-auto font-medium">{formatCurrency(row.value)}</span>
        </p>
      ))}
    </div>
  )
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--success)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--danger)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--danger)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            // Keep labels readable when a month has 31 buckets.
            interval="preserveStartEnd"
            minTickGap={24}
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
            cursor={{ stroke: "var(--border)" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipCard
                  title={String(label)}
                  rows={payload.map((entry) => ({
                    label: entry.dataKey === "income" ? "Masuk" : "Keluar",
                    value: Number(entry.value ?? 0),
                    color: entry.color,
                  }))}
                />
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke="var(--success)"
            strokeWidth={2}
            fill="url(#incomeFill)"
          />
          <Area
            type="monotone"
            dataKey="expense"
            stroke="var(--danger)"
            strokeWidth={2}
            fill="url(#expenseFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CategoryPie({ data }: { data: BreakdownRow[] }) {
  // A pie with 12 slivers is unreadable; group the tail into "Lainnya".
  const top = data.slice(0, 6)
  const rest = data.slice(6)
  const slices = rest.length
    ? [
        ...top,
        {
          id: "rest",
          name: "Lainnya",
          total: rest.reduce((sum, row) => sum + row.total, 0),
          share: rest.reduce((sum, row) => sum + row.share, 0),
          color: "var(--muted-foreground)",
          icon: null,
        },
      ]
    : top

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="total"
            nameKey="name"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="var(--card)"
            strokeWidth={2}
          >
            {slices.map((slice, index) => (
              <Cell key={slice.id} fill={slice.color ?? SERIES[index % SERIES.length]} />
            ))}
          </Pie>
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-muted-foreground text-xs">{value}</span>}
          />
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipCard
                  title={String(payload[0]?.name ?? "")}
                  rows={[
                    {
                      label: `${Math.round((payload[0]?.payload?.share ?? 0) * 100)}% dari total`,
                      value: Number(payload[0]?.value ?? 0),
                    },
                  ]}
                />
              ) : null
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
