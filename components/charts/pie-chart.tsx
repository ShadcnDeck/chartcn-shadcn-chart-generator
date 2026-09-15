"use client"

import { Cell, Label, Pie, PieChart as RechartsPieChart, type PieLabelRenderProps } from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { formatCompactNumber, getSeries, resolveColor, toChartRows } from "@/lib/chart-data"
import type { ChartOptions, ParsedChartData } from "@/types/chart"

interface PieChartProps {
  data: ParsedChartData
  options?: ChartOptions
}

export function PieChart({ data, options }: PieChartProps) {
  const valueKey = getSeries(data)[0]?.key ?? "value"
  const rows = toChartRows(data).filter((row) => row[valueKey] !== null)
  const total = rows.reduce((sum, row) => {
    const value = Number(row[valueKey])
    return sum + (Number.isFinite(value) ? value : 0)
  }, 0)

  const chartConfig: ChartConfig = {}
  rows.forEach((row, index) => {
    const category = String(row.category)
    chartConfig[category] = {
      label: category,
      color: resolveColor(category, index, options?.customColors),
    }
  })

  const labelType = options?.labelType ?? "value"

  const renderLabel = (props: PieLabelRenderProps) => {
    if (labelType === "percent") {
      return `${Math.round((props.percent ?? 0) * 100)}%`
    }
    if (labelType === "label") {
      return String(props.payload?.category ?? "")
    }
    return String(props.value ?? "")
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-square h-[350px] w-full [&_.recharts-text]:fill-foreground"
    >
      <RechartsPieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="category" hideLabel />} />
        <ChartLegend content={<ChartLegendContent nameKey="category" />} verticalAlign="bottom" />
        <Pie
          data={rows}
          dataKey={valueKey}
          nameKey="category"
          label={options?.donut ? undefined : renderLabel}
          innerRadius={options?.donut ? 64 : 0}
          strokeWidth={4}
        >
          {rows.map((row, index) => (
            <Cell
              key={`${row.category}-${index}`}
              fill={chartConfig[String(row.category)]?.color}
            />
          ))}
          {options?.donut && (
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null
                const { cx, cy } = viewBox
                return (
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={cx} y={cy} className="fill-foreground text-2xl font-semibold">
                      {formatCompactNumber(total)}
                    </tspan>
                    <tspan x={cx} y={(cy ?? 0) + 22} className="fill-muted-foreground text-xs">
                      Total
                    </tspan>
                  </text>
                )
              }}
            />
          )}
        </Pie>
      </RechartsPieChart>
    </ChartContainer>
  )
}
