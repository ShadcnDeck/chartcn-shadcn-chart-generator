import { describe, expect, it } from "vitest"

import { generateComponentCode } from "@/lib/code-templates"
import { parseCSV } from "@/lib/csv-parser"
import type { ChartType } from "@/types/chart"

const barData = parseCSV("Month,Revenue,Expenses\nJan,100,50\nFeb,200,80")
const pieData = parseCSV("Category,Value\nA,10\nB,20")
const scatterData = parseCSV("Segment,Spend,Conversions\nSearch,100,10\nSocial,200,20")

describe("generateComponentCode: chart type coverage", () => {
  const cases: [ChartType, ReturnType<typeof parseCSV>][] = [
    ["bar", barData],
    ["horizontal-bar", barData],
    ["kpi", pieData],
    ["line", barData],
    ["area", barData],
    ["combo", barData],
    ["pie", pieData],
    ["radar", barData],
    ["scatter", scatterData],
    ["radial", pieData],
  ]

  it.each(cases)("generates a self-contained Chart component for %s", (type, data) => {
    const code = generateComponentCode(type, data)
    expect(code).toContain('"use client"')
    expect(code).toContain("export function Chart(")
    expect(code).toContain("from \"recharts\"")
    expect(code).toContain("from \"@/components/ui/chart\"")
  })
})

describe("generateComponentCode: export mode", () => {
  it("bakes data inline by default", () => {
    const code = generateComponentCode("bar", barData)
    expect(code).toContain("const data = [")
    expect(code).toContain("export function Chart() {")
    expect(code).not.toContain("ChartProps")
  })

  it("emits a ChartProps interface and no baked data in props mode", () => {
    const code = generateComponentCode("bar", barData, { exportMode: "props" })
    expect(code).toContain("export interface ChartProps")
    expect(code).toContain("export function Chart({ data }: ChartProps) {")
    expect(code).not.toContain("const data = [")
  })
})

describe("generateComponentCode: bar/area stack modes", () => {
  it("has no stackId when stackMode is unset", () => {
    const code = generateComponentCode("bar", barData)
    expect(code).not.toContain("stackId")
  })

  it("adds stackId when stacked", () => {
    const code = generateComponentCode("bar", barData, { stackMode: "stack" })
    expect(code).toContain('stackId="stack"')
  })

  it("adds stackOffset=expand for 100% stacked", () => {
    const code = generateComponentCode("area", barData, { stackMode: "percent" })
    expect(code).toContain('stackOffset="expand"')
  })
})

describe("generateComponentCode: combo per-series render type", () => {
  it("defaults the first series to Bar and the rest to Line", () => {
    const code = generateComponentCode("combo", barData)
    expect(code).toContain("<Bar dataKey=\"Revenue\"")
    expect(code).toContain("<Line dataKey=\"Expenses\"")
  })

  it("honors an explicit seriesRenderType override", () => {
    const code = generateComponentCode("combo", barData, {
      seriesRenderType: { series_Revenue: "line", series_Expenses: "bar" },
    })
    expect(code).toContain("<Line dataKey=\"Revenue\"")
    expect(code).toContain("<Bar dataKey=\"Expenses\"")
  })
})

describe("generateComponentCode: date-axis formatting", () => {
  it("adds a date tick formatter when the category column looks like dates", () => {
    const dateData = parseCSV("Date,Revenue\n2024-01-01,100\n2024-02-01,200")
    const code = generateComponentCode("bar", dateData)
    expect(code).toContain("new Date(value).toLocaleDateString")
  })

  it("omits the date formatter for non-date categories", () => {
    const code = generateComponentCode("bar", barData)
    expect(code).not.toContain("toLocaleDateString")
  })
})

describe("generateComponentCode: custom colors", () => {
  it("reflects a custom color in the chartConfig instead of the palette", () => {
    const code = generateComponentCode("bar", barData, {
      customColors: { series_Revenue: "#ff0000" },
    })
    expect(code).toContain('color: "#ff0000"')
  })
})

