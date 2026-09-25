import {
  getExportFields,
  isDateAxis,
  resolveColor,
  sortRowsByFirstSeries,
  toExportRows,
  toPropertyAccess,
  toPropertyKey,
  usesBreakdownTooltip,
  type ExportField,
} from "@/lib/chart-data"
import {
  SERIES_STAGGER_MS,
  barRadius,
  comboRenderType,
  horizontalLabelWidth,
} from "@/lib/chart-style"
import { WATERFALL_KINDS, heatColor, waterfallColor } from "@/lib/chart-models"
import type { ChartDataRow, ChartOptions, ChartType, ParsedChartData } from "@/types/chart"

const TICK_FORMATTER =
  '(value) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)'

const PERCENT_TICK_FORMATTER =
  '(value) => new Intl.NumberFormat("en-US", { style: "percent" }).format(value)'

const DATE_TICK_FORMATTER =
  '(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })'

// LabelList hands its formatter a ReactNode-ish value, not a number.
const LABEL_FORMATTER =
  '(value) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value))'

// Tooltip labels arrive typed as ReactNode, which `new Date()` won't accept.
const DATE_LABEL_FORMATTER =
  '(value) => new Date(String(value)).toLocaleDateString("en-US", { month: "short", day: "numeric" })'

/** A JSX attribute value: a plain `"string"` when that's lossless, else a
 * `{"string"}` expression. JSX attribute strings have no escape sequences and
 * decode HTML entities, so `"` or `&` in a user's header would break them. */
