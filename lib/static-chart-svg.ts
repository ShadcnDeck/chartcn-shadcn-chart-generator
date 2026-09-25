/** Server-side SVG rendering for README / docs image URLs (`/api/chart`).
 *
 * Recharts 3 lays charts out in effects, so it renders an empty <svg> on the
 * server. This is a small dependency-free renderer that draws the same chart
 * types with the same look (palette, dashed grid, rounded gradient bars,
 * monotone curves, ...) as a static, self-contained SVG. It is not pixel-
 * identical to the live preview; the client-side PNG/SVG download is. */

import {
  CATEGORY_KEY,
  computeKpi,
  formatCompactNumber,
  formatDateTick,
  getSeries,
  isDateAxis,
  isSafeColor,
  radialDomainMax,
  resolveColor,
  sortRowsByFirstSeries,
  toChartRows,
  toScatterGroups,
} from "@/lib/chart-data"
import { barRadius, comboRenderType, horizontalLabelWidth } from "@/lib/chart-style"
import type { ChartDataRow, ChartOptions, ChartType, ParsedChartData } from "@/types/chart"

export type StaticTheme = "light" | "dark"

// Keep in sync with the --chart-*, --card, --foreground, ... tokens in app/globals.css.
const THEMES = {
  light: {
    background: "#fcfcfb",
    foreground: "#0b0b0b",
    muted: "#6b6a65",
    grid: "rgba(11,11,11,0.1)",
    track: "#f0efec",
    positive: "#059669",
    negative: "#dc2626",
    palette: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"],
  },
  dark: {
    background: "#1a1a19",
    foreground: "#ffffff",
    muted: "#b4b3ab",
    grid: "rgba(255,255,255,0.1)",
    track: "#242422",
    positive: "#34d399",
    negative: "#f87171",
    palette: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"],
  },
} as const

type Theme = (typeof THEMES)[StaticTheme]

export interface StaticRenderOptions {
  theme?: StaticTheme
  width?: number
  height?: number
  title?: string
  /** Omit the card background, e.g. to sit on a README's own background. */
  transparent?: boolean
}

const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
const PAD = 20
const LEGEND_ROW = 22
const CHAR_WIDTH = 6.6 // approx. width of a 12px glyph

// ---------------------------------------------------------------- helpers

export function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`)
}

function toColor(value: string, index: number, theme: Theme): string {
  const variable = value.match(/^var\(--chart-(\d)\)$/)
  if (variable) return theme.palette[(Number(variable[1]) - 1) % theme.palette.length]
  // Only colors that can't break out of an attribute get through; anything
  // else (e.g. smuggled into a share link) falls back to the palette.
  return isSafeColor(value) ? value : theme.palette[index % theme.palette.length]
}

const r2 = (value: number) => Math.round(value * 100) / 100

function text(
  x: number,
  y: number,
  content: string,
  attrs: Record<string, string | number> = {}
): string {
  const rest = Object.entries(attrs)
    .map(([key, value]) => ` ${key}="${escapeXml(String(value))}"`)
    .join("")
  return `<text x="${r2(x)}" y="${r2(y)}"${rest}>${escapeXml(content)}</text>`
}

function textWidth(value: string, size = 12): number {
  return value.length * CHAR_WIDTH * (size / 12)
}

function niceStep(range: number, count: number): number {
  const raw = range / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const normalized = raw / magnitude
  // d3's thresholds (√50, √10, √2): pick the 1/2/5/10 step closest to `raw`.
  const step = normalized >= 7.07 ? 10 : normalized >= 3.16 ? 5 : normalized >= 1.41 ? 2 : 1
  return step * magnitude
}

/** A "nice" linear domain and its ticks, like d3's scale.nice(). */
export function niceScale(min: number, max: number, count = 5): { min: number; max: number; ticks: number[] } {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1, ticks: [0, 1] }
  if (min === max) {
    if (min === 0) return { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] }
    min = Math.min(0, min)
    max = Math.max(0, max)
  }
  const step = niceStep(max - min, count)
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v / step) * step)
  return { min: lo, max: hi, ticks }
}

function linear(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain
  const [r0, r1] = range
  return (value: number) => (d1 === d0 ? r0 : r0 + ((value - d0) / (d1 - d0)) * (r1 - r0))
}

/** Rect path with per-corner radii [topLeft, topRight, bottomRight, bottomLeft]. */
function roundedRect(x: number, y: number, w: number, h: number, radii: number[]): string {
  if (w <= 0 || h <= 0) return ""
  const [tl, tr, br, bl] = radii.map((r) => Math.min(r, w / 2, h / 2))
  return [
    `M${r2(x + tl)},${r2(y)}`,
    `H${r2(x + w - tr)}`,
    tr ? `A${tr},${tr} 0 0 1 ${r2(x + w)},${r2(y + tr)}` : "",
    `V${r2(y + h - br)}`,
    br ? `A${br},${br} 0 0 1 ${r2(x + w - br)},${r2(y + h)}` : "",
    `H${r2(x + bl)}`,
    bl ? `A${bl},${bl} 0 0 1 ${r2(x)},${r2(y + h - bl)}` : "",
    `V${r2(y + tl)}`,
    tl ? `A${tl},${tl} 0 0 1 ${r2(x + tl)},${r2(y)}` : "",
    "Z",
  ].join("")
}

type Point = [number, number]

/** Monotone cubic interpolation (d3's curveMonotoneX), which is also what
 * Recharts' "monotone" curve uses: smooth, but never overshoots the data. */
export function monotonePath(points: Point[]): string {
  const n = points.length
  if (n === 0) return ""
  if (n < 3) return `M${points.map(([x, y]) => `${r2(x)},${r2(y)}`).join("L")}`

  const sign = (v: number) => (v < 0 ? -1 : 1)
  const tangents = new Array<number>(n)
  for (let i = 1; i < n - 1; i++) {
    const h0 = points[i][0] - points[i - 1][0]
    const h1 = points[i + 1][0] - points[i][0]
    const s0 = (points[i][1] - points[i - 1][1]) / (h0 || 1)
    const s1 = (points[i + 1][1] - points[i][1]) / (h1 || 1)
    const p = (s0 * h1 + s1 * h0) / (h0 + h1 || 1)
    tangents[i] = (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0
  }
  const edge = (a: Point, b: Point, t: number) => {
    const h = b[0] - a[0]
    return h ? ((3 * (b[1] - a[1])) / h - t) / 2 : t
  }
  tangents[0] = edge(points[0], points[1], tangents[1])
  tangents[n - 1] = edge(points[n - 2], points[n - 1], tangents[n - 2])

  let d = `M${r2(points[0][0])},${r2(points[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    const dx = (x1 - x0) / 3
    d += `C${r2(x0 + dx)},${r2(y0 + dx * tangents[i])} ${r2(x1 - dx)},${r2(y1 - dx * tangents[i + 1])} ${r2(x1)},${r2(y1)}`
  }
  return d
}

function linearPath(points: Point[]): string {
  return points.length ? `M${points.map(([x, y]) => `${r2(x)},${r2(y)}`).join("L")}` : ""
}

/** Consecutive runs of non-null points; a blank value breaks the line. */
function segments(points: (Point | null)[]): Point[][] {
  const runs: Point[][] = [[]]
  points.forEach((point) => {
    if (point) runs[runs.length - 1].push(point)
    else if (runs[runs.length - 1].length) runs.push([])
  })
  return runs.filter((run) => run.length > 0)
}

function polar(cx: number, cy: number, r: number, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)]
}

