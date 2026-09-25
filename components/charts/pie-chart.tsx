"use client"

import {
  Label,
  Pie,
  PieChart as RechartsPieChart,
  type PieLabelRenderProps,
} from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
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

  // Per-slice colors ride on the rows (Recharts reads `fill` from each
  // entry), which also gives the legend its swatches.
  const coloredRows = rows.map((row) => ({
    ...row,
    fill: chartConfig[String(row.category)]?.color,
  }))

  const labelType = options?.labelType ?? "value"
  const donut = options?.donut ?? false

  const renderLabel = (props: PieLabelRenderProps) => {
    if (labelType === "percent") {
      return `${Math.round((props.percent ?? 0) * 100)}%`
    }
    if (labelType === "label") {
      return String(props.name ?? "")
    }
    return String(props.value ?? "")
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-square h-[350px] w-full [&_.recharts-pie-label-text]:fill-foreground"
    >
      <RechartsPieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="category" hideLabel />} />
        <ChartLegend
          content={<ChartLegendContent nameKey="category" />}
          verticalAlign="bottom"
          itemSorter={null}
        />
        <Pie
          data={coloredRows}
          dataKey={valueKey}
          nameKey="category"
          label={donut ? undefined : renderLabel}
          innerRadius={donut ? 64 : 0}
          paddingAngle={donut ? 2 : 0}
          cornerRadius={donut ? 6 : 0}
          stroke="var(--card)"
          strokeWidth={2}
        >
          {donut && (
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
