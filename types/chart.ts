export type ChartType =
  | "bar"
  | "horizontal-bar"
  | "line"
  | "area"
  | "pie"
  | "radar"
  | "combo"
  | "scatter"
  | "radial"
  | "kpi"

export interface ChartDataRow {
  [key: string]: string | number | null
}

export interface ParsedChartData {
  headers: string[]
  rows: ChartDataRow[]
  error?: string
}

export interface ChartOptions {
  stackMode?: "none" | "stack" | "percent" // bar, horizontal-bar, area
  smooth?: boolean // line
  showDots?: boolean // line
  donut?: boolean // pie
  labelType?: "value" | "percent" | "label" // pie
  seriesRenderType?: Record<string, "bar" | "line"> // combo
  sortBars?: "none" | "desc" | "asc" // horizontal-bar
  showValues?: boolean // horizontal-bar
  halfGauge?: boolean // radial
  sparkType?: "area" | "line" | "bar" // kpi
  tooltipStyle?: "breakdown" | "simple" // multi-series bar, horizontal-bar, line, area
  customColors?: Record<string, string> // all types, keyed by series key or category label
  exportMode?: "inline" | "props"
}

export interface ChartConfig {
  type: ChartType
  data: ParsedChartData
  options?: ChartOptions
}
