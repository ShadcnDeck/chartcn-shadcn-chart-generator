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

/** A column as it appears in *generated* code: the user's own header/field
 * name wherever Recharts and CSS can take it, so the exported component
 * accepts their API/database rows as-is. `internalKey` is the sanitized key
 * the live preview (and saved customColors) use. */
export interface ExportField {
  key: string
  label: string
  internalKey: string
  /** True when `--color-<key>` is a valid CSS custom property name, so the
   * generated code can reference `var(--color-<key>)`. Otherwise it inlines
   * the resolved color. */
  cssSafe: boolean
}

// Recharts resolves string dataKeys as lodash-style paths, so "a.b" or "a[0]"
// would read a nested value instead of the literal key.
const RECHARTS_PATH_CHARS = /[.[\]]/
const CSS_IDENT_CHARS = /^[A-Za-z0-9_-]+$/
const JS_IDENTIFIER = /^[A-Za-z_$][\w$]*$/

function toExportKey(header: string, fallback: string, used: Set<string>): string {
  let key = header.trim()
  if (!key || RECHARTS_PATH_CHARS.test(key)) {
    key =
      key
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || fallback
  }
  let unique = key
  for (let n = 2; used.has(unique); n++) unique = `${key}_${n}`
  used.add(unique)
  return unique
}

/** Category + series fields keyed by the user's real column names. */
export function getExportFields(data: ParsedChartData): {
  category: ExportField
  series: ExportField[]
} {
  const used = new Set<string>()
  const categoryKey = toExportKey(data.headers[0] ?? "", CATEGORY_KEY, used)
  const category: ExportField = {
    key: categoryKey,
    label: data.headers[0] ?? CATEGORY_KEY,
    internalKey: CATEGORY_KEY,
    cssSafe: CSS_IDENT_CHARS.test(categoryKey),
  }
  const series = getSeries(data).map(({ key: internalKey, label }, index) => {
    const key = toExportKey(label, `value${index + 1}`, used)
    return { key, label, internalKey, cssSafe: CSS_IDENT_CHARS.test(key) }
  })
  return { category, series }
}

/** Rows keyed by export field names, i.e. the shape the generated component expects. */
export function toExportRows(data: ParsedChartData): ChartDataRow[] {
  const { category, series } = getExportFields(data)
  const categoryHeader = data.headers[0]
  return data.rows.map((row) => {
    const mapped: ChartDataRow = { [category.key]: row[categoryHeader] ?? null }
    series.forEach(({ key, label }) => {
      mapped[key] = row[label] ?? null
    })
    return mapped
  })
}

/** Object-literal / type-literal property name: bare when it's a valid JS
 * identifier, quoted otherwise (e.g. "Product A"). */
export function toPropertyKey(key: string): string {
  return JS_IDENTIFIER.test(key) ? key : JSON.stringify(key)
}

/** Property access expression, e.g. `row.revenue` or `row["Product A"]`. */
export function toPropertyAccess(object: string, key: string): string {
  return JS_IDENTIFIER.test(key) ? `${object}.${key}` : `${object}[${JSON.stringify(key)}]`
}

/** The breakdown tooltip only makes sense with more than one series. */
export function usesBreakdownTooltip(seriesCount: number, style?: "breakdown" | "simple"): boolean {
  return seriesCount > 1 && (style ?? "breakdown") === "breakdown"
}

const SAFE_COLOR_RE =
  /^(#[0-9a-fA-F]{3,8}|(rgb|rgba|hsl|hsla|oklch|oklab)\([0-9.,%\s/+-]+\)|var\(--chart-\d\))$/

/** True for colors that are safe to drop into CSS or an SVG attribute: hex,
 * numeric color functions, or a palette variable. Custom colors arrive from
 * share links, which anyone can craft. */
export function isSafeColor(value: unknown): value is string {
  return typeof value === "string" && SAFE_COLOR_RE.test(value.trim())
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

export interface KpiSummary {
  label: string
  latest: number | null
  previous: number | null
  /** Percent change from `previous` to `latest`, null when not computable. */
  delta: number | null
  firstCategory: string
  lastCategory: string
}

/** Headline numbers for the KPI card: the latest value of the first series
 * and its change vs. the previous non-blank value. */
export function computeKpi(data: ParsedChartData): KpiSummary {
  const series = getSeries(data)[0]
  const rows = toChartRows(data)
  const values = series
    ? rows
        .map((row) => row[series.key])
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    : []
  const latest = values.length > 0 ? values[values.length - 1] : null
  const previous = values.length > 1 ? values[values.length - 2] : null
  const delta =
    latest !== null && previous !== null && previous !== 0
      ? ((latest - previous) / Math.abs(previous)) * 100
      : null

  return {
    label: series?.label ?? "",
    latest,
    previous,
    delta,
    firstCategory: String(rows[0]?.[CATEGORY_KEY] ?? ""),
    lastCategory: String(rows[rows.length - 1]?.[CATEGORY_KEY] ?? ""),
  }
}

/** Rows ordered by their first series value, for ranked horizontal bars. */
export function sortRowsByFirstSeries(
  rows: ChartDataRow[],
  key: string | undefined,
  order: "none" | "desc" | "asc" = "none"
): ChartDataRow[] {
  if (order === "none" || !key) return rows
  const sign = order === "desc" ? -1 : 1
  return [...rows].sort((a, b) => sign * (Number(a[key] ?? 0) - Number(b[key] ?? 0)))
}

/** Radial bars are drawn against at least 0–100, so percentages read as
 * progress toward a goal; larger values scale to the biggest one. */
export function radialDomainMax(values: number[]): number {
  return Math.max(100, ...values.filter((value) => Number.isFinite(value)))
}

export function formatPercentTick(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "percent" }).format(value)
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}
