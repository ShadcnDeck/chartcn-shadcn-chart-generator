import {
  CATEGORY_KEY,
  getSeries,
  isDateAxis,
  resolveColor,
  toChartRows,
  toScatterGroups,
} from "@/lib/chart-data"
import type { ChartDataRow, ChartOptions, ChartType, ParsedChartData } from "@/types/chart"

const TICK_FORMATTER =
  '(value) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value)'

const PERCENT_TICK_FORMATTER =
  '(value) => new Intl.NumberFormat("en-US", { style: "percent" }).format(value)'

const DATE_TICK_FORMATTER =
  '(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })'

/** Shared header/footer for every generated component: imports, optional
 * ChartProps interface + data const (inline vs. props export mode), the
 * chartConfig declaration, and the function body wrapping the caller's JSX. */
function renderShell(opts: {
  imports: string
  configDecl: string
  rowType: string
  rows: unknown[]
  preReturn?: string
  jsx: string
  exportMode?: ChartOptions["exportMode"]
}): string {
  const isProps = opts.exportMode === "props"
  const propsInterface = isProps
    ? `export interface ChartProps {\n  data: ${opts.rowType}[]\n}\n\n`
    : ""
  const dataDecl = isProps ? "" : `const data = ${JSON.stringify(opts.rows, null, 2)}\n\n`
  const signature = isProps
    ? "export function Chart({ data }: ChartProps) {"
    : "export function Chart() {"
  const preReturn = opts.preReturn ? `  ${opts.preReturn}\n\n` : ""

  return `"use client"

${opts.imports}

${propsInterface}${dataDecl}${opts.configDecl}

${signature}
${preReturn}  return (
${opts.jsx}
  )
}
`
}

function buildRowType(data: ParsedChartData): string {
  const series = getSeries(data)
  const fields = [
    `${CATEGORY_KEY}: string`,
    ...series.map(({ key }) => `${key}: number | null`),
  ]
  return `{ ${fields.join("; ")} }`
}

function renderConfigDecl(data: ParsedChartData, customColors?: Record<string, string>): string {
  const series = getSeries(data)
  const entries = series
    .map(
      ({ key, label }, index) =>
        `  ${key}: { label: "${label.replace(/"/g, '\\"')}", color: "${resolveColor(
          key,
          index,
          customColors
        )}" },`
    )
    .join("\n")
  return `const chartConfig = {\n${entries}\n} satisfies ChartConfig`
}

/** Per-category config used by pie/radial, which key their config by the raw
 * category label rather than a sanitized series key (colors are passed as a
 * literal `fill` prop, so no CSS-identifier-safe key is needed here).
 *
 * Typed as `: ChartConfig` rather than `satisfies ChartConfig` — the JSX
 * below indexes this object by a runtime `string` (`chartConfig[row.category]`),
 * which only type-checks against `ChartConfig`'s index signature. `satisfies`
 * would keep the narrower literal-keys type and fail under strict mode
 * (TS7053: no index signature with a parameter of type 'string'). */