describe("generateComponentCode: chartConfig typing (dynamic-index safety)", () => {
  // pie/radial/scatter index chartConfig by a runtime string
  // (chartConfig[row.category] / chartConfig[group.key]), which only
  // type-checks if chartConfig is widened to `: ChartConfig`. `satisfies
  // ChartConfig` keeps the narrow literal-keys type and fails under strict
  // TypeScript (TS7053) — regression coverage for that bug.
  const dynamicallyIndexedTypes: [ChartType, ReturnType<typeof parseCSV>][] = [
    ["pie", pieData],
    ["radial", pieData],
    ["scatter", scatterData],
  ]

  it.each(dynamicallyIndexedTypes)(
    "%s declares chartConfig with a widened : ChartConfig annotation, not satisfies",
    (type, data) => {
      for (const exportMode of ["inline", "props"] as const) {
        const code = generateComponentCode(type, data, { exportMode })
        expect(code).toContain("const chartConfig: ChartConfig = {")
        expect(code).not.toContain("} satisfies ChartConfig")
      }
    }
  )

  const staticallyKeyedTypes: [ChartType, ReturnType<typeof parseCSV>][] = [
    ["bar", barData],
    ["line", barData],
    ["area", barData],
    ["combo", barData],
    ["radar", barData],
  ]

  it.each(staticallyKeyedTypes)(
    "%s keeps satisfies ChartConfig (no dynamic chartConfig indexing)",
    (type, data) => {
      for (const exportMode of ["inline", "props"] as const) {
        const code = generateComponentCode(type, data, { exportMode })
        expect(code).toContain("} satisfies ChartConfig")
        expect(code).not.toContain("chartConfig[")
      }
    }
  )
})

describe("generateComponentCode: real column names", () => {
  it("keys inline rows, dataKeys, and chartConfig by the CSV headers", () => {
    const code = generateComponentCode("bar", barData)
    expect(code).toContain('{ Month: "Jan", Revenue: 100, Expenses: 50 },')
    expect(code).toContain('<XAxis dataKey="Month"')
    expect(code).toContain('<Bar dataKey="Revenue"')
    expect(code).toContain('Revenue: { label: "Revenue", color: "var(--chart-1)" },')
    expect(code).toContain('stopColor="var(--color-Revenue)"')
    expect(code).not.toContain("series_")
  })

  it("types props-mode rows with the real keys", () => {
    const code = generateComponentCode("line", barData, { exportMode: "props" })
    expect(code).toContain(
      "export type ChartRow = { Month: string; Revenue: number | null; Expenses: number | null }"
    )
    expect(code).toContain("data: ChartRow[]")
  })

  it("quotes keys that aren't identifiers and inlines colors CSS can't reference", () => {
    const data = parseCSV("Month,Product A\nJan,1")
    const code = generateComponentCode("area", data)
    expect(code).toContain('{ Month: "Jan", "Product A": 1 },')
    expect(code).toContain('"Product A": { label: "Product A", color: "var(--chart-1)" },')
    expect(code).toContain('<Area dataKey="Product A"')
    expect(code).toContain('stroke="var(--chart-1)"')
    expect(code).not.toContain("--color-Product A")
  })

  it("renames keys Recharts would read as paths (dots, brackets)", () => {
    const data = parseCSV("Month,v1.2\nJan,1")
    const code = generateComponentCode("bar", data)
    expect(code).toContain('<Bar dataKey="v1_2"')
    expect(code).toContain('v1_2: { label: "v1.2"')
  })

  it("escapes quotes and backslashes in headers", () => {
    const data = parseCSV('"Na""me","Rev""enue \\\\"\nA,1')
    const code = generateComponentCode("bar", data)
    expect(code).toContain('dataKey={"Rev\\"enue \\\\\\\\"}')
    expect(code).toContain('label: "Rev\\"enue \\\\\\\\"')
  })

  it("keeps numeric X values numeric (e.g. JSON years)", () => {
    const data = { headers: ["year", "sales"], rows: [{ year: 2024, sales: 1 }] }
    const code = generateComponentCode("bar", data, { exportMode: "props" })
    expect(code).toContain("{ year: number; sales: number | null }")
  })
})

describe("generateComponentCode: tooltip parity with the preview", () => {
  it("embeds the breakdown tooltip for multi-series charts by default", () => {
    const code = generateComponentCode("bar", barData)
    expect(code).toContain("function ChartBreakdownTooltip(")
    expect(code).toContain("content={<ChartBreakdownTooltip config={chartConfig} />}")
    expect(code).not.toContain("ChartTooltipContent")
  })

  it("uses shadcn's tooltip when switched to simple, or with one series", () => {
    expect(generateComponentCode("bar", barData, { tooltipStyle: "simple" })).not.toContain(
      "ChartBreakdownTooltip"
    )
    expect(generateComponentCode("bar", parseCSV("Month,Revenue\nJan,1"))).not.toContain(
      "ChartBreakdownTooltip"
    )
  })
})