function jsxString(value: string): string {
  return /^[^"&\n\r]*$/.test(value) ? `"${value}"` : `{${JSON.stringify(value)}}`
}

/** JSX text content: as-is when it has no JSX-significant characters, else
 * a `{"string"}` expression. */
function jsxText(value: string): string {
  return /^[^{}<>&"']*$/.test(value) ? value : `{${JSON.stringify(value)}}`
}

/** `object?.key` / `object?.["some key"]`, for rows that may not exist. */
function optionalAccess(object: string, key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key)
    ? `${object}?.${key}`
    : `${object}?.[${JSON.stringify(key)}]`
}

/** One row object per line, with bare keys where possible, e.g.
 * `{ Month: "Jan", Revenue: 42000 },` — closer to hand-written code than
 * JSON.stringify's one-value-per-line output. */
function serializeRows(rows: ChartDataRow[]): string {
  if (rows.length === 0) return "[]"
  const lines = rows.map(
    (row) =>
      `  { ${Object.entries(row)
        .map(([key, value]) => `${toPropertyKey(key)}: ${JSON.stringify(value)}`)
        .join(", ")} },`
  )
  return `[\n${lines.join("\n")}\n]`
}

interface Fields {
  category: ExportField
  series: ExportField[]
}

function colorOf(field: ExportField, index: number, customColors?: Record<string, string>): string {
  return resolveColor(field.internalKey, index, customColors)
}

/** How generated JSX references a series color: the shadcn `--color-<key>`
 * variable when the key is a valid CSS identifier, otherwise the resolved
 * color itself (ChartStyle can't emit a variable for e.g. "Product A"). */
function colorRef(field: ExportField, index: number, customColors?: Record<string, string>): string {
  return field.cssSafe ? `var(--color-${field.key})` : colorOf(field, index, customColors)
}

/** `category: string` for label columns, `number` when every X value is a
 * number (JSON input like `year: 2024`), so props-mode types match the API. */
function categoryType(rows: ChartDataRow[], key: string): string {
  return rows.length > 0 && rows.every((row) => typeof row[key] === "number") ? "number" : "string"
}

function buildRowType(fields: Fields, rows: ChartDataRow[]): string {
  const entries = [
    `${toPropertyKey(fields.category.key)}: ${categoryType(rows, fields.category.key)}`,
    ...fields.series.map(({ key }) => `${toPropertyKey(key)}: number | null`),
  ]
  return `{ ${entries.join("; ")} }`
}

function renderSeriesConfig(fields: Fields, customColors?: Record<string, string>): string {
  const entries = fields.series
    .map(
      (field, index) =>
        `  ${toPropertyKey(field.key)}: { label: ${JSON.stringify(field.label)}, color: ${JSON.stringify(
          colorOf(field, index, customColors)
        )} },`
    )
    .join("\n")
  return `const chartConfig = {\n${entries}\n} satisfies ChartConfig`
}

/** Per-category config used by pie/radial/scatter, keyed by the raw category
 * label (colors are passed as a literal `fill`, so no CSS-safe key is needed).
 *
 * Typed as `: ChartConfig` rather than `satisfies ChartConfig` — the JSX
 * indexes this object by a runtime `string` (`chartConfig[String(row.x)]`),
 * which only type-checks against `ChartConfig`'s index signature. `satisfies`
 * would keep the narrower literal-keys type and fail under strict mode
 * (TS7053: no index signature with a parameter of type 'string'). */
function renderCategoryConfig(
  categories: string[],
  customColors?: Record<string, string>
): string {
  const entries = categories
    .map(
      (category, index) =>
        `  ${JSON.stringify(category)}: { label: ${JSON.stringify(category)}, color: ${JSON.stringify(
          resolveColor(category, index, customColors)
        )} },`
    )
    .join("\n")
  return `const chartConfig: ChartConfig = {\n${entries}\n}`
}

function uiImports(names: string[]): string {
  const all = ["type ChartConfig", "ChartContainer", ...names]
  return `import {\n${all.map((name) => `  ${name},`).join("\n")}\n} from "@/components/ui/chart"`
}

function rechartsImports(names: string[]): string {
  return `import { ${[...new Set(names)].sort().join(", ")} } from "recharts"`
}

/** Shared header/footer for every generated component: imports, the row type
 * and ChartProps (props mode) or the inline data const, chartConfig, any
 * helper components, and the function body wrapping the caller's JSX. */
function renderShell(opts: {
  imports: string[]
  configDecl: string
  rowType: string
  rows: ChartDataRow[]
  helpers?: string
  preReturn?: string[]
  jsx: string
  exportMode?: ChartOptions["exportMode"]
}): string {
  const isProps = opts.exportMode === "props"
  const typeDecl = isProps
    ? `export type ChartRow = ${opts.rowType}\n\nexport interface ChartProps {\n  data: ChartRow[]\n}\n\n`
    : ""
  const dataDecl = isProps ? "" : `const data = ${serializeRows(opts.rows)}\n\n`
  const signature = isProps
    ? "export function Chart({ data }: ChartProps) {"
    : "export function Chart() {"
  const preReturn = opts.preReturn?.length
    ? `${opts.preReturn.map((line) => `  ${line}`).join("\n")}\n\n`
    : ""
  const helpers = opts.helpers ? `\n\n${opts.helpers}` : ""
  const imports = opts.imports.length > 0 ? `${opts.imports.join("\n")}\n\n` : ""

  return `"use client"

${imports}${typeDecl}${dataDecl}${opts.configDecl}${helpers}

${signature}
${preReturn}  return (
${opts.jsx}
  )
}
`
}

const USE_ID_LINE = 'const uid = useId().replace(/[^\\w-]/g, "")'

/** `id` / `fill` expressions for the i-th series gradient, scoped by useId so
 * two charts on the same page never share (and overwrite) gradient ids. */
const gradientId = (index: number) => "{`${uid}-fill-" + index + "`}"
const gradientUrl = (index: number) => "{`url(#${uid}-fill-" + index + ")`}"

/** Bar props for a gradient fill. The Bar's own `fill` stays the plain series
 * color, because the shadcn legend swatch and tooltip indicator read it; the
 * gradient is applied per rectangle through `shape`. */
function gradientBarFill(field: ExportField, index: number, customColors?: Record<string, string>): string {
  return `fill=${jsxString(colorRef(field, index, customColors))} shape={(props) => <Rectangle {...props} fill=${gradientUrl(index)} />}`
}

function renderGradients(
  fields: Fields,
  customColors: Record<string, string> | undefined,
  opts: { from: number; to: number; horizontal?: boolean }
): string {
  const direction = opts.horizontal ? 'x1="0" y1="0" x2="1" y2="0"' : 'x1="0" y1="0" x2="0" y2="1"'
  const [first, second] = opts.horizontal ? [opts.to, opts.from] : [opts.from, opts.to]
  const stops = fields.series
    .map((field, index) => {
      const color = jsxString(colorRef(field, index, customColors))
      return `          <linearGradient id=${gradientId(index)} ${direction}>
            <stop offset="0%" stopColor=${color} stopOpacity={${first}} />
            <stop offset="100%" stopColor=${color} stopOpacity={${second}} />
          </linearGradient>`
    })
    .join("\n")
  return `        <defs>\n${stops}\n        </defs>`
}

/** Mirrors components/charts/chart-breakdown-tooltip.tsx, so the copied code
 * shows the same tooltip as the preview. */
const BREAKDOWN_TOOLTIP = `/** Tooltip for multi-series charts: the row total plus each series' share. */
function ChartBreakdownTooltip({
  active,
  payload,
  label,
  labelFormatter,
  config,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ dataKey?: unknown; value?: unknown }>
  label?: string | number
  labelFormatter?: (label: unknown) => string
  config: ChartConfig
}) {
  if (!active || !payload?.length) return null

  const entries = payload
    .map((item) => {
      const key = String(item.dataKey)
      const value = Math.abs(Number(item.value))
      return {
        key,
        label: config[key]?.label ?? key,
        color: config[key]?.color ?? "var(--chart-1)",
        value: Number.isFinite(value) ? value : 0,
      }
    })
    .filter((entry) => entry.value > 0)
  if (entries.length === 0) return null

  const total = entries.reduce((sum, entry) => sum + entry.value, 0)
  const stops = entries.map((entry, index) => {
    const before = entries.slice(0, index).reduce((sum, e) => sum + e.value, 0)
    return \`\${entry.color} \${(before / total) * 100}% \${((before + entry.value) / total) * 100}%\`
  })

  return (
    <div className="min-w-52 rounded-xl border border-border bg-card p-3 text-xs shadow-lg">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-medium text-foreground">
          {label !== undefined && labelFormatter ? labelFormatter(label) : label}
        </span>
        <span className="font-mono font-semibold text-foreground">
          {new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(total)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="relative size-14 shrink-0 rounded-full"
          style={{ background: \`conic-gradient(\${stops.join(", ")})\` }}
        >
          <div className="absolute inset-1.5 rounded-full bg-card" />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          {entries.map((entry) => (
            <div key={entry.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="truncate">{entry.label}</span>
              </span>
              <span className="shrink-0 font-medium text-foreground">
                {Math.round((entry.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}`

interface TooltipParts {
  element: string
  uiNames: string[]
  helpers?: string
}

/** The tooltip `content` element for series charts, plus what it needs imported. */
function seriesTooltip(
  seriesCount: number,
  options: ChartOptions | undefined,
  dateAxis: boolean,
  indicator?: "dot" | "line"
): TooltipParts {
  const labelFormatter = dateAxis ? ` labelFormatter={${DATE_LABEL_FORMATTER}}` : ""
  if (usesBreakdownTooltip(seriesCount, options?.tooltipStyle)) {
    return {
      element: `<ChartBreakdownTooltip config={chartConfig}${labelFormatter} />`,
      uiNames: [],
      helpers: BREAKDOWN_TOOLTIP,
    }
  }
  const indicatorProp = indicator ? ` indicator="${indicator}"` : ""
  return {
    element: `<ChartTooltipContent${indicatorProp}${labelFormatter} />`,
    uiNames: ["ChartTooltipContent"],
  }
}

const LEGEND_UI = ["ChartLegend", "ChartLegendContent"]

function staggerProp(index: number): string {
  return index > 0 ? ` animationBegin={${index * SERIES_STAGGER_MS}}` : ""
}

/** ` radius={[...]}` for the i-th bar series (see barRadius), or nothing
 * for inner stack segments, which stay square. */
function radiusProp(index: number, seriesCount: number, stacked: boolean, horizontal: boolean): string {
  const radius = barRadius(index, seriesCount, stacked, horizontal)
  return radius.every((r) => r === 0) ? "" : ` radius={[${radius.join(", ")}]}`
}

function bar(data: ParsedChartData, options?: ChartOptions): string {
  const fields = getExportFields(data)
  const rows = toExportRows(data)
  const customColors = options?.customColors
  const stackMode = options?.stackMode ?? "none"
  const stacked = stackMode !== "none"
  const dateAxis = isDateAxis(data)
  const tooltip = seriesTooltip(fields.series.length, options, dateAxis)

  const bars = fields.series
    .map(
      (field, index) =>
        `        <Bar dataKey=${jsxString(field.key)} ${gradientBarFill(field, index, customColors)}${radiusProp(
          index,
          fields.series.length,
          stacked,
          false
        )} maxBarSize={${stacked ? 48 : 36}}${stacked ? ' stackId="stack"' : ""}${staggerProp(index)} />`
    )
    .join("\n")

  const xAxisTick = dateAxis ? ` tickFormatter={${DATE_TICK_FORMATTER}}` : ""
  const yAxisFormatter = stackMode === "percent" ? PERCENT_TICK_FORMATTER : TICK_FORMATTER

  const jsx = `    <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full">
      <BarChart accessibilityLayer data={data} barCategoryGap="30%" barGap={4}${
        stackMode === "percent" ? ' stackOffset="expand"' : ""
      }>
${renderGradients(fields, customColors, { from: 1, to: 0.55 })}
        <CartesianGrid vertical={false} strokeDasharray="3 5" />
        <XAxis dataKey=${jsxString(fields.category.key)} tickLine={false} axisLine={false} tickMargin={10}${xAxisTick} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} tickFormatter={${yAxisFormatter}} />
        <ChartTooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={${tooltip.element}} />
        <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
${bars}
      </BarChart>
    </ChartContainer>`

  return renderShell({
    imports: [
      'import { useId } from "react"',
      rechartsImports(["Bar", "BarChart", "CartesianGrid", "Rectangle", "XAxis", "YAxis"]),
      uiImports([...LEGEND_UI, "ChartTooltip", ...tooltip.uiNames]),
    ],
    configDecl: renderSeriesConfig(fields, customColors),
    rowType: buildRowType(fields, rows),
    rows,
    helpers: tooltip.helpers,
    preReturn: [USE_ID_LINE],
    jsx,
    exportMode: options?.exportMode,
  })
}

function horizontalBar(data: ParsedChartData, options?: ChartOptions): string {
  const fields = getExportFields(data)
  const customColors = options?.customColors
  const stackMode = options?.stackMode ?? "none"
  const stacked = stackMode !== "none"
  const sortOrder = options?.sortBars ?? "none"
  const showValues = (options?.showValues ?? true) && !stacked
  const isProps = options?.exportMode === "props"
  const firstKey = fields.series[0]?.key
  const rows = isProps
    ? toExportRows(data)
    : sortRowsByFirstSeries(toExportRows(data), firstKey, sortOrder)
  const tooltip = seriesTooltip(fields.series.length, options, false)
  const labelWidth = horizontalLabelWidth(rows.map((row) => String(row[fields.category.key] ?? "")))

  // Inline data is baked in already sorted; props-mode data is sorted at render.
  const sortInComponent = isProps && sortOrder !== "none" && firstKey
  const dataVar = sortInComponent ? "chartData" : "data"
  const preReturn = [USE_ID_LINE]
  if (sortInComponent) {
    const a = toPropertyAccess("a", firstKey)
    const b = toPropertyAccess("b", firstKey)
    preReturn.push(
      sortOrder === "desc"
        ? `const chartData = [...data].sort((a, b) => (${b} ?? 0) - (${a} ?? 0))`
        : `const chartData = [...data].sort((a, b) => (${a} ?? 0) - (${b} ?? 0))`
    )
  }

  const bars = fields.series
    .map((field, index) => {
      const open = `        <Bar dataKey=${jsxString(field.key)} ${gradientBarFill(field, index, customColors)}${radiusProp(
        index,
        fields.series.length,
        stacked,
        true
      )} maxBarSize={28}${stacked ? ' stackId="stack"' : ""}${staggerProp(index)}`
      if (!showValues) return `${open} />`
      return `${open}>
          <LabelList dataKey=${jsxString(field.key)} position="right" offset={8} className="fill-foreground" fontSize={12} formatter={${LABEL_FORMATTER}} />
        </Bar>`
    })
    .join("\n")

  const xAxisFormatter = stackMode === "percent" ? PERCENT_TICK_FORMATTER : TICK_FORMATTER
  const legend =
    fields.series.length > 1 ? "\n        <ChartLegend content={<ChartLegendContent />} itemSorter={null} />" : ""

  const jsx = `    <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full">
      <BarChart accessibilityLayer data={${dataVar}} layout="vertical" barCategoryGap="24%" barGap={4} margin={{ right: ${
        showValues ? 40 : 12
      } }}${stackMode === "percent" ? ' stackOffset="expand"' : ""}>
${renderGradients(fields, customColors, { from: 1, to: 0.55, horizontal: true })}
        <CartesianGrid horizontal={false} strokeDasharray="3 5" />
        <YAxis dataKey=${jsxString(fields.category.key)} type="category" tickLine={false} axisLine={false} tickMargin={8} width={${labelWidth}} />
        <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={${xAxisFormatter}} />
        <ChartTooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={${tooltip.element}} />${legend}
${bars}
      </BarChart>
    </ChartContainer>`

  return renderShell({
    imports: [
      'import { useId } from "react"',
      rechartsImports([
        "Bar",
        "BarChart",
        "CartesianGrid",
        "Rectangle",
        "XAxis",
        "YAxis",
        ...(showValues ? ["LabelList"] : []),
      ]),
      uiImports([
        ...(fields.series.length > 1 ? LEGEND_UI : []),
        "ChartTooltip",
        ...tooltip.uiNames,
      ]),
    ],
    configDecl: renderSeriesConfig(fields, customColors),
    rowType: buildRowType(fields, rows),
    rows,
    helpers: tooltip.helpers,
    preReturn,
    jsx,
    exportMode: options?.exportMode,
  })
}

function line(data: ParsedChartData, options?: ChartOptions): string {
  const fields = getExportFields(data)
  const rows = toExportRows(data)
  const customColors = options?.customColors
  const dateAxis = isDateAxis(data)
  const tooltip = seriesTooltip(fields.series.length, options, dateAxis)
  const dot = options?.showDots ?? true ? '{{ r: 3, fill: "var(--card)", strokeWidth: 2 }}' : "{false}"

  const lines = fields.series
    .map(
      (field, index) =>
        `        <Line dataKey=${jsxString(field.key)} type="${
          options?.smooth ? "monotone" : "linear"
        }" stroke=${jsxString(colorRef(field, index, customColors))} strokeWidth={2.5} dot=${dot} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }} />`
    )
    .join("\n")

  const xAxisTick = dateAxis ? ` tickFormatter={${DATE_TICK_FORMATTER}}` : ""

  const jsx = `    <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full">
      <LineChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} strokeDasharray="3 5" />
        <XAxis dataKey=${jsxString(fields.category.key)} tickLine={false} axisLine={false} tickMargin={10}${xAxisTick} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} tickFormatter={${TICK_FORMATTER}} />
        <ChartTooltip content={${tooltip.element}} />
        <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
${lines}
      </LineChart>
    </ChartContainer>`

  return renderShell({
    imports: [
      rechartsImports(["CartesianGrid", "Line", "LineChart", "XAxis", "YAxis"]),
      uiImports([...LEGEND_UI, "ChartTooltip", ...tooltip.uiNames]),
    ],
    configDecl: renderSeriesConfig(fields, customColors),
    rowType: buildRowType(fields, rows),
    rows,
    helpers: tooltip.helpers,
    jsx,
    exportMode: options?.exportMode,
  })
}

function area(data: ParsedChartData, options?: ChartOptions): string {
  const fields = getExportFields(data)
  const rows = toExportRows(data)
  const customColors = options?.customColors
  const stackMode = options?.stackMode ?? "none"
  const dateAxis = isDateAxis(data)
  const tooltip = seriesTooltip(fields.series.length, options, dateAxis, "dot")

  const areas = fields.series
    .map(
      (field, index) =>
        `        <Area dataKey=${jsxString(field.key)} type="natural" fill=${gradientUrl(
          index
        )} fillOpacity={1} stroke=${jsxString(colorRef(field, index, customColors))} strokeWidth={2.5}${
          stackMode !== "none" ? ' stackId="stack"' : ""
        }${staggerProp(index)} />`
    )
    .join("\n")

  const xAxisTick = dateAxis ? ` tickFormatter={${DATE_TICK_FORMATTER}}` : ""
  const yAxisFormatter = stackMode === "percent" ? PERCENT_TICK_FORMATTER : TICK_FORMATTER

  const jsx = `    <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full">
      <AreaChart accessibilityLayer data={data}${
        stackMode === "percent" ? ' stackOffset="expand"' : ""
      }>
${renderGradients(fields, customColors, { from: 0.85, to: 0.04 })}
        <CartesianGrid vertical={false} strokeDasharray="3 5" />
        <XAxis dataKey=${jsxString(fields.category.key)} tickLine={false} axisLine={false} tickMargin={10}${xAxisTick} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} tickFormatter={${yAxisFormatter}} />
        <ChartTooltip content={${tooltip.element}} />
        <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
${areas}
      </AreaChart>
    </ChartContainer>`

  return renderShell({
    imports: [
      'import { useId } from "react"',
      rechartsImports(["Area", "AreaChart", "CartesianGrid", "XAxis", "YAxis"]),
      uiImports([...LEGEND_UI, "ChartTooltip", ...tooltip.uiNames]),
    ],
    configDecl: renderSeriesConfig(fields, customColors),
    rowType: buildRowType(fields, rows),
    rows,
    helpers: tooltip.helpers,
    preReturn: [USE_ID_LINE],
    jsx,
    exportMode: options?.exportMode,
  })
}

function combo(data: ParsedChartData, options?: ChartOptions): string {
  const fields = getExportFields(data)
  const rows = toExportRows(data)
  const customColors = options?.customColors
  const dateAxis = isDateAxis(data)
  const renderAs = fields.series.map((field, index) =>
    comboRenderType(field.internalKey, index, options?.seriesRenderType)
  )

  const marks = fields.series
    .map((field, index) => {
      if (renderAs[index] === "line") {
        return `        <Line dataKey=${jsxString(field.key)} type="monotone" stroke=${jsxString(
          colorRef(field, index, customColors)
        )} strokeWidth={2.5} dot={{ r: 3, fill: "var(--card)", strokeWidth: 2 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }} />`
      }
      return `        <Bar dataKey=${jsxString(field.key)} ${gradientBarFill(field, index, customColors)} radius={[6, 6, 0, 0]} maxBarSize={36}${staggerProp(index)} />`
    })
    .join("\n")

  const hasBars = renderAs.includes("bar")
  const hasLines = renderAs.includes("line")
  const xAxisTick = dateAxis ? ` tickFormatter={${DATE_TICK_FORMATTER}}` : ""
  const tooltipProps = dateAxis ? ` labelFormatter={${DATE_LABEL_FORMATTER}}` : ""

  const jsx = `    <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full">
      <ComposedChart accessibilityLayer data={data}>
${renderGradients(fields, customColors, { from: 1, to: 0.55 })}
        <CartesianGrid vertical={false} strokeDasharray="3 5" />
        <XAxis dataKey=${jsxString(fields.category.key)} tickLine={false} axisLine={false} tickMargin={10}${xAxisTick} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} tickFormatter={${TICK_FORMATTER}} />
        <ChartTooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<ChartTooltipContent${tooltipProps} />} />
        <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
${marks}
      </ComposedChart>
    </ChartContainer>`

  return renderShell({
    imports: [
      'import { useId } from "react"',
      rechartsImports([
        "CartesianGrid",
        "ComposedChart",
        "XAxis",
        "YAxis",
        ...(hasBars ? ["Bar", "Rectangle"] : []),
        ...(hasLines ? ["Line"] : []),
      ]),
      uiImports([...LEGEND_UI, "ChartTooltip", "ChartTooltipContent"]),
    ],
    configDecl: renderSeriesConfig(fields, customColors),
    rowType: buildRowType(fields, rows),
    rows,
    preReturn: [USE_ID_LINE],
    jsx,
    exportMode: options?.exportMode,
  })
}

/** Pie/radial rows: category + first value only, blanks dropped (a blank
 * slice has no meaning), matching what the preview renders. */
function categoryValueRows(data: ParsedChartData, fields: Fields): ChartDataRow[] {
  const valueKey = fields.series[0]?.key
  return toExportRows(data)
    .filter((row) => valueKey !== undefined && row[valueKey] !== null)
    .map((row) => ({
      [fields.category.key]: row[fields.category.key],
      ...(valueKey ? { [valueKey]: row[valueKey] } : {}),
    }))
}

function categoryValueRowType(fields: Fields, rows: ChartDataRow[]): string {
  const valueKey = fields.series[0]?.key ?? "value"
  return `{ ${toPropertyKey(fields.category.key)}: ${categoryType(rows, fields.category.key)}; ${toPropertyKey(
    valueKey
  )}: number | null }`
}

/** Per-slice colors ride on the rows (Recharts reads `fill` from each entry),
 * which also gives the shadcn legend its swatches. */
const COLORED_ROWS = (categoryAccess: string) =>
  `const chartData = data.map((row) => ({ ...row, fill: chartConfig[${categoryAccess}]?.color }))`

function pie(data: ParsedChartData, options?: ChartOptions): string {
  const fields: Fields = { ...getExportFields(data) }
  fields.series = fields.series.slice(0, 1)
  const rows = categoryValueRows(data, fields)
  const customColors = options?.customColors
  const categoryKey = fields.category.key
  const valueKey = fields.series[0]?.key ?? "value"
  const labelType = options?.labelType ?? "value"
  const donut = options?.donut ?? false
  const categoryAccess = `String(${toPropertyAccess("row", categoryKey)})`

  const renderLabel =
    labelType === "percent"
      ? "(props) => `${Math.round((props.percent ?? 0) * 100)}%`"
      : labelType === "label"
        ? '(props) => String(props.name ?? "")'
        : '(props) => String(props.value ?? "")'

  const centerLabel = donut
    ? `
          <Label
            content={({ viewBox }) => {
              if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null
              const { cx, cy } = viewBox
              return (
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                  <tspan x={cx} y={cy} className="fill-foreground text-2xl font-semibold">
                    {new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(total)}
                  </tspan>
                  <tspan x={cx} y={(cy ?? 0) + 22} className="fill-muted-foreground text-xs">
                    Total
                  </tspan>
                </text>
              )
            }}
          />`
    : ""

  const shape = donut
    ? "innerRadius={64} paddingAngle={2} cornerRadius={6}"
    : `label={${renderLabel}}`

  const jsx = `    <ChartContainer config={chartConfig} className="aspect-square h-[350px] w-full [&_.recharts-pie-label-text]:fill-foreground">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey=${jsxString(categoryKey)} hideLabel />} />
        <ChartLegend content={<ChartLegendContent nameKey=${jsxString(categoryKey)} />} verticalAlign="bottom" itemSorter={null} />
        <Pie data={chartData} dataKey=${jsxString(valueKey)} nameKey=${jsxString(categoryKey)} ${shape} stroke="var(--card)" strokeWidth={2}${
          donut ? `>${centerLabel}
        </Pie>` : " />"
        }
      </PieChart>
    </ChartContainer>`

  return renderShell({
    imports: [
      rechartsImports(["Pie", "PieChart", ...(donut ? ["Label"] : [])]),
      uiImports([...LEGEND_UI, "ChartTooltip", "ChartTooltipContent"]),
    ],
    configDecl: renderCategoryConfig(
      rows.map((row) => String(row[categoryKey])),
      customColors
    ),
    rowType: categoryValueRowType(fields, rows),
    rows,
    preReturn: [
      COLORED_ROWS(categoryAccess),
      ...(donut
        ? [`const total = data.reduce((sum, row) => sum + (${toPropertyAccess("row", valueKey)} ?? 0), 0)`]
        : []),
    ],
    jsx,
    exportMode: options?.exportMode,
  })
}

function radar(data: ParsedChartData, options?: ChartOptions): string {
  const fields = getExportFields(data)
  const rows = toExportRows(data)
  const customColors = options?.customColors

  const radars = fields.series
    .map((field, index) => {
      const color = jsxString(colorRef(field, index, customColors))
      return `        <Radar dataKey=${jsxString(field.key)} fill=${color} fillOpacity={0.25} stroke=${color} strokeWidth={2} dot={{ r: 3, fillOpacity: 1 }} />`
    })
    .join("\n")

  const jsx = `    <ChartContainer config={chartConfig} className="aspect-square h-[350px] w-full">
      <RadarChart data={data}>
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <PolarAngleAxis dataKey=${jsxString(fields.category.key)} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
        <PolarGrid strokeDasharray="3 5" />
${radars}
        <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
      </RadarChart>
    </ChartContainer>`

  return renderShell({
    imports: [
      rechartsImports(["PolarAngleAxis", "PolarGrid", "Radar", "RadarChart"]),
      uiImports([...LEGEND_UI, "ChartTooltip", "ChartTooltipContent"]),
    ],
    configDecl: renderSeriesConfig(fields, customColors),
    rowType: buildRowType(fields, rows),
    rows,
    jsx,
    exportMode: options?.exportMode,
  })
}

/** Distinct values of the category column, in first-seen order. */
function distinctCategories(rows: ChartDataRow[], key: string): string[] {
  return [...new Set(rows.map((row) => String(row[key] ?? "")))]
}

function scatter(data: ParsedChartData, options?: ChartOptions): string {
  const fields = getExportFields(data)
  const customColors = options?.customColors
  const categoryKey = fields.category.key
  const [xField, yField] = fields.series
  const xKey = xField?.key ?? "x"
  const yKey = yField?.key ?? "y"
  const rows = toExportRows(data).filter((row) => row[xKey] !== null && row[yKey] !== null)
  const categoryAccess = `String(${toPropertyAccess("row", categoryKey)})`
  const xLabel = xField?.label ?? "X"
  const yLabel = yField?.label ?? "Y"
  const axisLabel = (label: string, placement: string) =>
    `{{ value: ${JSON.stringify(label)}, ${placement}, fill: "var(--muted-foreground)", fontSize: 12 }}`

  const jsx = `    <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full">
      <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 5" />
        <XAxis type="number" dataKey=${jsxString(xKey)} name=${jsxString(xLabel)} tickLine={false} axisLine={false} tickMargin={8} height={48} tickFormatter={${TICK_FORMATTER}} label=${axisLabel(xLabel, 'position: "insideBottom"')} />
        <YAxis type="number" dataKey=${jsxString(yKey)} name=${jsxString(yLabel)} tickLine={false} axisLine={false} tickMargin={8} width={56} tickFormatter={${TICK_FORMATTER}} label=${axisLabel(yLabel, 'angle: -90, position: "insideLeft"')} />
        <ChartTooltip cursor={{ strokeDasharray: "3 3" }} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
        {groups.map((group) => (
          <Scatter key={group.key} name={group.key} data={group.points} fill={group.color} fillOpacity={0.85} />
        ))}
      </ScatterChart>
    </ChartContainer>`

  return renderShell({
    imports: [
      rechartsImports(["CartesianGrid", "Scatter", "ScatterChart", "XAxis", "YAxis"]),
      uiImports([...LEGEND_UI, "ChartTooltip", "ChartTooltipContent"]),
    ],
    configDecl: renderCategoryConfig(distinctCategories(rows, categoryKey), customColors),
    rowType: buildRowType(
      {
        category: fields.category,
        series: [xField, yField].filter((field): field is ExportField => field !== undefined),
      },
      rows
    ),
    rows,
    // One <Scatter> per category; categories missing from chartConfig (new
    // values in props-mode data) still get a palette color.
    preReturn: [
      `const groups = [...new Set(data.map((row) => ${categoryAccess}))].map((key, index) => ({`,
      "  key,",
      "  color: chartConfig[key]?.color ?? `var(--chart-${(index % 5) + 1})`,",
      `  points: data.filter((row) => ${categoryAccess} === key),`,
      "}))",
    ],
    jsx,
    exportMode: options?.exportMode,
  })
}

function radial(data: ParsedChartData, options?: ChartOptions): string {
  const fields: Fields = { ...getExportFields(data) }
  fields.series = fields.series.slice(0, 1)
  const rows = categoryValueRows(data, fields)
  const customColors = options?.customColors
  const categoryKey = fields.category.key
  const valueKey = fields.series[0]?.key ?? "value"
  const half = options?.halfGauge ?? false
  const categoryAccess = `String(${toPropertyAccess("row", categoryKey)})`

  const geometry = half
    ? 'startAngle={180} endAngle={0} cy="62%" innerRadius="40%" outerRadius="95%"'
    : 'startAngle={90} endAngle={-270} innerRadius="30%" outerRadius="95%"'
  const valueY = half ? "(cy ?? 0) - 18" : "cy"
  const labelY = half ? "(cy ?? 0) + 4" : "(cy ?? 0) + 20"

  const jsx = `    <ChartContainer config={chartConfig} className="aspect-square h-[350px] w-full">
      <RadialBarChart data={chartData} ${geometry}>
        <PolarAngleAxis type="number" domain={[0, max]} tick={false} axisLine={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey=${jsxString(categoryKey)} hideLabel />} />
        <RadialBar dataKey=${jsxString(valueKey)} background cornerRadius={8} />
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
          <Label
            content={({ viewBox }) => {
              if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox) || !headline) return null
              const { cx, cy } = viewBox
              return (
                <text x={cx} textAnchor="middle" dominantBaseline="middle">
                  <tspan x={cx} y={${valueY}} className="fill-foreground text-2xl font-semibold">
                    {${toPropertyAccess("headline", valueKey)}?.toLocaleString("en-US")}
                  </tspan>
                  <tspan x={cx} y={${labelY}} className="fill-muted-foreground text-xs">
                    {String(${toPropertyAccess("headline", categoryKey)})}
                  </tspan>
                </text>
              )
            }}
          />
        </PolarRadiusAxis>
        <ChartLegend content={<ChartLegendContent nameKey=${jsxString(categoryKey)} />} verticalAlign="bottom" itemSorter={null} />
      </RadialBarChart>
    </ChartContainer>`

  return renderShell({
    imports: [
      rechartsImports(["Label", "PolarAngleAxis", "PolarRadiusAxis", "RadialBar", "RadialBarChart"]),
      uiImports([...LEGEND_UI, "ChartTooltip", "ChartTooltipContent"]),
    ],
    configDecl: renderCategoryConfig(
      rows.map((row) => String(row[categoryKey])),
      customColors
    ),
    rowType: categoryValueRowType(fields, rows),
    rows,
    // Values are drawn against at least 0–100, so percentages read as
    // progress toward a goal; larger values scale to the biggest one.
    preReturn: [
      COLORED_ROWS(categoryAccess),
      `const max = Math.max(100, ...data.map((row) => ${toPropertyAccess("row", valueKey)} ?? 0))`,
      "const headline = data[0]",
    ],
    jsx,
    exportMode: options?.exportMode,
  })
}

function kpi(data: ParsedChartData, options?: ChartOptions): string {
  const fields: Fields = { ...getExportFields(data) }
  fields.series = fields.series.slice(0, 1)
  const rows = toExportRows(data).map((row) => ({
    [fields.category.key]: row[fields.category.key],
    ...(fields.series[0] ? { [fields.series[0].key]: row[fields.series[0].key] } : {}),
  }))
  const customColors = options?.customColors
  const field = fields.series[0]
  const valueKey = field?.key ?? "value"
  const color = field ? jsxString(colorRef(field, 0, customColors)) : '"var(--chart-1)"'
  const sparkType = options?.sparkType ?? "area"
  const categoryKey = fields.category.key

  const spark =
    sparkType === "bar"
      ? `        <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey=${jsxString(categoryKey)} hide />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
          <Bar dataKey=${jsxString(valueKey)} fill=${color} radius={[3, 3, 0, 0]} />
        </BarChart>`
      : sparkType === "line"
        ? `        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <XAxis dataKey=${jsxString(categoryKey)} hide />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
          <Line dataKey=${jsxString(valueKey)} type="monotone" stroke=${color} strokeWidth={2} dot={false} />
        </LineChart>`
        : `        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id=${gradientId(0)} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor=${color} stopOpacity={0.5} />
              <stop offset="100%" stopColor=${color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey=${jsxString(categoryKey)} hide />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
          <Area dataKey=${jsxString(valueKey)} type="monotone" fill=${gradientUrl(0)} fillOpacity={1} stroke=${color} strokeWidth={2} />
        </AreaChart>`

  const recharts =
    sparkType === "bar"
      ? ["Bar", "BarChart", "XAxis"]
      : sparkType === "line"
        ? ["Line", "LineChart", "XAxis", "YAxis"]
        : ["Area", "AreaChart", "XAxis", "YAxis"]

  const jsx = `    <div className="flex w-full flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">${jsxText(field?.label ?? "Value")}</span>
          <span className="text-3xl font-semibold tracking-tight tabular-nums">
            {latest?.toLocaleString("en-US", { maximumFractionDigits: 2 }) ?? "–"}
          </span>
        </div>
        {delta !== null && (
          <span
            className={\`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums \${
              delta >= 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            }\`}
          >
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <ChartContainer config={chartConfig} className="aspect-auto h-[80px] w-full">
${spark}
      </ChartContainer>
      <span className="text-xs text-muted-foreground">
        {String(${optionalAccess("data[0]", categoryKey)} ?? "")} – {String(${optionalAccess(
          "data[data.length - 1]",
          categoryKey
        )} ?? "")}
      </span>
    </div>`

  const valueAccess = toPropertyAccess("row", valueKey)
  return renderShell({
    imports: [
      ...(sparkType === "area" ? ['import { useId } from "react"'] : []),
      rechartsImports(recharts),
      uiImports(["ChartTooltip", "ChartTooltipContent"]),
    ],
    configDecl: renderSeriesConfig(fields, customColors),
    rowType: buildRowType(fields, rows),
    rows,
    preReturn: [
      ...(sparkType === "area" ? [USE_ID_LINE] : []),
      `const values = data.map((row) => ${valueAccess}).filter((value): value is number => value !== null)`,
      "const latest = values.at(-1)",
      "const previous = values.at(-2)",
      "const delta =",
      "  latest !== undefined && previous !== undefined && previous !== 0",
      "    ? ((latest - previous) / Math.abs(previous)) * 100",
      "    : null",
    ],
    jsx,
    exportMode: options?.exportMode,
  })
}

const RANGE_BUTTONS = `      <div className="flex justify-end">
        <div role="group" aria-label="Time range" className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
          {RANGES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={range === option.value}
              onClick={() => setRange(option.value)}
              className={\`rounded-md px-2.5 py-1 text-xs font-medium transition-colors \${
                range === option.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }\`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>`

function interactive(data: ParsedChartData, options?: ChartOptions): string {
  const fields = getExportFields(data)
  const rows = toExportRows(data)
  const customColors = options?.customColors
  const dateAxis = isDateAxis(data)
  const defaultRange = options?.defaultRange ?? "90d"
  const showBrush = options?.showBrush ?? true
  const tooltip = seriesTooltip(fields.series.length, options, dateAxis, "dot")
  const categoryKey = fields.category.key
  const rowCategory = `String(${toPropertyAccess("row", categoryKey)})`

  const areas = fields.series
    .map(
      (field, index) =>
        `          <Area dataKey=${jsxString(field.key)} type="natural" stackId="stack" fill=${gradientUrl(
          index
        )} fillOpacity={1} stroke=${jsxString(colorRef(field, index, customColors))} strokeWidth={2}${staggerProp(index)} />`
    )
    .join("\n")
  const gradients = renderGradients(fields, customColors, { from: 0.8, to: 0.05 })
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n")
  const xAxisTick = dateAxis ? ` tickFormatter={${DATE_TICK_FORMATTER}}` : ""
  const brush = showBrush
    ? `\n          {chartData.length > 2 && (\n            <Brush key={range} dataKey=${jsxString(
        categoryKey
      )} height={28} travellerWidth={8} stroke="var(--border)" fill="var(--card)"${xAxisTick} />\n          )}`
    : ""

  // With dates: keep rows within N days of the newest one. Without: the last N rows.
  const preReturn = [
    USE_ID_LINE,
    `const [range, setRange] = useState<(typeof RANGES)[number]["value"]>(${JSON.stringify(defaultRange)})`,
    "const days = RANGES.find((option) => option.value === range)?.days ?? null",
    ...(dateAxis
      ? [
          `const newest = new Date(String(${optionalAccess("data[data.length - 1]", categoryKey)} ?? "")).getTime()`,
          "const chartData =",
          "  days === null",
          "    ? data",
          `    : data.filter((row) => new Date(${rowCategory}).getTime() >= newest - (days - 1) * 86_400_000)`,
        ]
      : ["const chartData = days === null ? data : data.slice(-days)"]),
  ]

  const jsx = `    <div className="flex w-full flex-col gap-3">
${RANGE_BUTTONS}
      <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
        <AreaChart accessibilityLayer data={chartData}>
${gradients}
          <CartesianGrid vertical={false} strokeDasharray="3 5" />
          <XAxis dataKey=${jsxString(categoryKey)} tickLine={false} axisLine={false} tickMargin={8} minTickGap={32}${xAxisTick} />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} tickFormatter={${TICK_FORMATTER}} />
          <ChartTooltip content={${tooltip.element}} />
          <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
${areas}${brush}
        </AreaChart>
      </ChartContainer>
    </div>`

  const rangesDecl = `const RANGES = [
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 },
  { value: "90d", label: "90 days", days: 90 },
  { value: "all", label: "All", days: null },
] as const`

  return renderShell({
    imports: [
      'import { useId, useState } from "react"',
      rechartsImports([
        "Area",
        "AreaChart",
        "CartesianGrid",
        "XAxis",
        "YAxis",
        ...(showBrush ? ["Brush"] : []),
      ]),
      uiImports([...LEGEND_UI, "ChartTooltip", ...tooltip.uiNames]),
    ],
    configDecl: `${renderSeriesConfig(fields, customColors)}\n\n${rangesDecl}`,
    rowType: buildRowType(fields, rows),
    rows,
    helpers: tooltip.helpers,
    preReturn,
    jsx,
    exportMode: options?.exportMode,
  })
}

function waterfall(data: ParsedChartData, options?: ChartOptions): string {
  const fields: Fields = { ...getExportFields(data) }
  fields.series = fields.series.slice(0, 1)
  const rows = toExportRows(data).map((row) => ({
    [fields.category.key]: row[fields.category.key],
    ...(fields.series[0] ? { [fields.series[0].key]: row[fields.series[0].key] } : {}),
  }))
  const customColors = options?.customColors
  const showTotal = options?.showTotal ?? true
  const showValues = options?.showValues ?? true
  const isProps = options?.exportMode === "props"
  const valueAccess = toPropertyAccess("row", fields.series[0]?.key ?? "value")
  const labelAccess = `String(${toPropertyAccess("row", fields.category.key)})`

  const config = `const chartConfig = {
${WATERFALL_KINDS.map(
  ({ key, label }) =>
    `  ${key}: { label: ${JSON.stringify(label)}, color: ${JSON.stringify(waterfallColor(key, customColors))} },`
).join("\n")}
} satisfies ChartConfig`

  const totalStep = showTotal
    ? `
  const last = steps.at(-1)
  if (!last || steps.length < 2) return steps
  return [
    ...steps,
    { label: "Total", change: last.end, end: last.end, range: [Math.min(0, last.end), Math.max(0, last.end)], kind: "total", display: compact(last.end) },
  ]`
    : "\n  return steps"

  const helpers = `type WaterfallStep = {
  label: string
  change: number
  end: number
  range: [number, number]
  kind: keyof typeof chartConfig
  display: string
}

const compact = (value: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)

/** The first row is the starting total; every later row changes the running
 * total. Each step becomes a floating bar spanning [low, high]. */
function toSteps(rows: ${isProps ? "ChartRow[]" : "typeof data"}): WaterfallStep[] {
  const steps = rows.reduce<WaterfallStep[]>((acc, row, index) => {
    const value = ${valueAccess} ?? 0
    const previous = acc.at(-1)?.end ?? 0
    const start = index === 0 ? 0 : previous
    const end = index === 0 ? value : previous + value
    const kind = index === 0 ? "total" : value >= 0 ? "increase" : "decrease"
    return [
      ...acc,
      {
        label: ${labelAccess},
        change: value,
        end,
        range: [Math.min(start, end), Math.max(start, end)],
        kind,
        display: kind !== "total" && value > 0 ? \`+\${compact(value)}\` : compact(value),
      },
    ]
  }, [])${totalStep}
}

function WaterfallTooltip({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) {
  const step = payload?.[0]?.payload as WaterfallStep | undefined
  if (!active || !step) return null
  return (
    <div className="grid min-w-36 gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <span className="font-medium text-foreground">{step.label}</span>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: chartConfig[step.kind].color }} />
          {step.kind === "total" ? "Total" : "Change"}
        </span>
        <span className="font-mono font-medium text-foreground tabular-nums">
          {step.kind !== "total" && step.change > 0 ? "+" : ""}
          {step.change.toLocaleString("en-US")}
        </span>
      </div>
      {step.kind !== "total" && (
        <div className="flex items-center justify-between gap-4 text-muted-foreground">
          <span>Running total</span>
          <span className="font-mono tabular-nums">{step.end.toLocaleString("en-US")}</span>
        </div>
      )}
    </div>
  )
}`

  const labels = showValues
    ? `>
            <LabelList dataKey="display" position="top" offset={6} className="fill-foreground" fontSize={12} />
          </Bar>`
    : " />"

  const jsx = `    <div className="flex w-full flex-col gap-2">
      <ChartContainer config={chartConfig} className="aspect-auto h-[330px] w-full">
        <BarChart accessibilityLayer data={steps} barCategoryGap="24%" margin={{ top: 20 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 5" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} width={44} tickFormatter={compact} />
          {hasNegative && <ReferenceLine y={0} stroke="var(--border)" />}
          <ChartTooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<WaterfallTooltip />} />
          <Bar
            dataKey="range"
            fill="var(--chart-1)"
            radius={4}
            maxBarSize={56}
            shape={(props) => <Rectangle {...props} fill={chartConfig[(props.payload as WaterfallStep).kind].color} />}
          ${labels}
        </BarChart>
      </ChartContainer>
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        {(Object.keys(chartConfig) as (keyof typeof chartConfig)[]).map((kind) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: chartConfig[kind].color }} />
            {chartConfig[kind].label}
          </span>
        ))}
      </div>
    </div>`

  return renderShell({
    imports: [
      rechartsImports([
        "Bar",
        "BarChart",
        "CartesianGrid",
        "Rectangle",
        "ReferenceLine",
        "XAxis",
        "YAxis",
        ...(showValues ? ["LabelList"] : []),
      ]),
      uiImports(["ChartTooltip"]),
    ],
    configDecl: config,
    rowType: buildRowType(fields, rows),
    rows,
    helpers,
    preReturn: [
      "const steps = toSteps(data)",
      "const hasNegative = steps.some((step) => step.range[0] < 0)",
    ],
    jsx,
    exportMode: options?.exportMode,
  })
}

function heatmap(data: ParsedChartData, options?: ChartOptions): string {
  const fields = getExportFields(data)
  const rows = toExportRows(data)
  const color = heatColor(options?.customColors)
  const showValues = options?.showValues ?? true
  const format = options?.heatFormat ?? "number"
  const categoryKey = fields.category.key
  const rowLabel = `String(${toPropertyAccess("row", categoryKey)})`
  const isProps = options?.exportMode === "props"

  const formatter =
    format === "percent"
      ? `/** Values up to 1 are fractions; anything larger is already a percentage. */
function formatValue(value: number, max: number) {
  return \`\${Math.round(max <= 1 ? value * 100 : value)}%\`
}`
      : `function formatValue(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)
}`
  const fmt = (arg: string) => (format === "percent" ? `formatValue(${arg}, max)` : `formatValue(${arg})`)

  const configDecl = `const columns = [${fields.series.map((f) => JSON.stringify(f.key)).join(", ")}] as const

/** Cells mix this color into the muted background by value. */
const heatColor = ${JSON.stringify(color)}`

  const jsx = `    <div className="flex w-full flex-col gap-4">
      <div className="w-full overflow-x-auto">
        <div
          role="table"
          className="grid min-w-fit gap-1 text-xs"
          style={{ gridTemplateColumns: \`auto repeat(\${columns.length}, minmax(2.75rem, 1fr))\` }}
        >
          <div role="row" className="contents">
            <div role="presentation" />
            {columns.map((column) => (
              <div key={column} role="columnheader" className="truncate px-1 pb-1 text-center font-medium text-muted-foreground">
                {column}
              </div>
            ))}
          </div>
          {data.map((row, r) => (
            <div key={${rowLabel}} role="row" className="contents">
              <div role="rowheader" className="flex items-center justify-end pr-2 font-medium whitespace-nowrap text-muted-foreground">
                {${rowLabel}}
              </div>
              {columns.map((column, c) => {
                const value = row[column]
                if (typeof value !== "number") {
                  return <div key={column} role="cell" className="h-10 rounded-md bg-muted/40" />
                }
                const intensity = max === min ? 1 : (value - min) / (max - min)
                return (
                  <div
                    key={column}
                    role="cell"
                    title={\`\${${rowLabel}} · \${column}: \${${fmt("value")}}\`}
                    className="flex h-10 items-center justify-center rounded-md font-medium tabular-nums transition-transform duration-150 hover:z-10 hover:scale-110 hover:shadow-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-75"
                    style={{
                      backgroundColor: \`color-mix(in oklab, \${heatColor} \${Math.round(12 + intensity * 88)}%, var(--muted))\`,
                      color: intensity > 0.6 ? "white" : "var(--foreground)",
                      animationDelay: \`\${(r + c) * 30}ms\`,
                      animationFillMode: "both",
                    }}
                  >
                    ${showValues ? `{${fmt("value")}}` : ""}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground tabular-nums">
        <span>{${fmt("min")}}</span>
        <span
          className="h-2 w-32 rounded-full"
          style={{ background: \`linear-gradient(to right, color-mix(in oklab, \${heatColor} 12%, var(--muted)), \${heatColor})\` }}
        />
        <span>{${fmt("max")}}</span>
      </div>
    </div>`

  return renderShell({
    imports: [],
    configDecl,
    rowType: buildRowType(fields, rows),
    rows,
    helpers: formatter,
    preReturn: [
      `const values = data.flatMap((row${isProps ? ": ChartRow" : ""}) => columns.map((column) => row[column]))`,
      "const numbers = values.filter((value): value is number => typeof value === \"number\")",
      "const min = numbers.length ? Math.min(...numbers) : 0",
      "const max = numbers.length ? Math.max(...numbers) : 0",
    ],
    jsx,
    exportMode: options?.exportMode,
  })
}

export function generateComponentCode(
  type: ChartType,
  data: ParsedChartData,
  options?: ChartOptions
): string {
  switch (type) {
    case "bar":
      return bar(data, options)
    case "horizontal-bar":
      return horizontalBar(data, options)
    case "line":
      return line(data, options)
    case "area":
      return area(data, options)
    case "combo":
      return combo(data, options)
    case "pie":
      return pie(data, options)
    case "radar":
      return radar(data, options)
    case "scatter":
      return scatter(data, options)
    case "radial":
      return radial(data, options)
    case "kpi":
      return kpi(data, options)
    case "interactive":
      return interactive(data, options)
    case "waterfall":
      return waterfall(data, options)
    case "heatmap":
      return heatmap(data, options)
    default: {
      const exhaustive: never = type
      throw new Error(`Unhandled chart type: ${exhaustive}`)
    }
  }
}