/** Arc from `start` to `end` degrees (math convention: 0 = east, CCW positive). */
function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const [x0, y0] = polar(cx, cy, r, start)
  const [x1, y1] = polar(cx, cy, r, end)
  const large = Math.abs(end - start) > 180 ? 1 : 0
  const sweep = end < start ? 1 : 0
  return `M${r2(x0)},${r2(y0)}A${r2(r)},${r2(r)} 0 ${large} ${sweep} ${r2(x1)},${r2(y1)}`
}

function sectorPath(cx: number, cy: number, inner: number, outer: number, start: number, end: number): string {
  const [ox0, oy0] = polar(cx, cy, outer, start)
  const [ox1, oy1] = polar(cx, cy, outer, end)
  const large = Math.abs(end - start) > 180 ? 1 : 0
  if (inner <= 0) {
    return `M${r2(cx)},${r2(cy)}L${r2(ox0)},${r2(oy0)}A${r2(outer)},${r2(outer)} 0 ${large} 0 ${r2(ox1)},${r2(oy1)}Z`
  }
  const [ix1, iy1] = polar(cx, cy, inner, end)
  const [ix0, iy0] = polar(cx, cy, inner, start)
  return `M${r2(ox0)},${r2(oy0)}A${r2(outer)},${r2(outer)} 0 ${large} 0 ${r2(ox1)},${r2(oy1)}L${r2(ix1)},${r2(iy1)}A${r2(inner)},${r2(inner)} 0 ${large} 1 ${r2(ix0)},${r2(iy0)}Z`
}

interface LegendItem {
  label: string
  color: string
}

function legendRows(items: LegendItem[], width: number): LegendItem[][] {
  const rows: LegendItem[][] = [[]]
  let used = 0
  items.forEach((item) => {
    const w = 16 + textWidth(item.label)
    const needed = used === 0 ? w : used + 16 + w
    if (needed > width - PAD * 2 && used > 0) {
      rows.push([item])
      used = w
    } else {
      rows[rows.length - 1].push(item)
      used = needed
    }
  })
  return rows
}