function renderCategoryConfigDecl(
  rows: ChartDataRow[],
  customColors?: Record<string, string>
): string {
  const entries = rows
    .map((row, index) => {
      const category = String(row[CATEGORY_KEY]).replace(/"/g, '\\"')
      return `  "${category}": { label: "${category}", color: "${resolveColor(
        String(row[CATEGORY_KEY]),
        index,
        customColors
      )}" },`
    })
    .join("\n")
  return `const chartConfig: ChartConfig = {\n${entries}\n}`
}

const UI_CHART_IMPORTS = `import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"`

function bar(data: ParsedChartData, options?: ChartOptions): string {
  const series = getSeries(data)
  const customColors = options?.customColors
  const stackMode = options?.stackMode ?? "none"
  const dateAxis = isDateAxis(data)

  const defs = series
    .map(
      ({ key }) => `          <linearGradient id="fill-${key}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-${key})" stopOpacity={1} />
            <stop offset="100%" stopColor="var(--color-${key})" stopOpacity={0.55} />
          </linearGradient>`
    )
    .join("\n")

  const radius = stackMode !== "none" ? "[3, 3, 3, 3]" : "[8, 8, 8, 8]"
  const maxBarSize = stackMode !== "none" ? 48 : 36
  const bars = series
    .map(
      ({ key }) =>
        `        <Bar dataKey="${key}" fill="url(#fill-${key})" radius={${radius}} maxBarSize={${maxBarSize}}${
          stackMode !== "none" ? ' stackId="stack"' : ""
        } />`
    )
    .join("\n")

  const xAxisTick = dateAxis ? ` tickFormatter={${DATE_TICK_FORMATTER}}` : ""
  const yAxisFormatter = stackMode === "percent" ? PERCENT_TICK_FORMATTER : TICK_FORMATTER
  const tooltipProps = dateAxis ? ` labelFormatter={${DATE_TICK_FORMATTER}}` : ""

  const jsx = `    <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full">
      <BarChart accessibilityLayer data={data} barCategoryGap="30%" barGap={4}${
        stackMode === "percent" ? ' stackOffset="expand"' : ""
      }>
        <defs>
${defs}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 5" />
        <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={10}${xAxisTick} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} tickFormatter={${yAxisFormatter}} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent${tooltipProps} />} />
        <ChartLegend content={<ChartLegendContent />} />
${bars}
      </BarChart>
    </ChartContainer>`

  return renderShell({
    imports: `import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"\n${UI_CHART_IMPORTS}`,
    configDecl: renderConfigDecl(data, customColors),
    rowType: buildRowType(data),
    rows: toChartRows(data),
    jsx,
    exportMode: options?.exportMode,
  })
}

function line(data: ParsedChartData, options?: ChartOptions): string {
  const series = getSeries(data)
  const customColors = options?.customColors
  const dateAxis = isDateAxis(data)

  const lines = series
    .map(
      ({ key }) =>
        `        <Line dataKey="${key}" type="${
          options?.smooth ? "monotone" : "linear"
        }" stroke="var(--color-${key})" strokeWidth={2.5} dot={${
          options?.showDots ?? true
        }} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }} />`
    )
    .join("\n")

  const xAxisTick = dateAxis ? ` tickFormatter={${DATE_TICK_FORMATTER}}` : ""
  const tooltipProps = dateAxis ? ` labelFormatter={${DATE_TICK_FORMATTER}}` : ""

  const jsx = `    <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full">
      <LineChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} strokeDasharray="3 5" />
        <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={10}${xAxisTick} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} tickFormatter={${TICK_FORMATTER}} />
        <ChartTooltip content={<ChartTooltipContent${tooltipProps} />} />
        <ChartLegend content={<ChartLegendContent />} />
${lines}
      </LineChart>
    </ChartContainer>`

  return renderShell({
    imports: `import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"\n${UI_CHART_IMPORTS}`,
    configDecl: renderConfigDecl(data, customColors),
    rowType: buildRowType(data),
    rows: toChartRows(data),
    jsx,
    exportMode: options?.exportMode,
  })
}

function area(data: ParsedChartData, options?: ChartOptions): string {
  const series = getSeries(data)
  const customColors = options?.customColors
  const stackMode = options?.stackMode ?? "none"
  const dateAxis = isDateAxis(data)

  const defs = series
    .map(
      ({ key }) => `          <linearGradient id="fill-${key}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-${key})" stopOpacity={0.85} />
            <stop offset="100%" stopColor="var(--color-${key})" stopOpacity={0.04} />
          </linearGradient>`
    )
    .join("\n")

  const areas = series
    .map(
      ({ key }) =>
        `        <Area dataKey="${key}" type="natural" fill="url(#fill-${key})" fillOpacity={1} stroke="var(--color-${key})" strokeWidth={2.5}${
          stackMode !== "none" ? ' stackId="stack"' : ""
        } />`
    )
    .join("\n")

  const xAxisTick = dateAxis ? ` tickFormatter={${DATE_TICK_FORMATTER}}` : ""
  const yAxisFormatter = stackMode === "percent" ? PERCENT_TICK_FORMATTER : TICK_FORMATTER
  const tooltipProps = dateAxis ? ` labelFormatter={${DATE_TICK_FORMATTER}}` : ""

  const jsx = `    <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full">
      <AreaChart accessibilityLayer data={data}${
        stackMode === "percent" ? ' stackOffset="expand"' : ""
      }>
        <defs>
${defs}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 5" />
        <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={10}${xAxisTick} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} tickFormatter={${yAxisFormatter}} />
        <ChartTooltip content={<ChartTooltipContent indicator="dot"${tooltipProps} />} />
        <ChartLegend content={<ChartLegendContent />} />
${areas}
      </AreaChart>
    </ChartContainer>`

  return renderShell({
    imports: `import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"\n${UI_CHART_IMPORTS}`,
    configDecl: renderConfigDecl(data, customColors),
    rowType: buildRowType(data),
    rows: toChartRows(data),
    jsx,
    exportMode: options?.exportMode,
  })
}

function combo(data: ParsedChartData, options?: ChartOptions): string {
  const series = getSeries(data)
  const customColors = options?.customColors
  const renderTypes = options?.seriesRenderType ?? {}
  const dateAxis = isDateAxis(data)

  const marks = series
    .map(({ key }, index) => {
      const renderAs = renderTypes[key] ?? (index === 0 ? "bar" : "line")
      if (renderAs === "line") {
        return `        <Line dataKey="${key}" type="monotone" stroke="var(--color-${key})" strokeWidth={2.5} dot={{ r: 3 }} />`
      }
      return `        <Bar dataKey="${key}" fill="var(--color-${key})" radius={[6, 6, 0, 0]} maxBarSize={36} />`
    })
    .join("\n")

  const xAxisTick = dateAxis ? ` tickFormatter={${DATE_TICK_FORMATTER}}` : ""
  const tooltipProps = dateAxis ? ` labelFormatter={${DATE_TICK_FORMATTER}}` : ""

  const jsx = `    <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full">
      <ComposedChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} strokeDasharray="3 5" />
        <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={10}${xAxisTick} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} tickFormatter={${TICK_FORMATTER}} />
        <ChartTooltip content={<ChartTooltipContent${tooltipProps} />} />
        <ChartLegend content={<ChartLegendContent />} />
${marks}
      </ComposedChart>
    </ChartContainer>`

  return renderShell({
    imports: `import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"\n${UI_CHART_IMPORTS}`,
    configDecl: renderConfigDecl(data, customColors),
    rowType: buildRowType(data),
    rows: toChartRows(data),
    jsx,
    exportMode: options?.exportMode,
  })
}

function pie(data: ParsedChartData, options?: ChartOptions): string {
  const rows = toChartRows(data)
  const customColors = options?.customColors
  const valueKey = getSeries(data)[0]?.key ?? "value"
  const labelType = options?.labelType ?? "value"

  const renderLabel =
    labelType === "percent"
      ? "(props) => `${Math.round((props.percent ?? 0) * 100)}%`"
      : labelType === "label"
        ? "(props) => String(props.payload?.category ?? \"\")"
        : "(props) => String(props.value ?? \"\")"

  const centerLabel = options?.donut
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

  const jsx = `    <ChartContainer config={chartConfig} className="aspect-square h-[350px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="category" hideLabel />} />
        <ChartLegend content={<ChartLegendContent nameKey="category" />} verticalAlign="bottom" />
        <Pie
          data={data}
          dataKey="${valueKey}"
          nameKey="category"
          label={${options?.donut ? "undefined" : renderLabel}}
          innerRadius={${options?.donut ? 64 : 0}}
          strokeWidth={4}
        >
          {data.map((row) => (
            <Cell key={row.category} fill={chartConfig[row.category]?.color} />
          ))}${centerLabel}
        </Pie>
      </PieChart>
    </ChartContainer>`

  return renderShell({
    imports: `import { Cell, ${options?.donut ? "Label, " : ""}Pie, PieChart } from "recharts"\n${UI_CHART_IMPORTS}`,
    configDecl: renderCategoryConfigDecl(rows, customColors),
    rowType: `{ category: string; ${valueKey}: number }`,
    rows,
    preReturn: options?.donut
      ? `const total = data.reduce((sum, row) => sum + Number(row["${valueKey}"] ?? 0), 0)`
      : undefined,
    jsx,
    exportMode: options?.exportMode,
  })
}

function radar(data: ParsedChartData, options?: ChartOptions): string {
  const series = getSeries(data)
  const customColors = options?.customColors

  const radars = series
    .map(
      ({ key }) =>
        `        <Radar dataKey="${key}" fill="var(--color-${key})" fillOpacity={0.35} stroke="var(--color-${key})" strokeWidth={2} />`
    )
    .join("\n")

  const jsx = `    <ChartContainer config={chartConfig} className="aspect-square h-[350px] w-full">
      <RadarChart data={data}>
        <ChartTooltip content={<ChartTooltipContent />} />
        <PolarAngleAxis dataKey="category" />
        <PolarGrid />
${radars}
        <ChartLegend content={<ChartLegendContent />} />
      </RadarChart>
    </ChartContainer>`

  return renderShell({
    imports: `import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"\n${UI_CHART_IMPORTS}`,
    configDecl: renderConfigDecl(data, customColors),
    rowType: buildRowType(data),
    rows: toChartRows(data),
    jsx,
    exportMode: options?.exportMode,
  })
}

function scatter(data: ParsedChartData, options?: ChartOptions): string {
  const customColors = options?.customColors
  const groups = toScatterGroups(data, customColors)
  const xLabel = data.headers[1] ?? "X"
  const yLabel = data.headers[2] ?? "Y"

  const configEntries = groups
    .map(
      ({ key, label, color }) =>
        `  "${key.replace(/"/g, '\\"')}": { label: "${label.replace(/"/g, '\\"')}", color: "${color}" },`
    )
    .join("\n")

  const jsx = `    <ChartContainer config={chartConfig} className="aspect-square h-[350px] w-full">
      <ScatterChart>
        <CartesianGrid />
        <XAxis type="number" dataKey="x" name="${xLabel}" tickLine={false} axisLine={false} />
        <YAxis type="number" dataKey="y" name="${yLabel}" tickLine={false} axisLine={false} />
        <ChartTooltip cursor={{ strokeDasharray: "3 3" }} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {data.map((group) => (
          <Scatter
            key={group.key}
            name={String(chartConfig[group.key]?.label ?? group.key)}
            data={group.points}
            fill={chartConfig[group.key]?.color}
          />
        ))}
      </ScatterChart>
    </ChartContainer>`

  return renderShell({
    imports: `import { CartesianGrid, Scatter, ScatterChart, XAxis, YAxis } from "recharts"\n${UI_CHART_IMPORTS}`,
    // `: ChartConfig` (not `satisfies`) — the JSX below indexes this by a
    // runtime `group.key: string`, see renderCategoryConfigDecl's comment.
    configDecl: `const chartConfig: ChartConfig = {\n${configEntries}\n}`,
    rowType: "{ key: string; points: { x: number; y: number }[] }",
    rows: groups.map(({ key, points }) => ({ key, points })),
    jsx,
    exportMode: options?.exportMode,
  })
}

function radial(data: ParsedChartData, options?: ChartOptions): string {
  const rows = toChartRows(data)
  const customColors = options?.customColors
  const valueKey = getSeries(data)[0]?.key ?? "value"

  const jsx = `    <ChartContainer config={chartConfig} className="aspect-square h-[350px] w-full">
      <RadialBarChart data={data} innerRadius={20} outerRadius={140}>
        <ChartTooltip content={<ChartTooltipContent nameKey="category" hideLabel />} />
        <ChartLegend content={<ChartLegendContent nameKey="category" />} verticalAlign="bottom" />
        <RadialBar dataKey="${valueKey}" background cornerRadius={6}>
          {data.map((row) => (
            <Cell key={row.category} fill={chartConfig[row.category]?.color} />
          ))}
        </RadialBar>
      </RadialBarChart>
    </ChartContainer>`

  return renderShell({
    imports: `import { Cell, RadialBar, RadialBarChart } from "recharts"\n${UI_CHART_IMPORTS}`,
    configDecl: renderCategoryConfigDecl(rows, customColors),
    rowType: `{ category: string; ${valueKey}: number }`,
    rows,
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
    default: {
      const exhaustive: never = type
      throw new Error(`Unhandled chart type: ${exhaustive}`)
    }
  }
}
