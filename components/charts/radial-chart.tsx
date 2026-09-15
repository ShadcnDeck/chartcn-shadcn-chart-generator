"use client"

import { Cell, RadialBar, RadialBarChart as RechartsRadialBarChart } from "recharts"

import type { ChartConfig } from "@/components/ui/chart"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { getSeries, resolveColor, toChartRows } from "@/lib/chart-data"
import type { ChartOptions, ParsedChartData } from "@/types/chart"

interface RadialChartProps {
  data: ParsedChartData
  options?: ChartOptions
}

export function RadialChart({ data, options }: RadialChartProps) {
  const valueKey = getSeries(data)[0]?.key ?? "value"
  const rows = toChartRows(data).filter((row) => row[valueKey] !== null)

  const chartConfig: ChartConfig = {}
  rows.forEach((row, index) => {
    const category = String(row.category)
    chartConfig[category] = {
      label: category,
      color: resolveColor(category, index, options?.customColors),
    }
  })

  return (
    <ChartContainer config={chartConfig} className="aspect-square h-[350px] w-full">
      <RechartsRadialBarChart data={rows} innerRadius={20} outerRadius={140}>
        <ChartTooltip content={<ChartTooltipContent nameKey="category" hideLabel />} />
        <ChartLegend content={<ChartLegendContent nameKey="category" />} verticalAlign="bottom" />
        <RadialBar dataKey={valueKey} background cornerRadius={6}>
          {rows.map((row, index) => (
            <Cell
              key={`${row.category}-${index}`}
              fill={chartConfig[String(row.category)]?.color}
            />
          ))}
        </RadialBar>
      </RechartsRadialBarChart>
    </ChartContainer>
  )
}
