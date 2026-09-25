import { parseCSV } from "@/lib/csv-parser"
import type { ChartType } from "@/types/chart"

/** 90 days of daily visitors with weekly seasonality and a gentle upward
 * trend. Deterministic, so server and client render the same sample. */
function dailyVisitorsCSV(): string {
  const start = Date.UTC(2024, 3, 1)
  const lines = ["Date,Desktop,Mobile"]
  for (let day = 0; day < 90; day++) {
    const date = new Date(start + day * 86_400_000).toISOString().slice(0, 10)
    const weekday = new Date(start + day * 86_400_000).getUTCDay()
    const weekend = weekday === 0 || weekday === 6 ? 0.62 : 1
    const wave = Math.sin(day / 4.3) * 0.12 + Math.sin(day * 1.7) * 0.06
    const trend = 1 + day / 180
    const desktop = Math.round(320 * trend * weekend * (1 + wave))
    const mobile = Math.round(210 * trend * (weekend === 1 ? 0.9 : 1.25) * (1 - wave / 2))
    lines.push(`${date},${desktop},${mobile}`)
  }
  return lines.join("\n")
}

export const sampleCSV: Record<ChartType, string> = {
  bar: `Month,Revenue,Expenses
Jan,42000,31000
Feb,58000,34000
Mar,51000,29000
Apr,67000,38000
May,72000,41000
Jun,69000,37000`,
  line: `Week,Users,Sessions
Week 1,1200,3400
Week 2,1450,4100
Week 3,1380,3900
Week 4,1620,4700
Week 5,1890,5200`,
  area: `Quarter,Product A,Product B,Product C
Q1,12000,8000,5000
Q2,15000,9500,6200
Q3,18000,11000,7800
Q4,22000,13500,9100`,
  combo: `Month,Revenue,Target
Jan,42000,45000
Feb,58000,50000
Mar,51000,55000
Apr,67000,60000
May,72000,65000
Jun,69000,70000`,
  pie: `Category,Value
Engineering,45
Design,20
Marketing,18
Operations,12
Other,5`,
  radar: `Skill,Junior,Senior
Problem Solving,60,90
Communication,70,85
Technical Depth,50,95
Teamwork,80,88
Leadership,40,82`,
  scatter: `Segment,Spend,Conversions
Search,4200,320
Social,3100,210
Email,1800,260
Display,2600,140
Affiliate,1200,95`,
  radial: `Goal,Progress
Signups,72
Activation,54
Retention,38`,
  "horizontal-bar": `Framework,Stars
React,232000
Vue,208000
Angular,96000
Svelte,80000
Solid,33000
Qwik,21000`,
  kpi: `Month,Revenue
Jan,42000
Feb,45800
Mar,44100
Apr,51200
May,56900
Jun,61400`,
  interactive: dailyVisitorsCSV(),
  waterfall: `Step,Change
Starting MRR,42000
New business,8600
Expansion,3200
Contraction,-1400
Churn,-2900`,
  heatmap: `Cohort,Week 0,Week 1,Week 2,Week 3,Week 4,Week 5
Jan,100,62,48,41,37,34
Feb,100,65,51,44,40,
Mar,100,68,55,47,,
Apr,100,70,57,,,
May,100,72,,,,
Jun,100,,,,,`,
}

export const chartTypeLabels: Record<ChartType, string> = {
  bar: "Bar Chart",
  line: "Line Chart",
  area: "Area Chart",
  combo: "Combo Chart",
  pie: "Pie / Donut Chart",
  radar: "Radar Chart",
  scatter: "Scatter Chart",
  radial: "Radial / Gauge Chart",
  "horizontal-bar": "Horizontal Bar Chart",
  kpi: "KPI Sparkline Card",
  interactive: "Interactive Area Chart",
  waterfall: "Waterfall Chart",
  heatmap: "Heatmap",
}

export const chartTypeDescriptions: Record<ChartType, string> = {
  bar: "Compare values across categories with grouped or stacked bars.",
  line: "Track trends over time with single or multi-series lines.",
  area: "Visualize volume and trends with single or stacked area fills.",
  combo: "Mix bars and lines in one chart, e.g. actuals vs. a target trend.",
  pie: "Show proportions of a whole as a pie or donut.",
  radar: "Compare multiple metrics across series on a spider chart.",
  scatter: "Plot two numeric dimensions against each other, grouped by category.",
  radial: "Show progress toward a goal per category as concentric rings.",
  "horizontal-bar": "Rank categories with long labels, sorted and labeled at the bar end.",
  kpi: "A headline metric with its change vs. the previous period and a trend sparkline.",
  interactive: "Daily time series with 7/30/90-day range buttons and a drag-to-zoom brush.",
  waterfall: "Walk a starting value through increases and decreases to a final total.",
  heatmap: "A value grid shaded by intensity, e.g. cohort retention or activity by day and hour.",
}

export const chartTypes: ChartType[] = [
  "bar",
  "horizontal-bar",
  "line",
  "area",
  "combo",
  "pie",
  "radar",
  "scatter",
  "radial",
  "kpi",
  "interactive",
  "waterfall",
  "heatmap",
]

function toCamelCase(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+(.)?/g, (_, next: string | undefined) => (next ? next.toUpperCase() : ""))
    .replace(/^[A-Z]/, (first) => first.toLowerCase())
}

/** The sample as an API-style JSON array with camelCase keys, one record per
 * line, e.g. `{ "month": "Jan", "revenue": 42000 }`. */
export function sampleJSON(type: ChartType): string {
  const { headers, rows } = parseCSV(sampleCSV[type])
  const keys = headers.map(toCamelCase)
  const records = rows.map((row) =>
    JSON.stringify(Object.fromEntries(headers.map((header, i) => [keys[i], row[header]])))
      .replace(/":/g, '": ')
      .replace(/,"/g, ', "')
  )
  return `[\n  ${records.join(",\n  ")}\n]`
}
