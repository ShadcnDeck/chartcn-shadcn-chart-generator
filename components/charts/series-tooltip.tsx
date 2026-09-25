"use client"

import type { ComponentProps } from "react"

import { ChartBreakdownTooltip } from "@/components/charts/chart-breakdown-tooltip"
import {
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatDateTick, usesBreakdownTooltip } from "@/lib/chart-data"

interface SeriesTooltipProps {
  config: ChartConfig
  seriesCount: number
  style?: "breakdown" | "simple"
  dateAxis?: boolean
  indicator?: "dot" | "line" | "dashed"
  cursor?: ComponentProps<typeof ChartTooltip>["cursor"]
}

const formatDateLabel = (label: unknown) => formatDateTick(String(label))

/** The tooltip used by bar/line/area charts: the breakdown tooltip for
 * multi-series data (unless switched to "simple"), else shadcn's default. */
export function SeriesTooltip({
  config,
  seriesCount,
  style,
  dateAxis,
  indicator,
  cursor,
}: SeriesTooltipProps) {
  const labelFormatter = dateAxis ? formatDateLabel : undefined
  return (
    <ChartTooltip
      cursor={cursor}
      content={
        usesBreakdownTooltip(seriesCount, style) ? (
          <ChartBreakdownTooltip config={config} labelFormatter={labelFormatter} />
        ) : (
          <ChartTooltipContent indicator={indicator} labelFormatter={labelFormatter} />
        )
      }
    />
  )
}
