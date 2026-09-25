"use client"

import { useId } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"

import { AnimatedNumber } from "@/components/animated-number"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  CATEGORY_KEY,
  buildChartConfig,
  computeKpi,
  getSeries,
  toChartRows,
} from "@/lib/chart-data"
import { cn } from "@/lib/utils"
import type { ChartOptions, ParsedChartData } from "@/types/chart"

interface KpiChartProps {
  data: ParsedChartData
  options?: ChartOptions
}

const formatValue = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 2 })

/** A stat card: latest value of the first series, change vs. the previous
 * value, and a sparkline of the whole series. */
export function KpiChart({ data, options }: KpiChartProps) {
  const uid = useId().replace(/[^\w-]/g, "")
  const key = getSeries(data)[0]?.key ?? "value"
  const chartConfig = buildChartConfig(
    { ...data, headers: data.headers.slice(0, 2) },
    options?.customColors
  )
  const rows = toChartRows(data)
  const kpi = computeKpi(data)
  const sparkType = options?.sparkType ?? "area"
  const color = `var(--color-${key})`
  const tooltip = (
    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
  )

  return (
    <div className="flex w-full flex-col gap-4 py-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{kpi.label}</span>
          {kpi.latest !== null ? (
            <AnimatedNumber
              value={kpi.latest}
              format={formatValue}
              className="text-3xl font-semibold tracking-tight tabular-nums"
            />
          ) : (
            <span className="text-3xl font-semibold">–</span>
          )}
        </div>
        {kpi.delta !== null && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
              kpi.delta >= 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}
          >
            {kpi.delta >= 0 ? "▲" : "▼"} {Math.abs(kpi.delta).toFixed(1)}%
          </span>
        )}
      </div>
      <ChartContainer config={chartConfig} className="aspect-auto h-[80px] w-full">
        {sparkType === "bar" ? (
          <BarChart data={rows} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey={CATEGORY_KEY} hide />
            {tooltip}
            <Bar dataKey={key} fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        ) : sparkType === "line" ? (
          <LineChart data={rows} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <XAxis dataKey={CATEGORY_KEY} hide />
            <YAxis hide domain={["dataMin", "dataMax"]} />
            {tooltip}
            <Line dataKey={key} type="monotone" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        ) : (
          <AreaChart data={rows} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`${uid}-fill-0`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey={CATEGORY_KEY} hide />
            <YAxis hide domain={["dataMin", "dataMax"]} />
            {tooltip}
            <Area
              dataKey={key}
              type="monotone"
              fill={`url(#${uid}-fill-0)`}
              fillOpacity={1}
              stroke={color}
              strokeWidth={2}
            />
          </AreaChart>
        )}
      </ChartContainer>
      <span className="text-xs text-muted-foreground">
        {kpi.firstCategory} – {kpi.lastCategory}
      </span>
    </div>
  )
}
