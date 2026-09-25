"use client"

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart as RechartsRadarChart,
} from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { CATEGORY_KEY, buildChartConfig, getSeries, toChartRows } from "@/lib/chart-data"
import type { ChartOptions, ParsedChartData } from "@/types/chart"

interface RadarChartProps {
  data: ParsedChartData
  options?: ChartOptions
}

export function RadarChart({ data, options }: RadarChartProps) {
  const series = getSeries(data)
  const chartConfig = buildChartConfig(data, options?.customColors)
  const rows = toChartRows(data)

  return (
    <ChartContainer config={chartConfig} className="aspect-square h-[350px] w-full">
      <RechartsRadarChart data={rows}>
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <PolarAngleAxis
          dataKey={CATEGORY_KEY}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <PolarGrid strokeDasharray="3 5" />
        {series.map(({ key }) => (
          <Radar
            key={key}
            dataKey={key}
            fill={`var(--color-${key})`}
            fillOpacity={0.25}
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            dot={{ r: 3, fillOpacity: 1 }}
          />
        ))}
        <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
      </RechartsRadarChart>
    </ChartContainer>
  )
}