function renderLegend(items: LegendItem[], width: number, top: number, theme: Theme): string {
  return legendRows(items, width)
    .map((row, index) => {
      const total = row.reduce((sum, item) => sum + 16 + textWidth(item.label), 0) + 16 * (row.length - 1)
      let x = (width - total) / 2
      const y = top + index * LEGEND_ROW
      return row
        .map((item) => {
          const part =
            `<rect x="${r2(x)}" y="${y + 1}" width="10" height="10" rx="2" fill="${item.color}"/>` +
            text(x + 16, y + 10, item.label, { fill: theme.foreground, "font-size": 12 })
          x += 16 + textWidth(item.label) + 16
          return part
        })
        .join("")
    })
    .join("")
}

function legendHeight(items: LegendItem[], width: number): number {
  return items.length ? legendRows(items, width).length * LEGEND_ROW + 8 : 0
}

interface Frame {
  width: number
  height: number
  theme: Theme
  /** Top of the drawing area, below the title if any. */
  top: number
}

function gradient(id: string, color: string, from: number, to: number, horizontal = false): string {
  const direction = horizontal ? 'x1="0" y1="0" x2="1" y2="0"' : 'x1="0" y1="0" x2="0" y2="1"'
  return `<linearGradient id="${id}" ${direction}><stop offset="0%" stop-color="${color}" stop-opacity="${from}"/><stop offset="100%" stop-color="${color}" stop-opacity="${to}"/></linearGradient>`
}

// ---------------------------------------------------------------- cartesian

function cartesian(
  type: "bar" | "line" | "area" | "combo",
  data: ParsedChartData,
  options: ChartOptions,
  frame: Frame
): string {
  const { width, height, theme } = frame
  const series = getSeries(data)
  const rows = toChartRows(data)
  const colors = series.map((s, i) => toColor(resolveColor(s.key, i, options.customColors), i, theme))
  const legend = series.map((s, i) => ({ label: s.label, color: colors[i] }))
  const stackMode = type === "bar" || type === "area" ? (options.stackMode ?? "none") : "none"
  const stacked = stackMode !== "none"
  const dateAxis = isDateAxis(data)
  const renderAs = series.map((s, i) =>
    type === "combo" ? comboRenderType(s.key, i, options.seriesRenderType) : type === "bar" ? "bar" : "line"
  )

  // Value extents, per stacking mode.
  const value = (row: ChartDataRow, key: string) => {
    const v = row[key]
    return typeof v === "number" && Number.isFinite(v) ? v : null
  }
  const rowTotals = rows.map((row) => series.reduce((sum, s) => sum + Math.abs(value(row, s.key) ?? 0), 0))
  const normalize = (v: number, rowIndex: number) =>
    stackMode === "percent" ? (rowTotals[rowIndex] ? v / rowTotals[rowIndex] : 0) : v

  let lo = 0
  let hi = 0
  rows.forEach((row, rowIndex) => {
    let cumulative = 0
    series.forEach((s) => {
      const v = value(row, s.key)
      if (v === null) return
      const n = normalize(v, rowIndex)
      if (stacked) {
        cumulative += n
        hi = Math.max(hi, cumulative)
        lo = Math.min(lo, cumulative)
      } else {
        hi = Math.max(hi, n)
        lo = Math.min(lo, n)
      }
    })
  })
  const y = stackMode === "percent" ? { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] } : niceScale(lo, hi)
  const tickLabel = (v: number) =>
    stackMode === "percent" ? `${Math.round(v * 100)}%` : formatCompactNumber(v)

  const axisWidth = Math.max(...y.ticks.map((t) => textWidth(tickLabel(t)))) + 12
  const legendH = legendHeight(legend, width)
  const left = PAD + axisWidth
  const right = width - PAD
  const top = frame.top + 8
  const bottom = height - PAD - legendH - 24
  const yScale = linear([y.min, y.max], [bottom, top])

  const n = rows.length
  const hasBars = renderAs.includes("bar")
  // Bars sit in bands; pure line/area charts put points edge to edge (like
  // Recharts' point scale).
  const band = (right - left) / Math.max(n, 1)
  const xCenter = (i: number) =>
    hasBars ? left + band * (i + 0.5) : n > 1 ? left + ((right - left) * i) / (n - 1) : (left + right) / 2

  const parts: string[] = []
  const defs: string[] = []

  y.ticks.forEach((t) => {
    const ty = yScale(t)
    parts.push(
      `<line x1="${left}" x2="${right}" y1="${r2(ty)}" y2="${r2(ty)}" stroke="${theme.grid}" stroke-dasharray="3 5"/>`,
      text(left - 8, ty + 4, tickLabel(t), { fill: theme.muted, "font-size": 12, "text-anchor": "end" })
    )
  })

  const labels = rows.map((row) => {
    const raw = String(row[CATEGORY_KEY] ?? "")
    return dateAxis ? formatDateTick(raw) : raw
  })
  const labelEvery = Math.max(1, Math.ceil((n * (Math.max(...labels.map((l) => textWidth(l)), 0) + 12)) / (right - left)))
  labels.forEach((label, i) => {
    if (i % labelEvery !== 0) return
    parts.push(text(xCenter(i), bottom + 20, label, { fill: theme.muted, "font-size": 12, "text-anchor": "middle" }))
  })

  // Bars
  const barSeries = series.map((s, i) => ({ ...s, index: i })).filter((_, i) => renderAs[i] === "bar")
  if (barSeries.length) {
    const groupWidth = band * 0.7
    const barWidth = stacked
      ? Math.min(groupWidth, 48)
      : Math.min((groupWidth - 4 * (barSeries.length - 1)) / barSeries.length, 36)
    const groupSpan = stacked ? barWidth : barWidth * barSeries.length + 4 * (barSeries.length - 1)
    barSeries.forEach(({ index }) => defs.push(gradient(`fill-${index}`, colors[index], 1, 0.55)))
    rows.forEach((row, rowIndex) => {
      let cumulative = 0
      barSeries.forEach(({ key, index }, position) => {
        const v = value(row, key)
        if (v === null) return
        const n = normalize(v, rowIndex)
        const from = stacked ? cumulative : 0
        const to = stacked ? cumulative + n : n
        cumulative = to
        const x = xCenter(rowIndex) - groupSpan / 2 + (stacked ? 0 : position * (barWidth + 4))
        const y0 = yScale(Math.max(from, to))
        const h = Math.abs(yScale(from) - yScale(to))
        const radius = type === "combo" ? [6, 6, 0, 0] : barRadius(position, barSeries.length, stacked, false)
        parts.push(`<path d="${roundedRect(x, y0, barWidth, h, radius)}" fill="url(#fill-${index})"/>`)
      })
    })
  }

  // Lines and areas
  const cumulativeBase = rows.map(() => 0)
  series.forEach((s, index) => {
    if (renderAs[index] !== "line") return
    const points = rows.map((row, rowIndex) => {
      const v = value(row, s.key)
      if (v === null) return null
      const n = normalize(v, rowIndex)
      return [xCenter(rowIndex), yScale(stacked ? cumulativeBase[rowIndex] + n : n)] as Point
    })
    const bases = rows.map((_, rowIndex) => yScale(stacked ? cumulativeBase[rowIndex] : Math.max(y.min, 0)))
    const smooth = type === "area" || type === "combo" || options.smooth
    const path = smooth ? monotonePath : linearPath

    if (type === "area") {
      defs.push(gradient(`fill-${index}`, colors[index], 0.85, 0.04))
      segments(points.map((p, i) => (p ? ([i, 0] as Point) : null))).forEach((run) => {
        const idx = run.map(([i]) => i)
        const topPts = idx.map((i) => points[i] as Point)
        const basePts = idx.map((i) => [xCenter(i), bases[i]] as Point).reverse()
        const d = `${path(topPts)}${path(basePts).replace(/^M/, "L")}Z`
        parts.push(`<path d="${d}" fill="url(#fill-${index})"/>`)
      })
    }
    segments(points).forEach((run) => {
      parts.push(
        `<path d="${path(run)}" fill="none" stroke="${colors[index]}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`
      )
      const dots = type === "line" ? (options.showDots ?? true) : type === "combo"
      if (dots) {
        run.forEach(([cx, cy]) =>
          parts.push(
            `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="3" fill="${theme.background}" stroke="${colors[index]}" stroke-width="2"/>`
          )
        )
      }
    })
    if (stacked) {
      rows.forEach((row, rowIndex) => {
        cumulativeBase[rowIndex] += normalize(value(row, s.key) ?? 0, rowIndex)
      })
    }
  })

  parts.push(renderLegend(legend, width, height - PAD - legendH + 8, theme))
  return `<defs>${defs.join("")}</defs>${parts.join("")}`
}

