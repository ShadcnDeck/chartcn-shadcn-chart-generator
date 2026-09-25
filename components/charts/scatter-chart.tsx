"use client"

import {
  CartesianGrid,
  Scatter,
  ScatterChart as RechartsScatterChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatCompactNumber, toScatterGroups } from "@/lib/chart-data"
import type { ChartOptions, ParsedChartData } from "@/types/chart"

interface ScatterChartProps {
  data: ParsedChartData
  options?: ChartOptions
}

const AXIS_LABEL_STYLE = { fill: "var(--muted-foreground)", fontSize: 12 }

export function ScatterChart({ data, options }: ScatterChartProps) {
  const groups = toScatterGroups(data, options?.customColors)
  const xLabel = data.headers[1] ?? "X"
  const yLabel = data.headers[2] ?? "Y"

  const chartConfig: ChartConfig = {}
  groups.forEach(({ key, label, color }) => {
    chartConfig[key] = { label, color }
  })

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full">
      <RechartsScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 5" />
        <XAxis
          type="number"
          dataKey="x"
          name={xLabel}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          height={48}
          tickFormatter={formatCompactNumber}
          label={{ value: xLabel, position: "insideBottom", ...AXIS_LABEL_STYLE }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yLabel}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={56}
          tickFormatter={formatCompactNumber}
          label={{ value: yLabel, angle: -90, position: "insideLeft", ...AXIS_LABEL_STYLE }}
        />
        <ChartTooltip cursor={{ strokeDasharray: "3 3" }} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
        {groups.map((group) => (
          <Scatter
            key={group.key}
            name={group.label}
            data={group.points}
            fill={group.color}
            fillOpacity={0.85}
          />
        ))}
      </RechartsScatterChart>
    </ChartContainer>
  )
}
