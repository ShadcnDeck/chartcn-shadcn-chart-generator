"use client"

import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
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
  getSeries,
  isDateAxis,
  toChartRows,
} from "@/lib/chart-data"
import type { ChartOptions, ParsedChartData } from "@/types/chart"

interface LineChartProps {
  data: ParsedChartData
  options?: ChartOptions
}

export function LineChart({ data, options }: LineChartProps) {
  const series = getSeries(data)
  const chartConfig = buildChartConfig(data, options?.customColors)
  const rows = toChartRows(data)
  const dateAxis = isDateAxis(data)

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full">
      <RechartsLineChart accessibilityLayer data={rows}>
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
        <SeriesTooltip
          config={chartConfig}
          seriesCount={series.length}
          style={options?.tooltipStyle}
          dateAxis={dateAxis}
        />
        <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
        {series.map(({ key }) => (
          <Line
            key={key}
            dataKey={key}
            type={options?.smooth ? "monotone" : "linear"}
            stroke={`var(--color-${key})`}
            strokeWidth={2.5}
            dot={options?.showDots ?? true ? { r: 3, fill: "var(--card)", strokeWidth: 2 } : false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
          />
        ))}
      </RechartsLineChart>
    </ChartContainer>
  )
}