// ---------------------------------------------------------------- horizontal bar

function horizontalBar(data: ParsedChartData, options: ChartOptions, frame: Frame): string {
  const { width, height, theme } = frame
  const series = getSeries(data)
  const stackMode = options.stackMode ?? "none"
  const stacked = stackMode !== "none"
  const showValues = (options.showValues ?? true) && !stacked
  const rows = sortRowsByFirstSeries(toChartRows(data), series[0]?.key, options.sortBars)
  const colors = series.map((s, i) => toColor(resolveColor(s.key, i, options.customColors), i, theme))
  const legend = series.length > 1 ? series.map((s, i) => ({ label: s.label, color: colors[i] })) : []

  const num = (row: ChartDataRow, key: string) => {
    const v = row[key]
    return typeof v === "number" && Number.isFinite(v) ? v : 0
  }
  const totals = rows.map((row) => series.reduce((sum, s) => sum + Math.abs(num(row, s.key)), 0))
  const normalize = (v: number, i: number) => (stackMode === "percent" ? (totals[i] ? v / totals[i] : 0) : v)
  const maxValue = Math.max(
    0,
    ...rows.map((row, i) =>
      stacked
        ? series.reduce((sum, s) => sum + normalize(num(row, s.key), i), 0)
        : Math.max(...series.map((s) => num(row, s.key)))
    )
  )
  const x = stackMode === "percent" ? { min: 0, max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] } : niceScale(0, maxValue)
  const tickLabel = (v: number) => (stackMode === "percent" ? `${Math.round(v * 100)}%` : formatCompactNumber(v))

  const labelWidth = horizontalLabelWidth(rows.map((row) => String(row[CATEGORY_KEY] ?? "")))
  const legendH = legendHeight(legend, width)
  const left = PAD + labelWidth
  const right = width - PAD - (showValues ? 40 : 12)
  const top = frame.top + 4
  const bottom = height - PAD - legendH - 24
  const xScale = linear([x.min, x.max], [left, right])
  const band = (bottom - top) / Math.max(rows.length, 1)
  const groupHeight = band * 0.76
  const barHeight = stacked
    ? Math.min(groupHeight, 28)
    : Math.min((groupHeight - 4 * (series.length - 1)) / series.length, 28)
  const groupSpan = stacked ? barHeight : barHeight * series.length + 4 * (series.length - 1)

  const defs = series.map((_, i) => gradient(`fill-${i}`, colors[i], 0.55, 1, true))
  const parts: string[] = []
  x.ticks.forEach((t) => {
    const tx = xScale(t)
    parts.push(
      `<line x1="${r2(tx)}" x2="${r2(tx)}" y1="${top}" y2="${bottom}" stroke="${theme.grid}" stroke-dasharray="3 5"/>`,
      text(tx, bottom + 20, tickLabel(t), { fill: theme.muted, "font-size": 12, "text-anchor": "middle" })
    )
  })
  rows.forEach((row, rowIndex) => {
    const center = top + band * (rowIndex + 0.5)
    parts.push(
      text(left - 8, center + 4, String(row[CATEGORY_KEY] ?? ""), {
        fill: theme.muted,
        "font-size": 12,
        "text-anchor": "end",
      })
    )
    let cumulative = 0
    series.forEach((s, index) => {
      const v = normalize(num(row, s.key), rowIndex)
      const from = stacked ? cumulative : 0
      const to = from + v
      cumulative = to
      const y0 = center - groupSpan / 2 + (stacked ? 0 : index * (barHeight + 4))
      const x0 = xScale(Math.min(from, to))
      const w = Math.abs(xScale(to) - xScale(from))
      parts.push(
        `<path d="${roundedRect(x0, y0, w, barHeight, barRadius(index, series.length, stacked, true))}" fill="url(#fill-${index})"/>`
      )
      if (showValues) {
        parts.push(
          text(x0 + w + 8, y0 + barHeight / 2 + 4, formatCompactNumber(num(row, s.key)), {
            fill: theme.foreground,
            "font-size": 12,
          })
        )
      }
    })
  })
  parts.push(renderLegend(legend, width, height - PAD - legendH + 8, theme))
  return `<defs>${defs.join("")}</defs>${parts.join("")}`
}

