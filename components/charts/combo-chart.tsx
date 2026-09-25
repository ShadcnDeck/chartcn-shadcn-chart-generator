"use client"

import { useId } from "react"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  Rectangle,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  CATEGORY_KEY,
  buildChartConfig,
  formatCompactNumber,
  formatDateTick,
  getSeries,
  isDateAxis,
  toChartRows,
} from "@/lib/chart-data"
import { SERIES_STAGGER_MS, comboRenderType } from "@/lib/chart-style"
import type { ChartOptions, ParsedChartData } from "@/types/chart"

interface ComboChartProps {
  data: ParsedChartData
  options?: ChartOptions
}

export function ComboChart({ data, options }: ComboChartProps) {
  const uid = useId().replace(/[^\w-]/g, "")
  const series = getSeries(data)
  const chartConfig = buildChartConfig(data, options?.customColors)
  const rows = toChartRows(data)
  const dateAxis = isDateAxis(data)

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full">
      <ComposedChart accessibilityLayer data={rows}>
        <defs>
          {series.map(({ key }, index) => (
            <linearGradient key={key} id={`${uid}-fill-${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`var(--color-${key})`} stopOpacity={1} />
              <stop offset="100%" stopColor={`var(--color-${key})`} stopOpacity={0.55} />
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
          tickFormatter={formatCompactNumber}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={
            <ChartTooltipContent
              labelFormatter={dateAxis ? (label) => formatDateTick(String(label)) : undefined}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
        {series.map(({ key }, index) =>
          comboRenderType(key, index, options?.seriesRenderType) === "line" ? (
            <Line
              key={key}
              dataKey={key}
              type="monotone"
              stroke={`var(--color-${key})`}
              strokeWidth={2.5}
              dot={{ r: 3, fill: "var(--card)", strokeWidth: 2 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
            />
          ) : (
            <Bar
              key={key}
              dataKey={key}
              fill={`var(--color-${key})`}
              shape={(props) => <Rectangle {...props} fill={`url(#${uid}-fill-${index})`} />}
              radius={[6, 6, 0, 0]}
              maxBarSize={36}
              animationBegin={index * SERIES_STAGGER_MS}
            />
          )
        )}
      </ComposedChart>
    </ChartContainer>
  )
}
