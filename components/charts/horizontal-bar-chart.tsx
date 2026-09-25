"use client"

import { useId } from "react"
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  LabelList,
  Rectangle,
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
  formatPercentTick,
  getSeries,
  sortRowsByFirstSeries,
  toChartRows,
} from "@/lib/chart-data"
import { SERIES_STAGGER_MS, barRadius, horizontalLabelWidth } from "@/lib/chart-style"
import type { ChartOptions, ParsedChartData } from "@/types/chart"

interface HorizontalBarChartProps {
  data: ParsedChartData
  options?: ChartOptions
}

export function HorizontalBarChart({ data, options }: HorizontalBarChartProps) {
  const uid = useId().replace(/[^\w-]/g, "")
  const series = getSeries(data)
  const chartConfig = buildChartConfig(data, options?.customColors)
  const stackMode = options?.stackMode ?? "none"
  const stacked = stackMode !== "none"
  const showValues = (options?.showValues ?? true) && !stacked
  const rows = sortRowsByFirstSeries(toChartRows(data), series[0]?.key, options?.sortBars)
  const labelWidth = horizontalLabelWidth(rows.map((row) => String(row[CATEGORY_KEY] ?? "")))

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full">
      <RechartsBarChart
        accessibilityLayer
        data={rows}
        layout="vertical"
        barCategoryGap="24%"
        barGap={4}
        margin={{ right: showValues ? 40 : 12 }}
        stackOffset={stackMode === "percent" ? "expand" : undefined}
      >
        <defs>
          {series.map(({ key }, index) => (
            <linearGradient key={key} id={`${uid}-fill-${index}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={`var(--color-${key})`} stopOpacity={0.55} />
              <stop offset="100%" stopColor={`var(--color-${key})`} stopOpacity={1} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid horizontal={false} strokeDasharray="3 5" />
        <YAxis
          dataKey={CATEGORY_KEY}
          type="category"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={labelWidth}
        />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={stackMode === "percent" ? formatPercentTick : formatCompactNumber}
        />
        <SeriesTooltip
          config={chartConfig}
          seriesCount={series.length}
          style={options?.tooltipStyle}
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
        />
        {series.length > 1 && (
          <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
        )}
        {series.map(({ key }, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={`var(--color-${key})`}
            shape={(props) => <Rectangle {...props} fill={`url(#${uid}-fill-${index})`} />}
            radius={barRadius(index, series.length, stacked, true)}
            maxBarSize={28}
            stackId={stacked ? "stack" : undefined}
            animationBegin={index * SERIES_STAGGER_MS}
          >
            {showValues && (
              <LabelList
                dataKey={key}
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
                formatter={(value) => formatCompactNumber(Number(value))}
              />
            )}
          </Bar>
        ))}
      </RechartsBarChart>
    </ChartContainer>
  )
}
