"use client"

import { useId } from "react"
import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

import { SeriesTooltip } from "@/components/charts/series-tooltip"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import {
  CATEGORY_KEY,
  buildChartConfig,
  formatCompactNumber,
  formatDateTick,
  formatPercentTick,
  getSeries,
  isDateAxis,
  toChartRows,
} from "@/lib/chart-data"
import { SERIES_STAGGER_MS } from "@/lib/chart-style"
import type { ChartOptions, ParsedChartData } from "@/types/chart"

interface AreaChartProps {
  data: ParsedChartData
  options?: ChartOptions
}

export function AreaChart({ data, options }: AreaChartProps) {
  const uid = useId().replace(/[^\w-]/g, "")
  const series = getSeries(data)
  const chartConfig = buildChartConfig(data, options?.customColors)
  const rows = toChartRows(data)
  const stackMode = options?.stackMode ?? "none"
  const dateAxis = isDateAxis(data)

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full">
      <RechartsAreaChart
        accessibilityLayer
        data={rows}
        stackOffset={stackMode === "percent" ? "expand" : undefined}
      >
        <defs>
          {series.map(({ key }, index) => (
            <linearGradient key={key} id={`${uid}-fill-${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`var(--color-${key})`} stopOpacity={0.85} />
              <stop offset="100%" stopColor={`var(--color-${key})`} stopOpacity={0.04} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 5" />
        <XAxis
          dataKey={CATEGORY_KEY}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          tickFormatter={dateAxis ? formatDateTick : undefined}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={40}
          tickFormatter={stackMode === "percent" ? formatPercentTick : formatCompactNumber}
        />
        <SeriesTooltip
          config={chartConfig}
          seriesCount={series.length}
          style={options?.tooltipStyle}
          dateAxis={dateAxis}
          indicator="dot"
        />
        <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
        {series.map(({ key }, index) => (
          <Area
            key={key}
            dataKey={key}
            type="natural"
            fill={`url(#${uid}-fill-${index})`}
            fillOpacity={1}
            stroke={`var(--color-${key})`}
            strokeWidth={2.5}
            stackId={stackMode !== "none" ? "stack" : undefined}
            animationBegin={index * SERIES_STAGGER_MS}
          />
        ))}
      </RechartsAreaChart>
    </ChartContainer>
  )
}