// ---------------------------------------------------------------- pie

function pie(data: ParsedChartData, options: ChartOptions, frame: Frame): string {
  const { width, height, theme } = frame
  const key = getSeries(data)[0]?.key
  const rows = key ? toChartRows(data).filter((row) => typeof row[key] === "number") : []
  const values = rows.map((row) => Math.max(0, Number(row[key!])))
  const total = values.reduce((a, b) => a + b, 0)
  const colors = rows.map((row, i) =>
    toColor(resolveColor(String(row[CATEGORY_KEY]), i, options.customColors), i, theme)
  )
  const legend = rows.map((row, i) => ({ label: String(row[CATEGORY_KEY]), color: colors[i] }))
  const donut = options.donut ?? false
  const labelType = options.labelType ?? "value"

  const legendH = legendHeight(legend, width)
  const areaTop = frame.top
  const areaBottom = height - PAD - legendH
  const cx = width / 2
  const cy = (areaTop + areaBottom) / 2
  const outer = Math.max(20, Math.min(width / 2 - PAD, (areaBottom - areaTop) / 2) - (donut ? 8 : 28))
  const inner = donut ? outer * 0.62 : 0
  const padAngle = donut && rows.length > 1 ? 2 : 0

  const parts: string[] = []
  let angle = 0
  values.forEach((v, i) => {
    const sweep = total ? (v / total) * 360 : 0
    if (sweep <= 0) return
    const start = angle + padAngle / 2
    const end = angle + sweep - padAngle / 2
    parts.push(
      `<path d="${sectorPath(cx, cy, inner, outer, start, Math.max(start + 0.01, end))}" fill="${colors[i]}" stroke="${theme.background}" stroke-width="2"/>`
    )
    if (!donut) {
      const mid = angle + sweep / 2
      const [lx, ly] = polar(cx, cy, outer + 16, mid)
      const label =
        labelType === "percent"
          ? `${Math.round((v / total) * 100)}%`
          : labelType === "label"
            ? String(rows[i][CATEGORY_KEY])
            : String(v)
      const cos = Math.cos((mid * Math.PI) / 180)
      parts.push(
        text(lx, ly + 4, label, {
          fill: theme.foreground,
          "font-size": 12,
          "text-anchor": cos > 0.2 ? "start" : cos < -0.2 ? "end" : "middle",
        })
      )
    }
    angle += sweep
  })
  if (donut) {
    parts.push(
      text(cx, cy + 4, formatCompactNumber(total), {
        fill: theme.foreground,
        "font-size": 24,
        "font-weight": 600,
        "text-anchor": "middle",
      }),
      text(cx, cy + 26, "Total", { fill: theme.muted, "font-size": 12, "text-anchor": "middle" })
    )
  }
  parts.push(renderLegend(legend, width, areaBottom + 8, theme))
  return parts.join("")
}

