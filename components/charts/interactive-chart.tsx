"use client"

import { useId, useState } from "react"
import { Area, AreaChart, Brush, CartesianGrid, XAxis, YAxis } from "recharts"

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
import { TIME_RANGES, filterByRange, type TimeRange } from "@/lib/chart-models"
import { SERIES_STAGGER_MS } from "@/lib/chart-style"
import { cn } from "@/lib/utils"
import type { ChartOptions, ParsedChartData } from "@/types/chart"

interface InteractiveChartProps {
  data: ParsedChartData
  options?: ChartOptions
}

/** Stacked area over time with range buttons and a drag-to-zoom brush. */
export function InteractiveChart({ data, options }: InteractiveChartProps) {
  const uid = useId().replace(/[^\w-]/g, "")
  const series = getSeries(data)
  const chartConfig = buildChartConfig(data, options?.customColors)
  const rows = toChartRows(data)
  const dateAxis = isDateAxis(data)
  const defaultRange = options?.defaultRange ?? "90d"
  const showBrush = options?.showBrush ?? true

  const [range, setRange] = useState<TimeRange>(defaultRange)
  // Follow the "default range" control when it changes.
  const [appliedDefault, setAppliedDefault] = useState(defaultRange)
  if (appliedDefault !== defaultRange) {
    setAppliedDefault(defaultRange)
    setRange(defaultRange)
  }

  const visible = filterByRange(rows, range, dateAxis)

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex justify-end">
        <div
          role="group"
          aria-label="Time range"
          className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
        >
          {TIME_RANGES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={range === option.value}
              onClick={() => setRange(option.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                range === option.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
        <AreaChart accessibilityLayer data={visible}>
          <defs>
            {series.map(({ key }, index) => (
              <linearGradient key={key} id={`${uid}-fill-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`var(--color-${key})`} stopOpacity={0.8} />
                <stop offset="100%" stopColor={`var(--color-${key})`} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 5" />
          <XAxis
            dataKey={CATEGORY_KEY}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
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
            indicator="dot"
          />
          <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
          {series.map(({ key }, index) => (
            <Area
              key={key}
              dataKey={key}
              type="natural"
              stackId="stack"
              fill={`url(#${uid}-fill-${index})`}
              fillOpacity={1}
              stroke={`var(--color-${key})`}
              strokeWidth={2}
              animationBegin={index * SERIES_STAGGER_MS}
            />
          ))}
          {showBrush && visible.length > 2 && (
            <Brush
              key={range}
              dataKey={CATEGORY_KEY}
              height={28}
              travellerWidth={8}
              stroke="var(--border)"
              fill="var(--card)"
              tickFormatter={dateAxis ? formatDateTick : undefined}
            />
          )}
        </AreaChart>
      </ChartContainer>
    </div>
  )
}
