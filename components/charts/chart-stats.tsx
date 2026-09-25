"use client"

import { AnimatedNumber } from "@/components/animated-number"
import { computeSeriesTotals, formatCompactNumber } from "@/lib/chart-data"
import type { ParsedChartData } from "@/types/chart"

interface ChartStatsProps {
  data: ParsedChartData
  customColors?: Record<string, string>
}

export function ChartStats({ data, customColors }: ChartStatsProps) {
  const totals = computeSeriesTotals(data, customColors)

  if (totals.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {totals.map((series) => (
        <div
          key={series.key}
          className="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2.5"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background">
            <span
              className="size-2.5 rounded-full transition-colors"
              style={{ backgroundColor: series.color }}
            />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs text-muted-foreground">{series.label}</span>
            <AnimatedNumber
              value={series.total}
              format={formatCompactNumber}
              className="text-sm font-semibold tabular-nums"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