// ---------------------------------------------------------------- radar

function radar(data: ParsedChartData, options: ChartOptions, frame: Frame): string {
  const { width, height, theme } = frame
  const series = getSeries(data)
  const rows = toChartRows(data)
  const colors = series.map((s, i) => toColor(resolveColor(s.key, i, options.customColors), i, theme))
  const legend = series.map((s, i) => ({ label: s.label, color: colors[i] }))
  const legendH = legendHeight(legend, width)
  const areaBottom = height - PAD - legendH
  const cx = width / 2
  const cy = (frame.top + areaBottom) / 2
  const radius = Math.max(20, Math.min(width / 2 - 90, (areaBottom - frame.top) / 2 - 24))
  const maxValue = Math.max(
    0,
    ...rows.flatMap((row) => series.map((s) => (typeof row[s.key] === "number" ? Number(row[s.key]) : 0)))
  )
  const scale = niceScale(0, maxValue)
  const n = rows.length
  const angleAt = (i: number) => 90 - (360 * i) / Math.max(n, 1)

  const parts: string[] = []
  for (let level = 1; level <= 5; level++) {
    const r = (radius * level) / 5
    const pts = rows.map((_, i) => polar(cx, cy, r, angleAt(i)))
    parts.push(`<path d="${linearPath(pts)}Z" fill="none" stroke="${theme.grid}" stroke-dasharray="3 5"/>`)
  }
  rows.forEach((row, i) => {
    const [x, y] = polar(cx, cy, radius, angleAt(i))
    parts.push(`<line x1="${cx}" y1="${r2(cy)}" x2="${r2(x)}" y2="${r2(y)}" stroke="${theme.grid}" stroke-dasharray="3 5"/>`)
    const [lx, ly] = polar(cx, cy, radius + 14, angleAt(i))
    const cos = Math.cos((angleAt(i) * Math.PI) / 180)
    parts.push(
      text(lx, ly + 4, String(row[CATEGORY_KEY] ?? ""), {
        fill: theme.muted,
        "font-size": 12,
        "text-anchor": cos > 0.2 ? "start" : cos < -0.2 ? "end" : "middle",
      })
    )
  })
  series.forEach((s, index) => {
    const pts = rows.map((row, i) => {
      const v = typeof row[s.key] === "number" ? Number(row[s.key]) : 0
      return polar(cx, cy, (radius * v) / (scale.max || 1), angleAt(i))
    })
    parts.push(
      `<path d="${linearPath(pts)}Z" fill="${colors[index]}" fill-opacity="0.25" stroke="${colors[index]}" stroke-width="2"/>`,
      ...pts.map(([x, y]) => `<circle cx="${r2(x)}" cy="${r2(y)}" r="3" fill="${colors[index]}"/>`)
    )
  })
  parts.push(renderLegend(legend, width, areaBottom + 8, theme))
  return parts.join("")
}

// ---------------------------------------------------------------- scatter

function scatter(data: ParsedChartData, options: ChartOptions, frame: Frame): string {
  const { width, height, theme } = frame
  const groups = toScatterGroups(data, options.customColors).map((group, i) => ({
    ...group,
    color: toColor(group.color, i, theme),
  }))
  const legend = groups.map((g) => ({ label: g.label, color: g.color }))
  const points = groups.flatMap((g) => g.points)
  const xs = niceScale(Math.min(0, ...points.map((p) => p.x)), Math.max(0, ...points.map((p) => p.x)))
  const ys = niceScale(Math.min(0, ...points.map((p) => p.y)), Math.max(0, ...points.map((p) => p.y)))
  const legendH = legendHeight(legend, width)
  const left = PAD + 56
  const right = width - PAD
  const top = frame.top + 8
  const bottom = height - PAD - legendH - 44
  const xScale = linear([xs.min, xs.max], [left, right])
  const yScale = linear([ys.min, ys.max], [bottom, top])
  const xLabel = data.headers[1] ?? "X"
  const yLabel = data.headers[2] ?? "Y"

  const parts: string[] = []
  xs.ticks.forEach((t) => {
    parts.push(
      `<line x1="${r2(xScale(t))}" x2="${r2(xScale(t))}" y1="${top}" y2="${bottom}" stroke="${theme.grid}" stroke-dasharray="3 5"/>`,
      text(xScale(t), bottom + 20, formatCompactNumber(t), { fill: theme.muted, "font-size": 12, "text-anchor": "middle" })
    )
  })
  ys.ticks.forEach((t) => {
    parts.push(
      `<line x1="${left}" x2="${right}" y1="${r2(yScale(t))}" y2="${r2(yScale(t))}" stroke="${theme.grid}" stroke-dasharray="3 5"/>`,
      text(left - 8, yScale(t) + 4, formatCompactNumber(t), { fill: theme.muted, "font-size": 12, "text-anchor": "end" })
    )
  })
  parts.push(
    text((left + right) / 2, bottom + 40, xLabel, { fill: theme.muted, "font-size": 12, "text-anchor": "middle" }),
    text(PAD + 4, (top + bottom) / 2, yLabel, {
      fill: theme.muted,
      "font-size": 12,
      "text-anchor": "middle",
      transform: `rotate(-90 ${PAD + 4} ${r2((top + bottom) / 2)})`,
    })
  )
  groups.forEach((group) =>
    group.points.forEach((p) =>
      parts.push(
        `<circle cx="${r2(xScale(p.x))}" cy="${r2(yScale(p.y))}" r="5" fill="${group.color}" fill-opacity="0.85"/>`
      )
    )
  )
  parts.push(renderLegend(legend, width, height - PAD - legendH + 8, theme))
  return parts.join("")
}

