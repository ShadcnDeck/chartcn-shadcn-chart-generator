import type { ChartConfig } from "@/components/ui/chart"
import type { ChartDataRow, ParsedChartData } from "@/types/chart"

export const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

/** CSS custom property names can't contain spaces, so series/group keys used as
 * `--color-<key>` and recharts dataKeys must be safe identifiers. */
export function toSafeKey(value: string, index: number, prefix = "series"): string {
  const slug = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return slug ? `${prefix}_${slug}` : `${prefix}_${index}`
}

export interface ChartSeries {
  key: string
  label: string
}

/** Rows produced by toChartRows always key the category/label axis as "category". */
export const CATEGORY_KEY = "category"

/** All columns after the first are numeric data series, remapped to safe keys. */
export function getSeries(data: ParsedChartData): ChartSeries[] {
  return data.headers
    .slice(1)
    .map((header, index) => ({ key: toSafeKey(header, index), label: header }))
}

/** Rows remapped to safe category/series keys for use with Recharts + ChartContainer. */
export function toChartRows(data: ParsedChartData): ChartDataRow[] {
  const series = getSeries(data)
  const categoryHeader = data.headers[0]

  return data.rows.map((row) => {
    const mapped: ChartDataRow = { category: row[categoryHeader] }
    series.forEach(({ key, label }) => {
      mapped[key] = row[label]
    })
    return mapped
  })
}

/** Custom color for `key` if one was picked in the UI, else the default palette color. */
export function resolveColor(
  key: string,
  index: number,
  customColors?: Record<string, string>
): string {
  return customColors?.[key] ?? PALETTE[index % PALETTE.length]
}

export function buildChartConfig(
  data: ParsedChartData,
  customColors?: Record<string, string>
): ChartConfig {
  const config: ChartConfig = {}
  getSeries(data).forEach(({ key, label }, index) => {
    config[key] = {
      label,
      color: resolveColor(key, index, customColors),
    }
  })
  return config
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const SLASH_DATE_RE = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/

/** True when every value in the category column looks like a date (ISO or MM/DD/YYYY). */
export function isDateAxis(data: ParsedChartData): boolean {
  const categoryHeader = data.headers[0]
  if (!categoryHeader || data.rows.length === 0) return false

  return data.rows.every((row) => {
    const value = String(row[categoryHeader] ?? "").trim()
    if (!value) return false
    if (!ISO_DATE_RE.test(value) && !SLASH_DATE_RE.test(value)) return false
    return !Number.isNaN(new Date(value).getTime())
  })
}

/** Formats a category-axis value as a short human date, e.g. "Jan 5". */
export function formatDateTick(value: string | number): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)
}

export interface ScatterPoint {
  x: number
  y: number
}

export interface ScatterGroup {
  key: string
  label: string
  color: string
  points: ScatterPoint[]
}

/** Groups rows by the category column into per-group X/Y point lists.
 * Assumes the CSV has exactly 3 columns: Category, X, Y. */
export function toScatterGroups(
  data: ParsedChartData,
  customColors?: Record<string, string>
): ScatterGroup[] {
  const categoryHeader = data.headers[0]
  const xHeader = data.headers[1]
  const yHeader = data.headers[2]
  if (!categoryHeader || !xHeader || !yHeader) return []

  const order: string[] = []
  const byCategory = new Map<string, ScatterPoint[]>()

  data.rows.forEach((row) => {
    const category = String(row[categoryHeader] ?? "")
    const rawX = row[xHeader]
    const rawY = row[yHeader]
    if (rawX === null || rawY === null) return
    const x = Number(rawX)
    const y = Number(rawY)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return

    if (!byCategory.has(category)) {
      byCategory.set(category, [])
      order.push(category)
    }
    byCategory.get(category)!.push({ x, y })
  })

  return order.map((category, index) => ({
    key: category,
    label: category,
    color: resolveColor(category, index, customColors),
    points: byCategory.get(category) ?? [],
  }))
}

export interface SeriesTotal {
  key: string
  label: string
  color: string
  total: number
}

/** Sum of every numeric series, in the order the CSV columns appear. Used for
 * the generic stat-card summary shown next to a chart. */
export function computeSeriesTotals(
  data: ParsedChartData,
  customColors?: Record<string, string>
): SeriesTotal[] {
  const series = getSeries(data)
  const rows = toChartRows(data)

  return series.map(({ key, label }, index) => {
    const total = rows.reduce((sum, row) => {
      const value = Number(row[key])
      return sum + (Number.isFinite(value) ? value : 0)
    }, 0)
    return { key, label, color: resolveColor(key, index, customColors), total }
  })
}

/** Percent change of the first numeric series from its first row to its last
 * row. Returns null when it can't be computed (too few rows, zero baseline). */
export function computeGrowth(data: ParsedChartData): number | null {
  const series = getSeries(data)
  if (series.length === 0) return null

  const rows = toChartRows(data)
  if (rows.length < 2) return null

  const key = series[0].key
  const rawFirst = rows[0][key]
  const rawLast = rows[rows.length - 1][key]
  if (rawFirst === null || rawLast === null) return null
  const first = Number(rawFirst)
  const last = Number(rawLast)
  if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return null

  return ((last - first) / Math.abs(first)) * 100
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}