describe("generateComponentCode: bar styling", () => {
  it("rounds only the top segment of a stack", () => {
    const code = generateComponentCode("bar", barData, { stackMode: "stack" })
    expect(code).toContain("fill={`url(#${uid}-fill-0)`} />} maxBarSize")
    expect(code).toContain("fill={`url(#${uid}-fill-1)`} />} radius={[4, 4, 0, 0]}")
  })

  it("keeps the Bar fill a plain color so legend swatches work", () => {
    const code = generateComponentCode("bar", barData)
    expect(code).toContain(
      '<Bar dataKey="Revenue" fill="var(--color-Revenue)" shape={(props) => <Rectangle'
    )
  })

  it("scopes gradient ids with useId", () => {
    const code = generateComponentCode("bar", barData)
    expect(code).toContain('import { useId } from "react"')
    expect(code).toContain("id={`${uid}-fill-0`}")
  })
})

describe("generateComponentCode: horizontal bar", () => {
  const data = parseCSV("Framework,Stars\nVue,2\nReact,3\nSolid,1")

  it("bakes sorted rows into inline data", () => {
    const code = generateComponentCode("horizontal-bar", data, { sortBars: "desc" })
    const order = ["React", "Vue", "Solid"].map((name) => code.indexOf(`Framework: "${name}"`))
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(code).toContain('layout="vertical"')
    expect(code).toContain("<LabelList")
  })

  it("sorts at render time in props mode", () => {
    const code = generateComponentCode("horizontal-bar", data, {
      sortBars: "asc",
      exportMode: "props",
    })
    expect(code).toContain("const chartData = [...data].sort((a, b) => (a.Stars ?? 0) - (b.Stars ?? 0))")
    expect(code).toContain("data={chartData}")
  })
})

describe("generateComponentCode: category charts", () => {
  it("drops blank slices from pie data, like the preview", () => {
    const code = generateComponentCode("pie", parseCSV("Browser,Visitors\nChrome,3\nSafari,"))
    expect(code).toContain('{ Browser: "Chrome", Visitors: 3 },')
    expect(code).not.toContain('Browser: "Safari"')
    expect(code).toContain('nameKey="Browser"')
  })

  it("emits flat scatter rows grouped at render time", () => {
    const code = generateComponentCode("scatter", scatterData)
    expect(code).toContain('{ Segment: "Search", Spend: 100, Conversions: 10 },')
    expect(code).toContain("const groups = [...new Set(data.map((row) => String(row.Segment)))]")
  })

  it("computes the KPI delta from the data at render time", () => {
    const code = generateComponentCode("kpi", parseCSV("Month,MRR\nJan,100\nFeb,120"))
    expect(code).toContain("const values = data.map((row) => row.MRR)")
    expect(code).toContain("const delta =")
  })
})

describe("generateComponentCode: interactive, waterfall, heatmap", () => {
  const daily = parseCSV("Date,Desktop,Mobile\n2024-04-01,10,5\n2024-04-02,12,6\n2024-04-03,9,7")

  it("filters the interactive chart by date range with the chosen default", () => {
    const code = generateComponentCode("interactive", daily, { defaultRange: "30d" })
    expect(code).toContain('useState<(typeof RANGES)[number]["value"]>("30d")')
    expect(code).toContain("new Date(String(row.Date)).getTime() >= newest - (days - 1) * 86_400_000")
    expect(code).toContain("<Brush key={range}")
  })

  it("slices the last N rows when the X column isn't dates, and can drop the brush", () => {
    const code = generateComponentCode("interactive", parseCSV("Week,Visits\nW1,1\nW2,2"), {
      showBrush: false,
    })
    expect(code).toContain("const chartData = days === null ? data : data.slice(-days)")
    expect(code).not.toContain("Brush")
  })

  it("computes waterfall steps in the component so live data works", () => {
    const code = generateComponentCode("waterfall", parseCSV("Step,Change\nStart,100\nChurn,-20"), {
      exportMode: "props",
    })
    expect(code).toContain("function toSteps(rows: ChartRow[]): WaterfallStep[]")
    expect(code).toContain("const value = row.Change ?? 0")
    expect(code).toContain('{ label: "Total", change: last.end')
    expect(code).toContain('<LabelList dataKey="display"')
  })

  it("omits the waterfall total and labels when turned off", () => {
    const code = generateComponentCode("waterfall", parseCSV("Step,Change\nStart,100"), {
      showTotal: false,
      showValues: false,
    })
    expect(code).not.toContain('{ label: "Total", change')
    expect(code).not.toContain("LabelList")
  })

  it("renders the heatmap as a dependency-free grid keyed by the real columns", () => {
    const code = generateComponentCode("heatmap", parseCSV("Cohort,Week 0,Week 1\nJan,100,60"), {
      heatFormat: "percent",
      customColors: { heat: "#ff0000" },
    })
    expect(code).not.toContain("recharts")
    expect(code).toContain('const columns = ["Week 0", "Week 1"] as const')
    expect(code).toContain('const heatColor = "#ff0000"')
    expect(code).toContain("formatValue(value, max)")
    expect(code).toContain('role="row"')
  })
})