// ---------------------------------------------------------------- radial

function radial(data: ParsedChartData, options: ChartOptions, frame: Frame): string {
  const { width, height, theme } = frame
  const key = getSeries(data)[0]?.key
  const rows = key ? toChartRows(data).filter((row) => typeof row[key] === "number") : []
  const values = rows.map((row) => Number(row[key!]))
  const colors = rows.map((row, i) =>
    toColor(resolveColor(String(row[CATEGORY_KEY]), i, options.customColors), i, theme)
  )
  const legend = rows.map((row, i) => ({ label: String(row[CATEGORY_KEY]), color: colors[i] }))
  const half = options.halfGauge ?? false
  const max = radialDomainMax(values)

  const legendH = legendHeight(legend, width)
  const areaBottom = height - PAD - legendH
  const areaHeight = areaBottom - frame.top
  const cx = width / 2
  const cy = half ? frame.top + areaHeight * 0.78 : frame.top + areaHeight / 2
  const outer = half
    ? Math.min(width / 2 - PAD, areaHeight * 0.74)
    : Math.min(width / 2 - PAD, areaHeight / 2 - 8)
  const inner = outer * (half ? 0.42 : 0.32)
  const start = half ? 180 : 90
  const sweepTotal = half ? 180 : 360
  const ring = (outer - inner) / Math.max(rows.length, 1)
  const thickness = ring * 0.72

  const parts: string[] = []
  rows.forEach((_, i) => {
    const r = inner + ring * (i + 0.5)
    const track = sweepTotal === 360 ? null : arcPath(cx, cy, r, start, start - sweepTotal)
    parts.push(
      track
        ? `<path d="${track}" fill="none" stroke="${theme.track}" stroke-width="${r2(thickness)}" stroke-linecap="round"/>`
        : `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="none" stroke="${theme.track}" stroke-width="${r2(thickness)}"/>`
    )
    const fraction = Math.max(0, Math.min(1, values[i] / max))
    if (fraction <= 0) return
    const sweep = Math.min(sweepTotal - 0.01, fraction * sweepTotal)
    parts.push(
      `<path d="${arcPath(cx, cy, r, start, start - sweep)}" fill="none" stroke="${colors[i]}" stroke-width="${r2(thickness)}" stroke-linecap="round"/>`
    )
  })
  if (rows[0]) {
    parts.push(
      text(cx, half ? cy - 14 : cy + 2, values[0].toLocaleString("en-US"), {
        fill: theme.foreground,
        "font-size": 24,
        "font-weight": 600,
        "text-anchor": "middle",
      }),
      text(cx, half ? cy + 6 : cy + 22, String(rows[0][CATEGORY_KEY]), {
        fill: theme.muted,
        "font-size": 12,
        "text-anchor": "middle",
      })
    )
  }
  parts.push(renderLegend(legend, width, areaBottom + 8, theme))
  return parts.join("")
}

// ---------------------------------------------------------------- kpi

