/** Data shaping for the chart types whose rows need more than a remap before
 * they can be drawn: interactive (date range), waterfall (running totals),
 * and heatmap (a value grid). Shared by the live preview, the static SVG
 * renderer, and — as mirrored code — the generated components. */

import {
  CATEGORY_KEY,
  formatCompactNumber,
  getSeries,
  resolveColor,
  toChartRows,
} from "@/lib/chart-data"
import type { ChartDataRow, ChartOptions, ParsedChartData } from "@/types/chart"

// ---------------------------------------------------------------- interactive

export type TimeRange = NonNullable<ChartOptions["defaultRange"]>

export const TIME_RANGES: { value: TimeRange; label: string; days: number | null }[] = [
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 },
  { value: "90d", label: "90 days", days: 90 },
  { value: "all", label: "All", days: null },
]

export const DAY_MS = 24 * 60 * 60 * 1000

/** Rows within the last N days of the newest date. Without a date axis it
 * falls back to the last N rows, so the range buttons still do something. */
export function filterByRange(
  rows: ChartDataRow[],
  range: TimeRange,
  dateAxis: boolean,
  categoryKey = CATEGORY_KEY
): ChartDataRow[] {
  const days = TIME_RANGES.find((r) => r.value === range)?.days ?? null
  if (days === null) return rows
  if (!dateAxis) return rows.slice(-days)
  const last = new Date(String(rows[rows.length - 1]?.[categoryKey] ?? "")).getTime()
  if (Number.isNaN(last)) return rows
  const from = last - (days - 1) * DAY_MS
  return rows.filter((row) => new Date(String(row[categoryKey])).getTime() >= from)
}

// ---------------------------------------------------------------- waterfall

export type WaterfallKind = "increase" | "decrease" | "total"

export const WATERFALL_KINDS: { key: WaterfallKind; label: string; color: string }[] = [
  { key: "increase", label: "Increase", color: "var(--chart-3)" },
  { key: "decrease", label: "Decrease", color: "var(--chart-2)" },
  { key: "total", label: "Total", color: "var(--chart-1)" },
]

export function waterfallColor(kind: WaterfallKind, customColors?: Record<string, string>): string {
  return customColors?.[kind] ?? WATERFALL_KINDS.find((k) => k.key === kind)!.color
}

export interface WaterfallStep {
  label: string
  /** Signed change for this step; for total bars, the total itself. */
  change: number
  /** Running total after this step. */
  end: number
  /** Floating bar extent, always [low, high]. */
  range: [number, number]
  kind: WaterfallKind
  /** Bar label: signed change for steps ("+8.6K"), plain value for totals. */
  display: string
}

function waterfallDisplay(kind: WaterfallKind, value: number): string {
  const compact = formatCompactNumber(value)
  return kind !== "total" && value > 0 ? `+${compact}` : compact
}

/** The first row is the starting total; every later row is a change applied
 * to the running total. Optionally appends a final "Total" bar. */
export function computeWaterfall(data: ParsedChartData, showTotal = true): WaterfallStep[] {
  const key = getSeries(data)[0]?.key
  if (!key) return []
  const steps = toChartRows(data).reduce<WaterfallStep[]>((acc, row, index) => {
    const value = typeof row[key] === "number" ? Number(row[key]) : 0
    const previous = acc.length > 0 ? acc[acc.length - 1].end : 0
    const start = index === 0 ? 0 : previous
    const end = index === 0 ? value : previous + value
    const kind: WaterfallKind = index === 0 ? "total" : value >= 0 ? "increase" : "decrease"
    return [
      ...acc,
      {
        label: String(row[CATEGORY_KEY] ?? ""),
        change: value,
        end,
        range: [Math.min(start, end), Math.max(start, end)],
        kind,
        display: waterfallDisplay(kind, value),
      },
    ]
  }, [])
  const last = steps[steps.length - 1]
  if (showTotal && last && steps.length > 1) {
    steps.push({
      label: "Total",
      change: last.end,
      end: last.end,
      range: [Math.min(0, last.end), Math.max(0, last.end)],
      kind: "total",
      display: waterfallDisplay("total", last.end),
    })
  }
  return steps
}

// ---------------------------------------------------------------- heatmap

export const HEAT_KEY = "heat"

export interface HeatmapGrid {
  rowLabels: string[]
  columnLabels: string[]
  /** cells[row][column]; null for a blank cell. */
  cells: (number | null)[][]
  min: number
  max: number
}

/** Column 1 labels the rows; every other column is a column of the grid. */
export function computeHeatmap(data: ParsedChartData): HeatmapGrid {
  const series = getSeries(data)
  const rows = toChartRows(data)
  const cells = rows.map((row) =>
    series.map(({ key }) => (typeof row[key] === "number" ? Number(row[key]) : null))
  )
  const values = cells.flat().filter((v): v is number => v !== null)
  return {
    rowLabels: rows.map((row) => String(row[CATEGORY_KEY] ?? "")),
    columnLabels: series.map((s) => s.label),
    cells,
    min: values.length ? Math.min(...values) : 0,
    max: values.length ? Math.max(...values) : 0,
  }
}

/** 0..1 position of `value` between the grid's min and max. */
export function heatIntensity(value: number, min: number, max: number): number {
  return max === min ? 1 : (value - min) / (max - min)
}

/** Share of the heat color mixed into a cell, so even the lowest value is
 * visibly tinted and the highest is the full color. */
export function heatMix(intensity: number): number {
  return Math.round(12 + intensity * 88)
}

/** Cell label. "percent" treats 0–1 data as fractions and anything larger as
 * already being a percentage. */
export function formatHeatValue(value: number, format: ChartOptions["heatFormat"], max: number): string {
  if (format === "percent") {
    const pct = max <= 1 ? value * 100 : value
    return `${Math.round(pct)}%`
  }
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)
}

export function heatColor(customColors?: Record<string, string>): string {
  return resolveColor(HEAT_KEY, 0, customColors)
}
