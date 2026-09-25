"use client"

import {
  Label,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart as RechartsRadialBarChart,
} from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { CATEGORY_KEY, getSeries, radialDomainMax, resolveColor, toChartRows } from "@/lib/chart-data"
import type { ChartOptions, ParsedChartData } from "@/types/chart"

interface RadialChartProps {
  data: ParsedChartData
  options?: ChartOptions
}

export function RadialChart({ data, options }: RadialChartProps) {
  const valueKey = getSeries(data)[0]?.key ?? "value"
  const rows = toChartRows(data).filter((row) => row[valueKey] !== null)
  const half = options?.halfGauge ?? false
  const max = radialDomainMax(rows.map((row) => Number(row[valueKey])))
  const headline = rows[0]

  const chartConfig: ChartConfig = {}
  rows.forEach((row, index) => {
    const category = String(row[CATEGORY_KEY])
    chartConfig[category] = {
      label: category,
      color: resolveColor(category, index, options?.customColors),
    }
  })

  const coloredRows = rows.map((row) => ({
    ...row,
    fill: chartConfig[String(row[CATEGORY_KEY])]?.color,
  }))

  return (
    <ChartContainer config={chartConfig} className="aspect-square h-[350px] w-full">
      <RechartsRadialBarChart
        data={coloredRows}
        startAngle={half ? 180 : 90}
        endAngle={half ? 0 : -270}
        cy={half ? "62%" : undefined}
        innerRadius={half ? "40%" : "30%"}
        outerRadius="95%"
      >
        <PolarAngleAxis type="number" domain={[0, max]} tick={false} axisLine={false} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent nameKey={CATEGORY_KEY} hideLabel />}
        />
        <RadialBar dataKey={valueKey} background cornerRadius={8} />
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
          <Label
            content={({ viewBox }) => {
              if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox) || !headline) return null
              const { cx, cy } = viewBox
              return (
                <text x={cx} textAnchor="middle" dominantBaseline="middle">
                  <tspan
                    x={cx}
                    y={half ? (cy ?? 0) - 18 : cy}
                    className="fill-foreground text-2xl font-semibold"
                  >
                    {Number(headline[valueKey]).toLocaleString("en-US")}
                  </tspan>
                  <tspan
                    x={cx}
                    y={(cy ?? 0) + (half ? 4 : 20)}
                    className="fill-muted-foreground text-xs"
                  >
                    {String(headline[CATEGORY_KEY])}
                  </tspan>
                </text>
              )
            }}
          />
        </PolarRadiusAxis>
        <ChartLegend
          content={<ChartLegendContent nameKey={CATEGORY_KEY} />}
          verticalAlign="bottom"
          itemSorter={null}
        />
      </RechartsRadialBarChart>
    </ChartContainer>
  )
}