function kpi(data: ParsedChartData, options: ChartOptions, frame: Frame): string {
  const { width, height, theme } = frame
  const summary = computeKpi(data)
  const key = getSeries(data)[0]?.key
  const rows = toChartRows(data)
  const color = key ? toColor(resolveColor(key, 0, options.customColors), 0, theme) : theme.palette[0]
  const sparkType = options.sparkType ?? "area"

  const parts: string[] = []
  const top = frame.top
  parts.push(
    text(PAD, top + 14, summary.label, { fill: theme.muted, "font-size": 14 }),
    text(
      PAD,
      top + 52,
      summary.latest === null ? "–" : summary.latest.toLocaleString("en-US", { maximumFractionDigits: 2 }),
      { fill: theme.foreground, "font-size": 32, "font-weight": 600 }
    )
  )
  if (summary.delta !== null) {
    const positive = summary.delta >= 0
    const label = `${positive ? "▲" : "▼"} ${Math.abs(summary.delta).toFixed(1)}%`
    const w = textWidth(label) + 16
    const badgeColor = positive ? theme.positive : theme.negative
    parts.push(
      `<rect x="${r2(width - PAD - w)}" y="${top}" width="${r2(w)}" height="22" rx="11" fill="${badgeColor}" fill-opacity="0.12"/>`,
      text(width - PAD - w / 2, top + 15, label, {
        fill: badgeColor,
        "font-size": 12,
        "font-weight": 500,
        "text-anchor": "middle",
      })
    )
  }

  const sparkTop = top + 72
  const sparkBottom = height - PAD - 24
  const left = PAD
  const right = width - PAD
  const values = key ? rows.map((row) => (typeof row[key] === "number" ? Number(row[key]) : null)) : []
  const finite = values.filter((v): v is number => v !== null)
  const lo = sparkType === "bar" ? Math.min(0, ...finite) : Math.min(...finite)
  const hi = Math.max(...finite)
  const yScale = linear([lo, hi === lo ? lo + 1 : hi], [sparkBottom, sparkTop + 4])
  const n = values.length

  if (sparkType === "bar") {
    const band = (right - left) / Math.max(n, 1)
    values.forEach((v, i) => {
      if (v === null) return
      const y0 = yScale(Math.max(v, 0))
      parts.push(
        `<path d="${roundedRect(left + band * i + band * 0.15, y0, band * 0.7, Math.abs(yScale(0) - y0), [3, 3, 0, 0])}" fill="${color}"/>`
      )
    })
  } else {
    const points = values.map((v, i) =>
      v === null ? null : ([n > 1 ? left + ((right - left) * i) / (n - 1) : left, yScale(v)] as Point)
    )
    segments(points).forEach((run) => {
      if (sparkType === "area") {
        const d = `${monotonePath(run)}L${r2(run[run.length - 1][0])},${sparkBottom}L${r2(run[0][0])},${sparkBottom}Z`
        parts.push(`<path d="${d}" fill="url(#spark-fill)"/>`)
      }
      parts.push(`<path d="${monotonePath(run)}" fill="none" stroke="${color}" stroke-width="2"/>`)
    })
  }
  parts.push(
    text(PAD, height - PAD, `${summary.firstCategory} – ${summary.lastCategory}`, {
      fill: theme.muted,
      "font-size": 12,
    })
  )
  return `<defs>${gradient("spark-fill", color, 0.5, 0)}</defs>${parts.join("")}`
}

// ---------------------------------------------------------------- entry

export const DEFAULT_SIZES: Partial<Record<ChartType, { width: number; height: number }>> = {
  pie: { width: 520, height: 440 },
  radar: { width: 560, height: 460 },
  radial: { width: 480, height: 440 },
  kpi: { width: 480, height: 240 },
}

export function renderStaticChartSvg(
  type: ChartType,
  data: ParsedChartData,
  chartOptions: ChartOptions = {},
  render: StaticRenderOptions = {}
): string {
  const theme = THEMES[render.theme ?? "light"]
  const defaults = DEFAULT_SIZES[type] ?? { width: 800, height: 400 }
  const width = Math.round(Math.min(2000, Math.max(240, render.width ?? defaults.width)))
  const height = Math.round(Math.min(2000, Math.max(160, render.height ?? defaults.height)))
  const title = render.title?.trim().slice(0, 120)
  const frame: Frame = { width, height, theme, top: PAD + (title ? 30 : 0) }

  let body: string
  if (data.headers.length < 2 || data.rows.length === 0) {
    body = text(width / 2, height / 2, "No data", { fill: theme.muted, "font-size": 14, "text-anchor": "middle" })
  } else {
    switch (type) {
      case "bar":
      case "line":
      case "area":
      case "combo":
        body = cartesian(type, data, chartOptions, frame)
        break
      case "horizontal-bar":
        body = horizontalBar(data, chartOptions, frame)
        break
      case "pie":
        body = pie(data, chartOptions, frame)
        break
      case "radar":
        body = radar(data, chartOptions, frame)
        break
      case "scatter":
        body = scatter(data, chartOptions, frame)
        break
      case "radial":
        body = radial(data, chartOptions, frame)
        break
      case "kpi":
        body = kpi(data, chartOptions, frame)
        break
      default: {
        const exhaustive: never = type
        throw new Error(`Unhandled chart type: ${exhaustive}`)
      }
    }
  }

  const background = render.transparent
    ? ""
    : `<rect width="100%" height="100%" rx="12" fill="${theme.background}"/>`
  const heading = title
    ? text(PAD, PAD + 16, title, { fill: theme.foreground, "font-size": 16, "font-weight": 600 })
    : ""

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${escapeXml(FONT)}" role="img"${
    title ? ` aria-label="${escapeXml(title)}"` : ""
  }>${background}${heading}${body}</svg>`
}
